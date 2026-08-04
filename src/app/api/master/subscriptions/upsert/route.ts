import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../../lib/supabase-admin";

export const runtime = "nodejs";

const ALLOWED_STATUS = new Set(["DRAFT", "AWAITING_ACTIVATION", "ACTIVE", "GRACE", "READ_ONLY", "SUSPENDED", "CANCELED", "EXPIRED", "DEMO"]);
const ALLOWED_CYCLES = new Set(["MONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL", "CUSTOM"]);
const MODULE_KEYS = ["APPOINTMENTS", "CATALOG", "INVENTORY", "CHECKLIST", "ORDERS", "QUOTES", "ASSISTANT", "BI", "MESSAGES"];

function cleanModules(value: unknown) {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(MODULE_KEYS.map((key) => [key, Boolean(input[key])]));
}

async function requireMaster(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) throw new Error("Sessão inválida. Entre novamente no Gerivo.");
  const admin = getSupabaseAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) throw new Error("Sessão expirada. Entre novamente no Gerivo.");
  const { data: profile } = await admin.from("profiles").select("platform_role, active").eq("id", authData.user.id).maybeSingle();
  if (profile?.platform_role !== "MASTER" || !profile.active) throw new Error("Somente o MASTER Gerivo pode alterar contratações.");
  return { admin, userId: authData.user.id };
}

