import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../lib/supabase-admin";

export const runtime = "nodejs";

async function authorize(request: Request, companyId: string) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) throw new Error("Sessão inválida. Entre novamente no Gerivo.");
  const admin = getSupabaseAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) throw new Error("Sessão expirada. Entre novamente no Gerivo.");
  const [{ data: profile }, { data: membership }] = await Promise.all([
    admin.from("profiles").select("platform_role, active").eq("id", authData.user.id).maybeSingle(),
    admin.from("company_members").select("role, active").eq("company_id", companyId).eq("user_id", authData.user.id).maybeSingle(),
  ]);
  const platformMaster = profile?.platform_role === "MASTER" && profile?.active;
  const requesterRole = platformMaster ? "MASTER" : membership?.active ? String(membership.role || "MEMBER") : "MEMBER";
  if (!platformMaster && !["ADMIN", "MANAGER"].includes(requesterRole)) {
    throw new Error("Sem permissão para consultar usuários desta empresa.");
  }
  return { admin, userId: authData.user.id, requesterRole, platformMaster };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const companyId = String(body.companyId || "").trim();
    const storeId = String(body.storeId || "").trim();
    if (!companyId || !storeId) return NextResponse.json({ error: "Informe a empresa e a unidade." }, { status: 400 });

    const { admin, userId, requesterRole, platformMaster } = await authorize(request, companyId);
    if (!platformMaster && requesterRole === "MANAGER") {
      const { data: ownStore } = await admin.from("store_members").select("store_id").eq("store_id", storeId).eq("company_id", companyId).eq("user_id", userId).eq("active", true).maybeSingle();
      if (!ownStore) return NextResponse.json({ error: "Você não possui acesso a esta unidade." }, { status: 403 });
    }

    const { data: companyMembers, error: membersError } = await admin
      .from("company_members")
      .select("user_id, role, active, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true });
    if (membersError) throw membersError;

    const userIds = (companyMembers || []).map((item: any) => String(item.user_id));
    if (!userIds.length) return NextResponse.json({ users: [], requesterRole });

    const [{ data: profiles, error: profilesError }, { data: storeMembers, error: storeError }] = await Promise.all([
      admin.from("profiles").select("id, username, email, recovery_email, full_name, phone, platform_role, active, created_at").in("id", userIds),
      admin.from("store_members").select("user_id, role, active").eq("company_id", companyId).eq("store_id", storeId).in("user_id", userIds),
    ]);
    if (profilesError) throw profilesError;
    if (storeError) throw storeError;

    const profileMap = new Map((profiles || []).map((item: any) => [String(item.id), item]));
    const storeMap = new Map((storeMembers || []).map((item: any) => [String(item.user_id), item]));
    const users = (companyMembers || [])
      .map((member: any) => {
        const id = String(member.user_id);
        const profile: any = profileMap.get(id) || {};
        const storeMember: any = storeMap.get(id) || null;
        return {
          id,
          fullName: profile.full_name || profile.username || profile.email || "Usuário",
          username: profile.username || "",
          email: profile.recovery_email || profile.email || "",
          phone: profile.phone || "",
          role: String(member.role || storeMember?.role || "MEMBER"),
          companyActive: Boolean(member.active && profile.active !== false),
          storeActive: Boolean(storeMember?.active),
          platformRole: profile.platform_role || "USER",
          createdAt: member.created_at || profile.created_at || null,
        };
      })
      .filter((item: any) => platformMaster || requesterRole !== "MANAGER" || item.storeActive || item.id === userId)
      .sort((a: any, b: any) => a.fullName.localeCompare(b.fullName, "pt-BR"));

    return NextResponse.json({ users, requesterRole });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar os usuários.";
    console.error("Gerivo list users:", error);
    const status = message.includes("Sessão") ? 401 : message.includes("permissão") || message.includes("acesso") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
