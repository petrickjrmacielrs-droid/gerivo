import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../../lib/supabase-admin";
import type { ContractScope } from "../../../../../lib/effective-subscription";

export const runtime = "nodejs";

const ALLOWED_STATUS = new Set(["DRAFT", "AWAITING_ACTIVATION", "PENDING_PAYMENT", "ACTIVE", "GRACE", "READ_ONLY", "SUSPENDED", "CANCELED", "EXPIRED", "DEMO"]);
const ALLOWED_CYCLES = new Set(["MONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL", "CUSTOM"]);
const MODULE_KEYS = ["APPOINTMENTS", "CATALOG", "INVENTORY", "CHECKLIST", "ORDERS", "QUOTES", "PARTS_ORDERS", "ASSISTANT", "BI", "MESSAGES", "BUDGET_IMPORT"];
const ENABLED_STATUS = new Set(["ACTIVE", "GRACE", "READ_ONLY", "DEMO"]);

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

function activeFromStatus(status: string) {
  return ENABLED_STATUS.has(status);
}

export async function POST(request: Request) {
  try {
    const { admin, userId } = await requireMaster(request);
    const body = await request.json();
    const companyId = String(body.companyId || "").trim();
    const planMode = body.planMode === "CUSTOM" ? "CUSTOM" : "STANDARD";
    const planId = planMode === "STANDARD" ? String(body.planId || "").trim() : null;
    const requestedScope: ContractScope = body.contractScope === "COMPANY" ? "COMPANY" : "GROUP";
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
      company_limit: Math.max(1, Math.floor(Number(body.companyLimit) || 1)),
      store_limit: Math.max(1, Math.floor(Number(body.storeLimit) || 1)),
      user_limit: Math.max(1, Math.floor(Number(body.userLimit) || 1)),
      storage_gb: Math.max(1, Math.floor(Number(body.storageGb) || 5)),
      ai_queries_monthly: Math.max(0, Math.floor(Number(body.aiQueriesMonthly) || 0)),
    };

    if (!companyId || !contractStart || !contractEnd) return NextResponse.json({ error: "Informe a empresa e o período da contratação." }, { status: 400 });
    if (new Date(contractEnd) < new Date(contractStart)) return NextResponse.json({ error: "A data final deve ser posterior à data inicial." }, { status: 400 });

    const { data: company, error: companyError } = await admin.from("companies").select("id, group_id, name").eq("id", companyId).maybeSingle();
    if (companyError) throw companyError;
    if (!company) return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });

    const contractScope: ContractScope = company.group_id ? requestedScope : "COMPANY";
    const groupId = company.group_id || null;
    let previousGroupPlanScope: ContractScope = "COMPANY";
    let previousGroupSubscription: any = null;
    if (groupId) {
      const { data: group, error: groupError } = await admin.from("business_groups").select("plan_scope").eq("id", groupId).maybeSingle();
      if (groupError) throw groupError;
      previousGroupPlanScope = group?.plan_scope === "GROUP" ? "GROUP" : "COMPANY";
      if (previousGroupPlanScope === "GROUP") {
        const groupSubscriptionResult = await admin.from("company_subscriptions").select("*").eq("group_id", groupId).eq("contract_scope", "GROUP").order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (groupSubscriptionResult.error) throw groupSubscriptionResult.error;
        previousGroupSubscription = groupSubscriptionResult.data || null;
      }
    }

    let plan: any = null;
    if (planMode === "STANDARD") {
      const result = await admin.from("subscription_plans").select("*").eq("id", planId).eq("active", true).maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) return NextResponse.json({ error: "Selecione um plano Gerivo válido." }, { status: 400 });
      plan = result.data;
    }

    const finalModules = planMode === "STANDARD" ? cleanModules(plan.modules) : modules;
    const finalLimits = planMode === "STANDARD" ? {
      company_limit: Number(plan.company_limit) || 1,
      store_limit: Number(plan.store_limit) || 1,
      user_limit: Number(plan.user_limit) || 1,
      storage_gb: Number(plan.storage_gb) || 5,
      ai_queries_monthly: Number(plan.ai_queries_monthly) || 0,
    } : limits;

    let groupCompanyIds: string[] = [companyId];
    if (groupId) {
      const { data: groupCompanies, error: groupCompaniesError } = await admin.from("companies").select("id").eq("group_id", groupId);
      if (groupCompaniesError) throw groupCompaniesError;
      groupCompanyIds = (groupCompanies || []).map((item: any) => String(item.id));
      if (!groupCompanyIds.includes(companyId)) groupCompanyIds.push(companyId);
    }
    const scopeCompanyIds: string[] = contractScope === "GROUP" ? groupCompanyIds : [companyId];

    const { count: storeCount, error: storeCountError } = await admin.from("stores").select("id", { count: "exact", head: true }).in("company_id", scopeCompanyIds);
    if (storeCountError) throw storeCountError;
    const { data: activeMembers, error: userCountError } = await admin.from("company_members").select("user_id").in("company_id", scopeCompanyIds).eq("active", true);
    if (userCountError) throw userCountError;
    const userCount = new Set((activeMembers || []).map((item: any) => String(item.user_id))).size;

    if (contractScope === "GROUP" && scopeCompanyIds.length > finalLimits.company_limit) {
      return NextResponse.json({ error: `O grupo possui ${scopeCompanyIds.length} empresa(s), mas o plano permite ${finalLimits.company_limit}. Escolha um plano compatível ou aumente o limite no plano personalizado.` }, { status: 409 });
    }
    if ((storeCount || 0) > finalLimits.store_limit) {
      return NextResponse.json({ error: `O escopo possui ${storeCount || 0} unidade(s), mas o plano permite ${finalLimits.store_limit}.` }, { status: 409 });
    }
    if (userCount > finalLimits.user_limit) {
      return NextResponse.json({ error: `O escopo possui ${userCount} usuário(s) ativo(s), mas o plano permite ${finalLimits.user_limit}.` }, { status: 409 });
    }

    const previousQuery = admin.from("company_subscriptions").select("*").order("created_at", { ascending: false }).limit(1);
    const previousResult = contractScope === "GROUP" && groupId
      ? await previousQuery.eq("group_id", groupId).eq("contract_scope", "GROUP").maybeSingle()
      : await previousQuery.eq("company_id", companyId).eq("contract_scope", "COMPANY").maybeSingle();
    if (previousResult.error) throw previousResult.error;
    const previous = previousResult.data || null;

    const months = Math.max(1, Math.ceil((new Date(contractEnd).getTime() - new Date(contractStart).getTime()) / (30.4375 * 86400000)));
    const activatedAt = `${contractStart}T00:00:00.000Z`;
    const expiresAt = `${contractEnd}T23:59:59.999Z`;
    const graceUntil = new Date(new Date(expiresAt).getTime() + graceDays * 86400000).toISOString();
    const isEnabled = activeFromStatus(status);

    const payload = {
      company_id: companyId,
      group_id: groupId,
      contract_scope: contractScope,
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

    // Só expira a versão anterior DEPOIS que a nova contratação foi gravada. Assim uma falha
    // de insert nunca deixa o cliente sem plano/módulos — causa do comportamento "sumiu tudo".
    if (contractScope === "GROUP" && groupId) {
      const { error: expirePreviousError } = await admin.from("company_subscriptions")
        .update({ status: "EXPIRED", updated_by: userId, updated_at: new Date().toISOString() })
        .eq("group_id", groupId)
        .eq("contract_scope", "GROUP")
        .neq("id", subscription.id)
        .neq("status", "EXPIRED");
      if (expirePreviousError) throw expirePreviousError;
    } else {
      const { error: expirePreviousError } = await admin.from("company_subscriptions")
        .update({ status: "EXPIRED", updated_by: userId, updated_at: new Date().toISOString() })
        .eq("company_id", companyId)
        .eq("contract_scope", "COMPANY")
        .neq("id", subscription.id)
        .neq("status", "EXPIRED");
      if (expirePreviousError) throw expirePreviousError;
    }

    // Ao separar um grupo que antes compartilhava uma contratação, cada outro CNPJ recebe
    // uma cópia explícita do contrato do grupo. Assim ninguém perde plano ou módulos no momento
    // em que o MASTER muda o escopo para "por empresa".
    if (groupId && contractScope === "COMPANY" && previousGroupPlanScope === "GROUP" && previousGroupSubscription) {
      const otherCompanyIds = groupCompanyIds.filter((id) => id !== companyId);
      if (otherCompanyIds.length) {
        const nowIso = new Date().toISOString();
        const { error: expireCompanyContractsError } = await admin.from("company_subscriptions")
          .update({ status: "EXPIRED", updated_by: userId, updated_at: nowIso })
          .in("company_id", otherCompanyIds)
          .eq("contract_scope", "COMPANY")
          .neq("status", "EXPIRED");
        if (expireCompanyContractsError) throw expireCompanyContractsError;

        const { id: _sourceId, company_id: _sourceCompanyId, group_id: _sourceGroupId, contract_scope: _sourceScope, created_at: _sourceCreatedAt, updated_at: _sourceUpdatedAt, ...sourceContract } = previousGroupSubscription;
        const clonedContracts = otherCompanyIds.map((targetCompanyId) => ({
          ...sourceContract,
          company_id: targetCompanyId,
          group_id: groupId,
          contract_scope: "COMPANY",
          updated_by: userId,
          notes: sourceContract.notes || "Contratação individual criada a partir do plano compartilhado do grupo.",
          created_at: nowIso,
          updated_at: nowIso,
        }));
        const { data: clones, error: cloneError } = await admin.from("company_subscriptions").insert(clonedContracts).select("id, company_id");
        if (cloneError) throw cloneError;

        const splitHistory = (clones || []).map((clone: any) => ({
          company_id: clone.company_id,
          group_id: groupId,
          contract_scope: "COMPANY",
          subscription_id: clone.id,
          action: "CONTRACT_SCOPE_SPLIT",
          old_value: previousGroupSubscription,
          new_value: { ...sourceContract, company_id: clone.company_id, group_id: groupId, contract_scope: "COMPANY" },
          justification: "Grupo alterado de plano compartilhado para contratação por empresa pelo MASTER.",
          changed_by: userId,
        }));
        if (splitHistory.length) {
          const { error: splitHistoryError } = await admin.from("company_subscription_history").insert(splitHistory);
          if (splitHistoryError) throw splitHistoryError;
        }
      }
    }

    const targetCompanyIds = contractScope === "GROUP" ? scopeCompanyIds : [companyId];
    const { error: companiesUpdateError } = await admin.from("companies").update({ status, active: isEnabled, updated_at: new Date().toISOString() }).in("id", targetCompanyIds);
    if (companiesUpdateError) throw companiesUpdateError;
    const { error: storesUpdateError } = await admin.from("stores").update({ active: isEnabled, updated_at: new Date().toISOString() }).in("company_id", targetCompanyIds);
    if (storesUpdateError) throw storesUpdateError;
    const { error: settingsUpdateError } = await admin.from("store_settings").update({ modules: finalModules, updated_by: userId, updated_at: new Date().toISOString() }).in("company_id", targetCompanyIds);
    if (settingsUpdateError) throw settingsUpdateError;

    if (groupId) {
      if (contractScope === "GROUP") {
        const { error: groupUpdateError } = await admin.from("business_groups").update({ active: isEnabled, status, plan_scope: "GROUP", updated_at: new Date().toISOString() }).eq("id", groupId);
        if (groupUpdateError) throw groupUpdateError;
      } else {
        const { data: groupCompanies, error: groupCompaniesError } = await admin.from("companies").select("active, status").eq("group_id", groupId);
        if (groupCompaniesError) throw groupCompaniesError;
        const groupActive = (groupCompanies || []).some((item: any) => Boolean(item.active));
        const groupStatus = groupActive ? "ACTIVE" : ((groupCompanies || []).find((item: any) => item.status)?.status || status);
        const { error: groupUpdateError } = await admin.from("business_groups").update({ active: groupActive, status: groupStatus, plan_scope: "COMPANY", updated_at: new Date().toISOString() }).eq("id", groupId);
        if (groupUpdateError) throw groupUpdateError;
      }
    }

    // Mantém apenas um modelo comercial vigente por vez. Ao consolidar no grupo,
    // contratos individuais antigos viram histórico; ao separar, o antigo contrato GROUP expira.
    if (groupId && contractScope === "GROUP") {
      const { error: expireIndividualError } = await admin.from("company_subscriptions")
        .update({ status: "EXPIRED", updated_by: userId, updated_at: new Date().toISOString() })
        .in("company_id", groupCompanyIds)
        .eq("contract_scope", "COMPANY")
        .neq("status", "EXPIRED");
      if (expireIndividualError) throw expireIndividualError;
    } else if (groupId && contractScope === "COMPANY" && previousGroupPlanScope === "GROUP") {
      const { error: expireSharedError } = await admin.from("company_subscriptions")
        .update({ status: "EXPIRED", updated_by: userId, updated_at: new Date().toISOString() })
        .eq("group_id", groupId)
        .eq("contract_scope", "GROUP")
        .neq("status", "EXPIRED");
      if (expireSharedError) throw expireSharedError;
    }

    const historyRows = targetCompanyIds.map((targetCompanyId) => ({
      company_id: targetCompanyId,
      group_id: groupId,
      contract_scope: contractScope,
      subscription_id: subscription.id,
      action: previous ? "CONTRACT_CHANGED" : "CONTRACT_CREATED",
      old_value: previous || null,
      new_value: payload,
      justification,
      changed_by: userId,
    }));
    const { error: historyError } = await admin.from("company_subscription_history").insert(historyRows);
    if (historyError) throw historyError;

    await admin.from("audit_logs").insert({
      company_id: companyId,
      user_id: userId,
      action: contractScope === "GROUP" ? "GROUP_CONTRACT_SAVED" : "COMPANY_CONTRACT_SAVED",
      entity: "company_subscription",
      entity_id: subscription.id,
      old_value: previous || null,
      new_value: { ...payload, affected_companies: targetCompanyIds },
    });

    return NextResponse.json({ success: true, subscriptionId: subscription.id, contractScope, affectedCompanies: targetCompanyIds.length });
  } catch (error) {
    console.error("Gerivo upsert subscription:", error);
    const message = error instanceof Error ? error.message : "Não foi possível salvar a contratação.";
    return NextResponse.json({ error: message }, { status: message.includes("Sessão") ? 401 : message.includes("MASTER") ? 403 : 500 });
  }
}