export async function POST(request: Request) {
  try {
    const { admin, userId } = await requireMaster(request);
    const body = await request.json();
    const companyId = String(body.companyId || "").trim();
    const planMode = body.planMode === "CUSTOM" ? "CUSTOM" : "STANDARD";
    const planId = planMode === "STANDARD" ? String(body.planId || "").trim() : null;
    const statusInput = String(body.status || "ACTIVE").toUpperCase();
    const status = ALLOWED_STATUS.has(statusInput) ? statusInput : "ACTIVE";
    const billingCycleInput = String(body.billingCycle || "MONTHLY").toUpperCase();
    const billingCycle = ALLOWED_CYCLES.has(billingCycleInput) ? billingCycleInput : "CUSTOM";
    const contractStart = String(body.contractStart || "").slice(0, 10);
    const contractEnd = String(body.contractEnd || "").slice(0, 10);
    const contractedValue = Math.max(0, Number(body.contractedValue) || 0);
    const dueDay = Math.min(31, Math.max(1, Number(body.billingDueDay) || 10));
    const autoRenew = Boolean(body.autoRenew);
    const graceDays = Math.min(365, Math.max(0, Number(body.gracePeriodDays) || 0));
    const customPlanName = planMode === "CUSTOM" ? String(body.customPlanName || "Plano personalizado").trim() : null;
    const notes = String(body.commercialNotes || "").trim() || null;
    const justification = String(body.justification || "Atualização comercial pelo MASTER").trim();
    const modules = cleanModules(body.modules);
    const limits = {
      company_limit: Math.max(1, Number(body.companyLimit) || 1),
      store_limit: Math.max(1, Number(body.storeLimit) || 1),
      user_limit: Math.max(1, Number(body.userLimit) || 1),
      storage_gb: Math.max(1, Number(body.storageGb) || 5),
      ai_queries_monthly: Math.max(0, Number(body.aiQueriesMonthly) || 0),
    };
    if (!companyId || !contractStart || !contractEnd) return NextResponse.json({ error: "Informe a empresa e o período da contratação." }, { status: 400 });
    if (new Date(contractEnd) < new Date(contractStart)) return NextResponse.json({ error: "A data final deve ser posterior à data inicial." }, { status: 400 });

    const { data: company } = await admin.from("companies").select("id, group_id").eq("id", companyId).maybeSingle();
    if (!company) return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
    let plan: any = null;
    if (planMode === "STANDARD") {
      const result = await admin.from("subscription_plans").select("*").eq("id", planId).eq("active", true).maybeSingle();
      if (!result.data) return NextResponse.json({ error: "Selecione um plano Gerivo válido." }, { status: 400 });
      plan = result.data;
    }
    const finalModules = planMode === "STANDARD" ? cleanModules(plan.modules) : modules;
    const finalLimits = planMode === "STANDARD" ? {
      company_limit: plan.company_limit,
      store_limit: plan.store_limit,
      user_limit: plan.user_limit,
      storage_gb: plan.storage_gb,
      ai_queries_monthly: plan.ai_queries_monthly,
    } : limits;
    const months = Math.max(1, Math.ceil((new Date(contractEnd).getTime() - new Date(contractStart).getTime()) / (30.4375 * 86400000)));
    const activatedAt = `${contractStart}T00:00:00.000Z`;
    const expiresAt = `${contractEnd}T23:59:59.999Z`;
    const graceUntil = new Date(new Date(expiresAt).getTime() + graceDays * 86400000).toISOString();
    const isEnabled = ["ACTIVE", "GRACE", "READ_ONLY", "DEMO"].includes(status);

    const { data: previous } = await admin.from("company_subscriptions").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (previous?.id && previous.status !== "EXPIRED") {
      await admin.from("company_subscriptions").update({ status: "EXPIRED", updated_by: userId, updated_at: new Date().toISOString() }).eq("id", previous.id);
    }

    const payload = {
      company_id: companyId,
      plan_id: planMode === "STANDARD" ? planId : null,
      plan_mode: planMode,
      custom_plan_name: customPlanName,
      status,
      billing_cycle: billingCycle,
      contracted_months: months,
      contracted_value: contractedValue,
      user_limit: finalLimits.user_limit,
      store_limit: finalLimits.store_limit,
      company_limit: finalLimits.company_limit,
      storage_gb: finalLimits.storage_gb,
      ai_queries_monthly: finalLimits.ai_queries_monthly,
      modules: finalModules,
      custom_limits: planMode === "CUSTOM" ? finalLimits : {},
      custom_modules: planMode === "CUSTOM" ? finalModules : {},
      contract_start: contractStart,
      contract_end: contractEnd,
      billing_due_day: dueDay,
      auto_renew: autoRenew,
      grace_period_days: graceDays,
      commercial_notes: notes,
      activated_at: activatedAt,
      expires_at: expiresAt,
      grace_until: graceUntil,
      read_only_until: new Date(new Date(graceUntil).getTime() + 30 * 86400000).toISOString(),
      activated_by: userId,
      updated_by: userId,
      notes,
    };
    const { data: subscription, error: subscriptionError } = await admin.from("company_subscriptions").insert(payload).select("id").single();
    if (subscriptionError || !subscription) throw new Error(subscriptionError?.message || "Não foi possível salvar a contratação.");

    const companyIds = company.group_id
      ? (await admin.from("companies").select("id").eq("group_id", company.group_id)).data?.map((item: any) => item.id) || [companyId]
      : [companyId];
    await admin.from("companies").update({ status, active: isEnabled, updated_at: new Date().toISOString() }).in("id", companyIds);
    await admin.from("stores").update({ active: isEnabled, updated_at: new Date().toISOString() }).in("company_id", companyIds);
    await admin.from("store_settings").update({ modules: finalModules, updated_by: userId, updated_at: new Date().toISOString() }).in("company_id", companyIds);
    if (company.group_id) await admin.from("business_groups").update({ status, active: isEnabled, updated_at: new Date().toISOString() }).eq("id", company.group_id);

    await admin.from("company_subscription_history").insert({ company_id: companyId, subscription_id: subscription.id, action: previous ? "CONTRACT_CHANGED" : "CONTRACT_CREATED", old_value: previous || null, new_value: payload, justification, changed_by: userId });
    await admin.from("audit_logs").insert({ company_id: companyId, user_id: userId, action: "COMPANY_CONTRACT_SAVED", entity: "company_subscription", entity_id: subscription.id, old_value: previous || null, new_value: payload });
    return NextResponse.json({ success: true, subscriptionId: subscription.id });
  } catch (error) {
    console.error("Gerivo upsert subscription:", error);
    const message = error instanceof Error ? error.message : "Não foi possível salvar a contratação.";
    return NextResponse.json({ error: message }, { status: message.includes("Sessão") ? 401 : message.includes("MASTER") ? 403 : 500 });
  }
}
