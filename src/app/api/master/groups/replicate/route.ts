import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../../lib/supabase-admin";

export const runtime = "nodejs";
const ALLOWED = new Set(["IDENTITY", "CHECKLIST", "PRICING", "MESSAGES", "KNOWLEDGE", "CATALOG"]);

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
    const sections = Array.isArray(body.sections) ? body.sections.map((value: unknown) => String(value).toUpperCase()).filter((value: string) => ALLOWED.has(value)) : [];
    if (!sourceStoreId || !targetStoreIds.length || !sections.length) return NextResponse.json({ error: "Selecione a origem, os destinos e ao menos uma configuração." }, { status: 400 });

    const { data: sourceStore } = await admin.from("stores").select("id, company_id, companies(group_id)").eq("id", sourceStoreId).maybeSingle();
    if (!sourceStore) return NextResponse.json({ error: "Unidade de origem não encontrada." }, { status: 404 });
    const sourceCompany: any = Array.isArray((sourceStore as any).companies) ? (sourceStore as any).companies[0] : (sourceStore as any).companies;
    const groupId = sourceCompany?.group_id;
    const { data: targets } = await admin.from("stores").select("id, company_id, name, companies(group_id)").in("id", targetStoreIds);
    const validTargets = (targets || []).filter((target: any) => {
      const company = Array.isArray(target.companies) ? target.companies[0] : target.companies;
      return company?.group_id === groupId && target.id !== sourceStoreId;
    });
    if (validTargets.length !== targetStoreIds.filter((id: string) => id !== sourceStoreId).length) return NextResponse.json({ error: "Todos os destinos precisam pertencer ao mesmo grupo empresarial." }, { status: 400 });

    const [{ data: sourceSettings }, { data: sourceSnapshot }] = await Promise.all([
      admin.from("store_settings").select("*").eq("store_id", sourceStoreId).maybeSingle(),
      admin.from("store_data_snapshots").select("payload").eq("store_id", sourceStoreId).maybeSingle(),
    ]);
    if (!sourceSettings) return NextResponse.json({ error: "Configurações da unidade de origem não encontradas." }, { status: 404 });

    for (const target of validTargets as any[]) {
      const settingsPatch: Record<string, unknown> = { updated_by: userId, updated_at: new Date().toISOString() };
      if (sections.includes("IDENTITY")) Object.assign(settingsPatch, { logo_value: sourceSettings.logo_value, sidebar_color: sourceSettings.sidebar_color, selection_color: sourceSettings.selection_color });
      if (sections.includes("CHECKLIST")) Object.assign(settingsPatch, { checklist_name: sourceSettings.checklist_name, checklist_enabled_keys: sourceSettings.checklist_enabled_keys });
      if (sections.includes("PRICING")) settingsPatch.general_margin = sourceSettings.general_margin;
      if (sections.includes("MESSAGES")) Object.assign(settingsPatch, { quote_delivery_mode: sourceSettings.quote_delivery_mode, quote_message_template: sourceSettings.quote_message_template });
      await admin.from("store_settings").update(settingsPatch).eq("store_id", target.id);

      if (sourceSnapshot?.payload && (sections.includes("KNOWLEDGE") || sections.includes("CATALOG") || sections.includes("IDENTITY") || sections.includes("CHECKLIST") || sections.includes("PRICING") || sections.includes("MESSAGES"))) {
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
        if (sections.includes("PRICING") || sections.includes("MESSAGES")) payload.companySettings = { ...(payload.companySettings || {}), ...(sourcePayload.companySettings || {}), modules: payload.companySettings?.modules || sourcePayload.companySettings?.modules || {} };
        await admin.from("store_data_snapshots").upsert({ store_id: target.id, company_id: target.company_id, payload, updated_by: userId });
      }
    }

    await admin.from("audit_logs").insert({ user_id: userId, action: "GROUP_SETTINGS_REPLICATED", entity: "business_group", entity_id: groupId, new_value: { source_store_id: sourceStoreId, target_store_ids: validTargets.map((item: any) => item.id), sections } });
    return NextResponse.json({ success: true, replicated: validTargets.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível replicar as configurações.";
    return NextResponse.json({ error: message }, { status: message.includes("Sessão") ? 401 : message.includes("MASTER") ? 403 : 500 });
  }
}
