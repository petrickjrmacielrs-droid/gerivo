import { NextResponse } from "next/server";
import { getSupabaseAdminClient, normalizeUsername } from "../../../../lib/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

    const admin = getSupabaseAdminClient();
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

    const body = await request.json();
    const companyId = String(body.companyId || "");
    const storeIds = Array.isArray(body.storeIds) ? body.storeIds.map(String) : [];
    const username = normalizeUsername(String(body.username || ""));
    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const role = ["ADMIN", "MANAGER", "MEMBER"].includes(body.role) ? body.role : "MEMBER";
    if (!companyId || !username || !fullName || !email || password.length < 8) {
      return NextResponse.json({ error: "Preencha nome, usuário, e-mail e senha temporária com 8 caracteres." }, { status: 400 });
    }

    const [{ data: requesterProfile }, { data: requesterMember }] = await Promise.all([
      admin.from("profiles").select("platform_role, active").eq("id", authData.user.id).maybeSingle(),
      admin.from("company_members").select("role, active").eq("company_id", companyId).eq("user_id", authData.user.id).maybeSingle(),
    ]);
    const platformMaster = requesterProfile?.platform_role === "MASTER" && requesterProfile?.active;
    const companyAdmin = requesterMember?.active && ["MASTER", "ADMIN"].includes(requesterMember.role);
    if (!platformMaster && !companyAdmin) return NextResponse.json({ error: "Sem permissão para criar usuários." }, { status: 403 });

    const [{ count: usernameCount }, { count: activeUsers }, { data: subscription }] = await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("username_normalized", username),
      admin.from("company_members").select("user_id", { count: "exact", head: true }).eq("company_id", companyId).eq("active", true),
      admin.from("company_subscriptions").select("user_limit, status, expires_at").eq("company_id", companyId).in("status", ["ACTIVE", "GRACE", "READ_ONLY"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if ((usernameCount || 0) > 0) return NextResponse.json({ error: "Este usuário já está em uso." }, { status: 409 });
    if (!platformMaster && !subscription) {
      return NextResponse.json({ error: "A assinatura da empresa não está ativa." }, { status: 403 });
    }
    if (subscription?.user_limit && (activeUsers || 0) >= subscription.user_limit && !platformMaster) {
      return NextResponse.json({ error: `Limite de ${subscription.user_limit} usuários atingido.` }, { status: 409 });
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, username },
    });
    if (createError || !created.user) return NextResponse.json({ error: createError?.message || "Falha ao criar usuário." }, { status: 400 });

    const userId = created.user.id;
    await admin.from("profiles").update({
      full_name: fullName,
      username,
      username_normalized: username,
      email,
      recovery_email: email,
      must_change_password: true,
      active: true,
    }).eq("id", userId);
    await admin.from("company_members").upsert({ company_id: companyId, user_id: userId, role, active: true });
    if (storeIds.length) {
      const stores = await admin.from("stores").select("id, company_id").in("id", storeIds).eq("company_id", companyId);
      if (stores.data?.length) {
        await admin.from("store_members").upsert(stores.data.map((store) => ({ store_id: store.id, company_id: companyId, user_id: userId, role, active: true })));
      }
    }
    return NextResponse.json({ id: userId, username });
  } catch (error) {
    console.error("Gerivo create user:", error);
    return NextResponse.json({ error: "Não foi possível criar o usuário." }, { status: 500 });
  }
}
