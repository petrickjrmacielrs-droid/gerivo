import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../lib/supabase-admin";
import { apiErrorMessage, isMissingColumnError } from "../../../../lib/api-error";

export const runtime = "nodejs";

async function authorize(request: Request, companyId: string) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) throw new Error("Sessão inválida. Entre novamente no Gerivo.");
  const admin = getSupabaseAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) throw new Error("Sessão expirada. Entre novamente no Gerivo.");
  const [{ data: profile }, { data: membership }, { data: ownStores }, { data: company }] = await Promise.all([
    admin.from("profiles").select("platform_role, active").eq("id", authData.user.id).maybeSingle(),
    admin.from("company_members").select("role, active").eq("company_id", companyId).eq("user_id", authData.user.id).maybeSingle(),
    admin.from("store_members").select("store_id").eq("company_id", companyId).eq("user_id", authData.user.id).eq("active", true),
    admin.from("companies").select("id, group_id").eq("id", companyId).maybeSingle(),
  ]);
  const platformMaster = profile?.platform_role === "MASTER" && profile?.active;
  const requesterRole = platformMaster ? "MASTER" : membership?.active ? String(membership.role || "MEMBER") : "MEMBER";
  if (!platformMaster && !["ADMIN", "MANAGER"].includes(requesterRole)) throw new Error("Sem permissão para consultar usuários desta empresa.");
  return { admin, userId: authData.user.id, requesterRole, platformMaster, requesterStoreIds: (ownStores || []).map((item: any) => String(item.store_id)), groupId: company?.group_id || "" };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const companyId = String(body.companyId || "").trim();
    const storeId = String(body.storeId || "").trim();
    if (!companyId || !storeId) return NextResponse.json({ error: "Informe a empresa e a unidade." }, { status: 400 });

    const { admin, userId, requesterRole, platformMaster, requesterStoreIds, groupId } = await authorize(request, companyId);
    if (!platformMaster && requesterRole === "MANAGER" && !requesterStoreIds.includes(storeId)) return NextResponse.json({ error: "Você não possui acesso a esta unidade." }, { status: 403 });

    const companyIds = platformMaster && groupId
      ? ((await admin.from("companies").select("id").eq("group_id", groupId)).data || []).map((item: any) => String(item.id))
      : [companyId];
    const [{ data: stores, error: storesError }, { data: companyMembers, error: membersError }] = await Promise.all([
      admin.from("stores").select("id, name, active, company_id, companies(name)").in("company_id", companyIds).order("created_at", { ascending: true }),
      admin.from("company_members").select("company_id, user_id, role, active, created_at").in("company_id", companyIds).order("created_at", { ascending: true }),
    ]);
    if (storesError) throw storesError;
    if (membersError) throw membersError;

    const visibleStores = platformMaster || requesterRole === "ADMIN" ? (stores || []) : (stores || []).filter((item: any) => requesterStoreIds.includes(String(item.id)));
    const userIds: string[] = Array.from(new Set<string>((companyMembers || []).map((item: any) => String(item.user_id))));
    if (!userIds.length) return NextResponse.json({ users: [], requesterRole, requesterStoreIds, stores: visibleStores });

    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("id, username, email, recovery_email, full_name, phone, platform_role, active, created_at")
      .in("id", userIds);
    if (profilesError) throw profilesError;

    let storeMembers: any[] = [];
    const extendedStoreResult = await admin
      .from("store_members")
      .select("company_id, user_id, store_id, role, active, job_function, custom_job_function, available_as_consultant")
      .in("company_id", companyIds)
      .in("user_id", userIds);
    if (extendedStoreResult.error && isMissingColumnError(extendedStoreResult.error)) {
      const basicStoreResult = await admin
        .from("store_members")
        .select("company_id, user_id, store_id, role, active")
        .in("company_id", companyIds)
        .in("user_id", userIds);
      if (basicStoreResult.error) throw basicStoreResult.error;
      storeMembers = (basicStoreResult.data || []).map((item: any) => ({
        ...item,
        job_function: "OUTRO",
        custom_job_function: "",
        available_as_consultant: false,
      }));
    } else {
      if (extendedStoreResult.error) throw extendedStoreResult.error;
      storeMembers = extendedStoreResult.data || [];
    }

    const profileMap = new Map((profiles || []).map((item: any) => [String(item.id), item]));
    const membershipsByUser = new Map<string, any[]>();
    for (const membership of storeMembers || []) {
      const key = String((membership as any).user_id);
      membershipsByUser.set(key, [...(membershipsByUser.get(key) || []), membership]);
    }
    const companyMembershipsByUser = new Map<string, any[]>();
    for (const membership of companyMembers || []) {
      const key = String((membership as any).user_id);
      companyMembershipsByUser.set(key, [...(companyMembershipsByUser.get(key) || []), membership]);
    }

    const users = userIds.map((id) => {
      const profile: any = profileMap.get(id) || {};
      const memberships = membershipsByUser.get(id) || [];
      const companyMemberships = companyMembershipsByUser.get(id) || [];
      const activeStores = memberships.filter((item: any) => item.active);
      const primaryMembership = activeStores.find((item: any) => String(item.company_id) === companyId) || activeStores[0] || {};
      const currentCompanyMember = companyMemberships.find((item: any) => String(item.company_id) === companyId) || companyMemberships[0] || {};
      return {
        id,
        fullName: profile.full_name || profile.username || profile.email || "Usuário",
        username: profile.username || "",
        email: profile.recovery_email || profile.email || "",
        phone: profile.phone || "",
        role: String(currentCompanyMember.role || primaryMembership.role || "MEMBER"),
        companyActive: Boolean(companyMemberships.some((item: any) => item.active) && profile.active !== false),
        storeActive: activeStores.some((item: any) => String(item.store_id) === storeId),
        storeIds: activeStores.map((item: any) => String(item.store_id)),
        companyIds: companyMemberships.filter((item: any) => item.active).map((item: any) => String(item.company_id)),
        platformRole: profile.platform_role || "USER",
        jobFunction: String(primaryMembership.job_function || "OUTRO"),
        customJobFunction: String(primaryMembership.custom_job_function || ""),
        availableAsConsultant: Boolean(primaryMembership.available_as_consultant),
        createdAt: currentCompanyMember.created_at || profile.created_at || null,
      };
    }).filter((item: any) => {
      if (!platformMaster && item.platformRole === "MASTER") return false;
      if (requesterRole === "MANAGER") {
        if (item.id === userId) return true;
        if (item.role !== "MEMBER") return false;
        return item.storeIds.some((id: string) => requesterStoreIds.includes(id));
      }
      return true;
    }).sort((a: any, b: any) => a.fullName.localeCompare(b.fullName, "pt-BR"));

    return NextResponse.json({
      users,
      requesterRole,
      requesterStoreIds,
      stores: visibleStores.map((item: any) => {
        const company: any = Array.isArray(item.companies) ? item.companies[0] : item.companies;
        return { id: item.id, name: item.name, active: item.active, companyId: item.company_id, companyName: company?.name || "Empresa" };
      }),
    });
  } catch (error) {
    console.error("Gerivo list users:", error);
    const message = apiErrorMessage(error, "Não foi possível carregar os usuários.");
    const status = message.includes("Sessão") ? 401 : message.includes("permissão") || message.includes("acesso") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
