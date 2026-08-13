import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../../lib/supabase-admin";

export const runtime = "nodejs";
const ALLOWED = new Set(["IDENTITY", "CHECKLIST", "PRICING", "MESSAGES", "KNOWLEDGE", "CATALOG", "MODULES", "USERS"]);

async function requireMaster(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) throw new Error("Sessão inválida. Entre novamente no Gerivo.");
  const admin = getSupabaseAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) throw new Error("Sessão expirada. Entre novamente no Gerivo.");
  const { data: profile } = await admin.from("profiles").select("platform_role, active").eq("id", authData.user.id).maybeSingle();
  if (profile?.platform_role !== "MASTER" || !profile.active) throw new Error("Somente o MASTER Gerivo pode replicar configurações.");
  return { admin, userId: authData.user.id };
}

export async function POST(request: Request) {
  try {
    const { admin, userId } = await requireMaster(request);
    const body = await request.json();
    const sourceStoreId = String(body.sourceStoreId || "").trim();
    const targetStoreIds: string[] = Array.isArray(body.targetStoreIds)
      ? Array.from(new Set<string>(body.targetStoreIds.map((value: unknown) => String(value)).filter(Boolean)))
      : [];
    const sections = Array.isArray(body.sections)
      ? body.sections.map((value: unknown) => String(value).toUpperCase()).filter((value: string) => ALLOWED.has(value))
      : [];
    if (!sourceStoreId || !targetStoreIds.length || !sections.length) return NextResponse.json({ error: "Selecione a origem, os destinos e ao menos uma configuração." }, { status: 400 });

    const { data: sourceStore } = await admin.from("stores").select("id, company_id, name, companies(group_id)").eq("id", sourceStoreId).maybeSingle();
    if (!sourceStore) return NextResponse.json({ error: "Unidade de origem não encontrada." }, { status: 404 });
    const sourceCompany: any = Array.isArray((sourceStore as any).companies) ? (sourceStore as any).companies[0] : (sourceStore as any).companies;
    const groupId = sourceCompany?.group_id;

    const { data: targets } = await admin.from("stores").select("id, company_id, name, companies(group_id)").in("id", targetStoreIds);
    const validTargets = (targets || []).filter((target: any) => {
      const company = Array.isArray(target.companies) ? target.companies[0] : target.companies;
      return company?.group_id === groupId && target.id !== sourceStoreId;
    });
    if (validTargets.length !== targetStoreIds.filter((id: string) => id !== sourceStoreId).length) return NextResponse.json({ error: "Todos os destinos precisam pertencer ao mesmo grupo empresarial." }, { status: 400 });

    const [settingsResult, snapshotResult, subscriptionResult, membersResult] = await Promise.all([
      admin.from("store_settings").select("*").eq("store_id", sourceStoreId).maybeSingle(),
      admin.from("store_data_snapshots").select("payload").eq("store_id", sourceStoreId).maybeSingle(),
      admin.from("company_subscriptions").select("*").eq("company_id", (sourceStore as any).company_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      sections.includes("USERS")
        ? admin.from("store_members").select("user_id, role, active, job_function, custom_job_function, available_as_consultant").eq("store_id", sourceStoreId).eq("active", true)
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    const sourceSettings: any = settingsResult.data;
    const sourceSnapshot: any = snapshotResult.data;
    const sourceSubscription: any = subscriptionResult.data;
    const sourceMembers: any[] = membersResult.data || [];
    if (!sourceSettings) return NextResponse.json({ error: "Configurações da unidade de origem não encontradas." }, { status: 404 });

    let usersReplicated = 0;
    for (const target of validTargets as any[]) {
      const settingsPatch: Record<string, unknown> = { updated_by: userId, updated_at: new Date().toISOString() };
      if (sections.includes("IDENTITY")) Object.assign(settingsPatch, { logo_value: sourceSettings.logo_value, sidebar_color: sourceSettings.sidebar_color, selection_color: sourceSettings.selection_color });
      if (sections.includes("CHECKLIST")) Object.assign(settingsPatch, { checklist_name: sourceSettings.checklist_name, checklist_enabled_keys: sourceSettings.checklist_enabled_keys });
      if (sections.includes("PRICING")) settingsPatch.general_margin = sourceSettings.general_margin;
      if (sections.includes("MESSAGES")) Object.assign(settingsPatch, { quote_delivery_mode: sourceSettings.quote_delivery_mode, quote_message_template: sourceSettings.quote_message_template });
      if (sections.includes("MODULES") && sourceSubscription?.modules) {
        settingsPatch.modules = sourceSubscription.modules;
        settingsPatch.parts_order_settings = sourceSettings.parts_order_settings || { fields: { contact: { enabled: true, required: false }, plate: { enabled: false, required: false }, quoteNumber: { enabled: true, required: false }, productive: { enabled: true, required: false } } };
      }
      await admin.from("store_settings").update(settingsPatch).eq("store_id", target.id);

      if (sections.includes("MODULES") && sourceSubscription) {
        const { data: targetSubscription } = await admin.from("company_subscriptions").select("id").eq("company_id", target.company_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (targetSubscription?.id) {
          const limits = {
            company_limit: Number(sourceSubscription.company_limit) || 1,
            store_limit: Number(sourceSubscription.store_limit) || 1,
            user_limit: Number(sourceSubscription.user_limit) || 1,
            storage_gb: Number(sourceSubscription.storage_gb) || 5,
            ai_queries_monthly: Number(sourceSubscription.ai_queries_monthly) || 0,
          };
          await admin.from("company_subscriptions").update({
            plan_mode: "CUSTOM",
            plan_id: null,
            custom_plan_name: `Base replicada do grupo`,
            company_limit: limits.company_limit,
            store_limit: limits.store_limit,
            user_limit: limits.user_limit,
            storage_gb: limits.storage_gb,
            ai_queries_monthly: limits.ai_queries_monthly,
            modules: sourceSubscription.modules || {},
            custom_limits: limits,
            custom_modules: sourceSubscription.modules || {},
            updated_by: userId,
            updated_at: new Date().toISOString(),
          }).eq("id", targetSubscription.id);
        }
      }

      if (sourceSnapshot?.payload && (sections.includes("KNOWLEDGE") || sections.includes("CATALOG") || sections.includes("IDENTITY") || sections.includes("CHECKLIST") || sections.includes("PRICING") || sections.includes("MESSAGES") || sections.includes("MODULES"))) {
        const { data: targetSnapshot } = await admin.from("store_data_snapshots").select("payload").eq("store_id", target.id).maybeSingle();
        const sourcePayload: any = sourceSnapshot.payload || {};
        const payload: any = { ...(targetSnapshot?.payload || {}) };
        if (sections.includes("KNOWLEDGE")) payload.knowledgeBase = sourcePayload.knowledgeBase || [];
        if (sections.includes("CATALOG")) {
          payload.catalog = sourcePayload.catalog || [];
          payload.serviceTypes = sourcePayload.serviceTypes || [];
          payload.suppliers = sourcePayload.suppliers || [];
        }
        if (sections.includes("IDENTITY")) payload.companyIdentity = { ...(payload.companyIdentity || {}), ...(sourcePayload.companyIdentity || {}), displayName: payload.companyIdentity?.displayName || target.name };
        if (sections.includes("CHECKLIST")) payload.checklistSettings = sourcePayload.checklistSettings || payload.checklistSettings;
        if (sections.includes("PRICING") || sections.includes("MESSAGES") || sections.includes("MODULES")) {
          payload.companySettings = { ...(payload.companySettings || {}), ...(sourcePayload.companySettings || {}) };
          if (!sections.includes("MODULES")) payload.companySettings.modules = (targetSnapshot?.payload as any)?.companySettings?.modules || payload.companySettings.modules || {};
          else payload.companySettings.modules = sourceSubscription?.modules || sourceSettings.modules || payload.companySettings.modules || {};
        }
        await admin.from("store_data_snapshots").upsert({ store_id: target.id, company_id: target.company_id, payload, updated_by: userId });
      }

      if (sections.includes("USERS") && sourceMembers.length) {
        for (const member of sourceMembers) {
          await admin.from("company_members").upsert({
            company_id: target.company_id,
            user_id: member.user_id,
            role: member.role,
            active: true,
          }, { onConflict: "company_id,user_id" });
          await admin.from("store_members").upsert({
            store_id: target.id,
            company_id: target.company_id,
            user_id: member.user_id,
            role: member.role,
            active: true,
            job_function: member.job_function || "OUTRO",
            custom_job_function: member.custom_job_function || null,
            available_as_consultant: Boolean(member.available_as_consultant),
          }, { onConflict: "store_id,user_id" });
          usersReplicated += 1;
        }
      }
    }

    await admin.from("audit_logs").insert({
      user_id: userId,
      action: "GROUP_SETTINGS_REPLICATED",
      entity: "business_group",
      entity_id: groupId,
      new_value: { source_store_id: sourceStoreId, target_store_ids: validTargets.map((item: any) => item.id), sections, users_replicated: usersReplicated },
    });
    return NextResponse.json({ success: true, replicated: validTargets.length, usersReplicated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível replicar as configurações.";
    return NextResponse.json({ error: message }, { status: message.includes("Sessão") ? 401 : message.includes("MASTER") ? 403 : 500 });
  }
}
