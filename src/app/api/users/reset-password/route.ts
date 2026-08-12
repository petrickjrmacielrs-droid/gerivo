import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "../../../../lib/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    const body = await request.json();
    const companyId = String(body.companyId || "").trim();
    const userId = String(body.userId || "").trim();
    const requestedRedirect = String(body.redirectTo || "").trim();
    const applicationOrigin = new URL(request.url).origin;
    const redirectTo = requestedRedirect.startsWith(applicationOrigin) ? requestedRedirect : `${applicationOrigin}/`;
    if (!companyId || !userId) return NextResponse.json({ error: "Informe empresa e usuário." }, { status: 400 });

    const admin = getSupabaseAdminClient();
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
    const [{ data: requesterProfile }, { data: requesterMember }, { data: requesterStores }, { data: anchorCompany }] = await Promise.all([
      admin.from("profiles").select("platform_role, active").eq("id", authData.user.id).maybeSingle(),
      admin.from("company_members").select("role, active").eq("company_id", companyId).eq("user_id", authData.user.id).maybeSingle(),
      admin.from("store_members").select("store_id").eq("company_id", companyId).eq("user_id", authData.user.id).eq("active", true),
      admin.from("companies").select("id, group_id").eq("id", companyId).maybeSingle(),
    ]);
    const platformMaster = requesterProfile?.platform_role === "MASTER" && requesterProfile.active;
    const requesterRole = platformMaster ? "MASTER" : requesterMember?.active ? String(requesterMember.role || "MEMBER") : "MEMBER";
    if (!platformMaster && !["ADMIN", "MANAGER"].includes(requesterRole)) return NextResponse.json({ error: "Sem permissão para solicitar redefinição." }, { status: 403 });

    const allowedCompanyIds: string[] = platformMaster && anchorCompany?.group_id
      ? ((await admin.from("companies").select("id").eq("group_id", anchorCompany.group_id)).data || []).map((item: any) => String(item.id))
      : [companyId];
    const [{ data: targetProfile }, { data: targetMembers }, { data: targetStores }] = await Promise.all([
      admin.from("profiles").select("recovery_email, email, platform_role, active").eq("id", userId).maybeSingle(),
      admin.from("company_members").select("company_id, role, active").in("company_id", allowedCompanyIds).eq("user_id", userId),
      admin.from("store_members").select("company_id, store_id").in("company_id", allowedCompanyIds).eq("user_id", userId).eq("active", true),
    ]);
    const currentTargetMember = (targetMembers || []).find((item: any) => String(item.company_id) === companyId) || (targetMembers || [])[0];
    if (!targetProfile || !currentTargetMember) return NextResponse.json({ error: "Usuário não encontrado no escopo autorizado." }, { status: 404 });
    if (!platformMaster && targetProfile.platform_role === "MASTER") return NextResponse.json({ error: "Essa credencial é reservada ao MASTER Gerivo." }, { status: 403 });
    if (requesterRole === "MANAGER") {
      const requesterIds = new Set((requesterStores || []).map((item: any) => String(item.store_id)));
      const sharesStore = (targetStores || []).some((item: any) => String(item.company_id) === companyId && requesterIds.has(String(item.store_id)));
      if (!sharesStore || String(currentTargetMember.role) !== "MEMBER") return NextResponse.json({ error: "Gestores só podem redefinir usuários da própria equipe." }, { status: 403 });
    }
    const email = String(targetProfile.recovery_email || targetProfile.email || "").toLowerCase();
    if (!email.includes("@")) return NextResponse.json({ error: "O usuário não possui e-mail de recuperação válido." }, { status: 400 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return NextResponse.json({ error: "Supabase público não configurado no servidor." }, { status: 500 });
    const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await admin.from("audit_logs").insert({ company_id: currentTargetMember.company_id || companyId, user_id: authData.user.id, action: "PASSWORD_RESET_REQUESTED", entity: "profile", entity_id: userId, new_value: { email } });
    return NextResponse.json({ success: true, email });
  } catch (error) {
    console.error("Gerivo reset password:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível enviar a redefinição." }, { status: 500 });
  }
}
