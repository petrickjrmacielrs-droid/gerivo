import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../../lib/supabase-admin";

export const runtime = "nodejs";

async function requireMaster(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) throw new Error("Sessão inválida. Entre novamente no Gerivo.");
  const admin = getSupabaseAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) throw new Error("Sessão expirada. Entre novamente no Gerivo.");
  const { data: profile } = await admin.from("profiles").select("platform_role, active").eq("id", authData.user.id).maybeSingle();
  if (profile?.platform_role !== "MASTER" || !profile.active) throw new Error("Somente o MASTER Gerivo pode editar planos e valores.");
  return { admin, userId: authData.user.id };
}


function cleanModules(value: unknown, fallback: Record<string, boolean>) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const source = value as Record<string, unknown>;
  return Object.fromEntries(Object.keys({ ...fallback, ...source }).map((key) => [key, Boolean(source[key] ?? fallback[key])])) as Record<string, boolean>;
}

function cleanFeatures(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 20);
}

export async function POST(request: Request) {
  try {
    const { admin, userId } = await requireMaster(request);
    const body = await request.json();
    const planId = String(body.planId || "").trim();
    const name = String(body.name || "").trim();
    if (!planId || name.length < 2) return NextResponse.json({ error: "Informe um plano e um nome válidos." }, { status: 400 });

    const { data: previous, error: previousError } = await admin.from("subscription_plans").select("*").eq("id", planId).maybeSingle();
    if (previousError || !previous) return NextResponse.json({ error: "Plano não encontrado." }, { status: 404 });

    const payload = {
      name,
      monthly_price: Math.max(0, Number(body.monthlyPrice) || 0),
      annual_price: Math.max(0, Number(body.annualPrice) || 0),
      company_limit: Math.max(1, Math.floor(Number(body.companyLimit) || 1)),
      store_limit: Math.max(1, Math.floor(Number(body.storeLimit) || 1)),
      user_limit: Math.max(1, Math.floor(Number(body.userLimit) || 1)),
      storage_gb: Math.max(1, Math.floor(Number(body.storageGb) || Number(previous.storage_gb) || 5)),
      ai_queries_monthly: Math.max(0, Math.floor(Number(body.aiQueriesMonthly) || 0)),
      public_description: String(body.publicDescription || "").trim() || null,
      public_features: cleanFeatures(body.publicFeatures),
      public_cta_label: String(body.publicCtaLabel || "Tenho interesse").trim() || "Tenho interesse",
      recommended: Boolean(body.recommended),
      modules: cleanModules(body.modules, (previous.modules || {}) as Record<string, boolean>),
      public_visible: body.publicVisible !== false,
      public_sort_order: Math.max(0, Math.floor(Number(body.publicSortOrder) || 0)),
      updated_at: new Date().toISOString(),
    };

    const { error } = await admin.from("subscription_plans").update(payload).eq("id", planId);
    if (error) throw error;

    if (payload.recommended) {
      await admin.from("subscription_plans").update({ recommended: false, updated_at: new Date().toISOString() }).neq("id", planId);
      await admin.from("subscription_plans").update({ recommended: true, updated_at: new Date().toISOString() }).eq("id", planId);
    }

    // Planos STANDARD herdam o catálogo de módulos do plano. Ao alterar um módulo
    // no MASTER (ex.: Selling), propaga para contratos STANDARD já vigentes e suas lojas.
    const { data: standardSubscriptions, error: standardError } = await admin
      .from("company_subscriptions")
      .select("id,company_id,group_id,contract_scope")
      .eq("plan_id", planId)
      .eq("plan_mode", "STANDARD")
      .in("status", ["ACTIVE", "GRACE", "READ_ONLY", "DEMO", "AWAITING_ACTIVATION"]);
    if (standardError) throw standardError;
    if (standardSubscriptions?.length) {
      const subscriptionIds = standardSubscriptions.map((subscription: any) => subscription.id);
      const { error: subscriptionUpdateError } = await admin.from("company_subscriptions").update({ modules: payload.modules, updated_by: userId, updated_at: new Date().toISOString() }).in("id", subscriptionIds);
      if (subscriptionUpdateError) throw subscriptionUpdateError;
      const companyIds = new Set<string>();
      for (const subscription of standardSubscriptions as any[]) {
        if (subscription.contract_scope === "GROUP" && subscription.group_id) {
          const { data: companies, error: companiesError } = await admin.from("companies").select("id").eq("group_id", subscription.group_id);
          if (companiesError) throw companiesError;
          (companies || []).forEach((company: any) => companyIds.add(company.id));
        } else if (subscription.company_id) companyIds.add(subscription.company_id);
      }
      if (companyIds.size) {
        const { error: settingsError } = await admin.from("store_settings").update({ modules: payload.modules, updated_by: userId, updated_at: new Date().toISOString() }).in("company_id", Array.from(companyIds));
        if (settingsError) throw settingsError;
      }
    }

    await admin.from("audit_logs").insert({
      user_id: userId,
      action: "SUBSCRIPTION_PLAN_UPDATED",
      entity: "subscription_plan",
      entity_id: planId,
      old_value: previous,
      new_value: payload,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Gerivo update plan:", error);
    const message = error instanceof Error ? error.message : "Não foi possível atualizar o plano.";
    return NextResponse.json({ error: message }, { status: message.includes("Sessão") ? 401 : message.includes("MASTER") ? 403 : 500 });
  }
}
