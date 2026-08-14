import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../../lib/supabase-admin";

export const runtime = "nodejs";

function normalize(value: unknown) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

async function requireMaster(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) throw new Error("Sessão inválida. Entre novamente no Gerivo.");
  const admin = getSupabaseAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) throw new Error("Sessão expirada. Entre novamente no Gerivo.");
  const { data: profile } = await admin.from("profiles").select("platform_role, active").eq("id", authData.user.id).maybeSingle();
  if (profile?.platform_role !== "MASTER" || !profile.active) throw new Error("Somente o MASTER Gerivo pode excluir empresas e grupos.");
  return { admin, userId: authData.user.id };
}

export async function POST(request: Request) {
  try {
    const { admin, userId } = await requireMaster(request);
    const body = await request.json();
    const scope = String(body.scope || "").toUpperCase();
    const entityId = String(body.entityId || "").trim();
    const confirmation = normalize(body.confirmationName ?? body.confirmation);
    const cascade = body.cascade === true;
    if (!entityId || !["COMPANY", "GROUP"].includes(scope)) return NextResponse.json({ error: "Informe o registro que deseja excluir." }, { status: 400 });

    if (scope === "COMPANY") {
      const { data: company } = await admin.from("companies").select("id, name, group_id").eq("id", entityId).maybeSingle();
      if (!company) return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
      if (confirmation !== normalize(company.name)) return NextResponse.json({ error: `Digite exatamente o nome da empresa: ${company.name}` }, { status: 400 });
      // A contratação GROUP fica tecnicamente ancorada em uma empresa por compatibilidade
      // com o modelo histórico. Antes de excluir esse CNPJ, movemos a âncora para um irmão
      // do mesmo grupo para que o plano compartilhado não seja apagado por ON DELETE CASCADE.
      if (company.group_id) {
        const { data: sibling, error: siblingError } = await admin.from("companies").select("id").eq("group_id", company.group_id).neq("id", company.id).limit(1).maybeSingle();
        if (siblingError) throw siblingError;
        if (sibling?.id) {
          const { error: reanchorError } = await admin.from("company_subscriptions")
            .update({ company_id: sibling.id, updated_by: userId, updated_at: new Date().toISOString() })
            .eq("group_id", company.group_id)
            .eq("contract_scope", "GROUP")
            .eq("company_id", company.id);
          if (reanchorError) throw reanchorError;
        }
      }

      await admin.from("audit_logs").insert({ company_id: company.id, user_id: userId, action: "COMPANY_PERMANENTLY_DELETED", entity: "company", entity_id: company.id, old_value: company });
      const { error } = await admin.from("companies").delete().eq("id", company.id);
      if (error) throw error;
      return NextResponse.json({ success: true, deleted: "COMPANY" });
    }

    const { data: group } = await admin.from("business_groups").select("id, name").eq("id", entityId).maybeSingle();
    if (!group) return NextResponse.json({ error: "Grupo empresarial não encontrado." }, { status: 404 });
    if (confirmation !== normalize(group.name)) return NextResponse.json({ error: `Digite exatamente o nome do grupo: ${group.name}` }, { status: 400 });
    const { data: companies } = await admin.from("companies").select("id, name").eq("group_id", group.id);
    if ((companies || []).length && !cascade) return NextResponse.json({ error: "O grupo ainda possui empresas. Marque a confirmação para excluir também todas as empresas, unidades e dados do grupo." }, { status: 409 });

    await admin.from("audit_logs").insert({ user_id: userId, action: "BUSINESS_GROUP_PERMANENTLY_DELETED", entity: "business_group", entity_id: group.id, old_value: { group, companies } });
    if ((companies || []).length) {
      const { error: companiesError } = await admin.from("companies").delete().eq("group_id", group.id);
      if (companiesError) throw companiesError;
    }
    const { error: groupError } = await admin.from("business_groups").delete().eq("id", group.id);
    if (groupError) throw groupError;
    return NextResponse.json({ success: true, deleted: "GROUP", companyCount: (companies || []).length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível excluir o registro.";
    return NextResponse.json({ error: message }, { status: message.includes("Sessão") ? 401 : message.includes("MASTER") ? 403 : 500 });
  }
}
