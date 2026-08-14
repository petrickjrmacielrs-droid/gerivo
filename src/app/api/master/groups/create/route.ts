import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../../lib/supabase-admin";

export const runtime = "nodejs";

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "grupo";
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) return NextResponse.json({ error: "Sessão inválida. Entre novamente no Gerivo." }, { status: 401 });

    const admin = getSupabaseAdminClient();
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: "Sessão expirada. Entre novamente no Gerivo." }, { status: 401 });

    const { data: profile } = await admin.from("profiles").select("platform_role, active").eq("id", authData.user.id).maybeSingle();
    if (profile?.platform_role !== "MASTER" || !profile.active) return NextResponse.json({ error: "Somente o MASTER Gerivo pode criar grupos empresariais." }, { status: 403 });

    const body = await request.json();
    const name = String(body.name || "").trim();
    const planScope = body.planScope === "COMPANY" ? "COMPANY" : "GROUP";
    if (name.length < 2) return NextResponse.json({ error: "Informe o nome do grupo empresarial." }, { status: 400 });
    if (name.length > 120) return NextResponse.json({ error: "O nome do grupo deve ter no máximo 120 caracteres." }, { status: 400 });

    const { data: existing } = await admin.from("business_groups").select("id").ilike("name", name).limit(1).maybeSingle();
    if (existing) return NextResponse.json({ error: "Já existe um grupo empresarial com esse nome." }, { status: 409 });

    const slug = `${slugify(name)}-grupo-${randomUUID().replace(/-/g, "").slice(0, 8)}`;
    const { data: group, error } = await admin.from("business_groups").insert({
      name,
      slug,
      plan_scope: planScope,
      status: "AWAITING_ACTIVATION",
      active: false,
      created_by: authData.user.id,
    }).select("id, name, status, active, plan_scope").single();
    if (error || !group) throw new Error(error?.message || "Não foi possível criar o grupo empresarial.");

    await admin.from("audit_logs").insert({
      user_id: authData.user.id,
      action: "BUSINESS_GROUP_CREATED",
      entity: "business_group",
      entity_id: group.id,
      new_value: { name, status: group.status, plan_scope: planScope },
    });

    return NextResponse.json({ success: true, group });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível criar o grupo empresarial.";
    return NextResponse.json({ error: message }, { status: message.includes("Sessão") ? 401 : message.includes("MASTER") ? 403 : 500 });
  }
}
