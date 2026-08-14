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
  if (profile?.platform_role !== "MASTER" || !profile.active) throw new Error("Somente o MASTER Gerivo pode editar grupos empresariais.");
  return { admin, userId: authData.user.id };
}

export async function POST(request: Request) {
  try {
    const { admin, userId } = await requireMaster(request);
    const body = await request.json();
    const groupId = String(body.groupId || "").trim();
    const name = String(body.name || "").trim();
    if (!groupId) return NextResponse.json({ error: "Informe o grupo empresarial." }, { status: 400 });
    if (body.name !== undefined && name.length < 2) return NextResponse.json({ error: "Informe um nome válido para o grupo." }, { status: 400 });

    const { data: previous, error: previousError } = await admin.from("business_groups").select("id, name, status, active, plan_scope").eq("id", groupId).maybeSingle();
    if (previousError || !previous) return NextResponse.json({ error: "Grupo empresarial não encontrado." }, { status: 404 });

    if (body.planScope !== undefined) return NextResponse.json({ error: "O escopo do plano deve ser alterado pela aba Plano e contratação para preservar contratos e módulos." }, { status: 409 });
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) patch.name = name;
    const { error } = await admin.from("business_groups").update(patch).eq("id", groupId);
    if (error) throw error;

    const next = { ...previous, ...(body.name !== undefined ? { name } : {}) };
    await admin.from("audit_logs").insert({ user_id: userId, action: "BUSINESS_GROUP_UPDATED", entity: "business_group", entity_id: groupId, old_value: previous, new_value: next });
    return NextResponse.json({ success: true, group: next });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível editar o grupo.";
    return NextResponse.json({ error: message }, { status: message.includes("Sessão") ? 401 : message.includes("MASTER") ? 403 : 500 });
  }
}
