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
  const [{ data: profile }, { data: membership }, { data: ownStores }] = await Promise.all([
    admin.from("profiles").select("platform_role, active").eq("id", authData.user.id).maybeSingle(),
    admin.from("company_members").select("role, active").eq("company_id", companyId).eq("user_id", authData.user.id).maybeSingle(),
    admin.from("store_members").select("store_id").eq("company_id", companyId).eq("user_id", authData.user.id).eq("active", true),
  ]);
  const platformMaster = profile?.platform_role === "MASTER" && profile?.active;
  const requesterRole = platformMaster ? "MASTER" : membership?.active ? String(membership.role || "MEMBER") : "MEMBER";
  if (!platformMaster && !["ADMIN", "MANAGER"].includes(requesterRole)) throw new Error("Sem permissão para consultar usuários desta empresa.");
  return { admin, userId: authData.user.id, requesterRole, platformMaster, requesterStoreIds: (ownStores || []).map((item: any) => String(item.store_id)) };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const companyId = String(body.companyId || "").trim();
    const storeId = String(body.storeId || "").trim();
    if (!companyId || !storeId) return NextResponse.json({ error: "Informe a empresa e a unidade." }, { status: 400 });

    const { admin, userId, requesterRole, platformMaster, requesterStoreIds } = await authorize(request, companyId);
    if (!platformMaster && requesterRole === "MANAGER" && !requesterStoreIds.includes(storeId)) {
      return NextResponse.json({ error: "Você não possui acesso a esta unidade." }, { status: 403 });
    }

    const [{ data: stores, error: storesError }, { data: companyMembers, error: membersError }] = await Promise.all([
      admin.from("stores").select("id, name, active").eq("company_id", companyId).order("created_at", { ascending: true }),
      admin.from("company_members").select("user_id, role, active, created_at").eq("company_id", companyId).order("created_at", { ascending: true }),
    ]);
    if (storesError) throw storesError;
    if (membersError) throw membersError;

    const visibleStores = platformMaster || requesterRole === "ADMIN"
      ? (stores || [])
      : (stores || []).filter((item: any) => requesterStoreIds.includes(String(item.id)));
    const userIds = (companyMembers || []).map((item: any) => String(item.user_id));
    if (!userIds.length) return NextResponse.json({ users: [], requesterRole, requesterStoreIds, stores: visibleStores });

    const [{ data: profiles, error: profilesError }, { data: storeMembers, error: storeError }] = await Promise.all([
      admin.from("profiles").select("id, username, email, recovery_email, full_name, phone, platform_role, active, created_at").in("id", userIds),
      admin.from("store_members").select("user_id, store_id, role, active").eq("company_id", companyId).in("user_id", userIds),
    ]);
    if (profilesError) throw profilesError;
    if (storeError) throw storeError;

    const profileMap = new Map((profiles || []).map((item: any) => [String(item.id), item]));
    const membershipsByUser = new Map<string, any[]>();
    for (const membership of storeMembers || []) {
      const key = String((membership as any).user_id);
      membershipsByUser.set(key, [...(membershipsByUser.get(key) || []), membership]);
    }

    const users = (companyMembers || []).map((member: any) => {
      const id = String(member.user_id);
      const profile: any = profileMap.get(id) || {};
      const memberships = membershipsByUser.get(id) || [];
      const activeStoreIds = memberships.filter((item: any) => item.active).map((item: any) => String(item.store_id));
      return {
        id,
        fullName: profile.full_name || profile.username || profile.email || "Usuário",
        username: profile.username || "",
        email: profile.recovery_email || profile.email || "",
        phone: profile.phone || "",
        role: String(member.role || "MEMBER"),
        companyActive: Boolean(member.active && profile.active !== false),
        storeActive: activeStoreIds.includes(storeId),
        storeIds: activeStoreIds,
        platformRole: profile.platform_role || "USER",
        createdAt: member.created_at || profile.created_at || null,
      };
    }).filter((item: any) => {
      // Um MASTER da plataforma é uma credencial de infraestrutura e nunca deve aparecer
      // para gestores ou administradores da empresa.
      if (!platformMaster && item.platformRole === "MASTER") return false;
      if (requesterRole === "MANAGER") {
        if (item.id === userId) return true;
        if (item.role !== "MEMBER") return false;
        return item.storeIds.some((id: string) => requesterStoreIds.includes(id));
      }
      return true;
    }).sort((a: any, b: any) => a.fullName.localeCompare(b.fullName, "pt-BR"));

    return NextResponse.json({ users, requesterRole, requesterStoreIds, stores: visibleStores.map((item: any) => ({ id: item.id, name: item.name, active: item.active })) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar os usuários.";
    console.error("Gerivo list users:", error);
    const status = message.includes("Sessão") ? 401 : message.includes("permissão") || message.includes("acesso") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
