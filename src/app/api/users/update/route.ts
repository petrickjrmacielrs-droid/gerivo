import { NextResponse } from "next/server";
import { getSupabaseAdminClient, normalizeUsername } from "../../../../lib/supabase-admin";

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
  if (!platformMaster && !["ADMIN", "MANAGER"].includes(requesterRole)) throw new Error("Sem permissão para editar usuários desta empresa.");
  return { admin, requesterId: authData.user.id, requesterRole, platformMaster, requesterStoreIds: (ownStores || []).map((item: any) => String(item.store_id)), groupId: company?.group_id || "" };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const companyId = String(body.companyId || "").trim();
    const userId = String(body.userId || "").trim();
    const fullName = String(body.fullName || "").trim();
    const username = normalizeUsername(String(body.username || ""));
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const password = String(body.password || "");
    const active = body.active !== false;
    const requestedStoreIds: string[] = Array.isArray(body.storeIds) ? Array.from(new Set<string>(body.storeIds.map((value: unknown) => String(value)).filter(Boolean))) : [];
    const role = ["ADMIN", "MANAGER", "MEMBER"].includes(body.role) ? String(body.role) : "MEMBER";
    const jobFunction = String(body.jobFunction || "OUTRO").trim().toUpperCase();
    const customJobFunction = String(body.customJobFunction || "").trim() || null;
    const availableAsConsultant = body.availableAsConsultant === true || jobFunction === "CONSULTOR_SERVICOS";
    if (!companyId || !userId || fullName.length < 2 || username.length < 4 || !email.includes("@") || requestedStoreIds.length === 0) return NextResponse.json({ error: "Preencha nome, usuário, e-mail e ao menos uma unidade." }, { status: 400 });
    if (password && password.length < 8) return NextResponse.json({ error: "A nova senha deve ter no mínimo 8 caracteres." }, { status: 400 });

    const { admin, requesterId, requesterRole, platformMaster, requesterStoreIds, groupId } = await authorize(request, companyId);
    const allowedCompanyIds: string[] = platformMaster && groupId
      ? ((await admin.from("companies").select("id").eq("group_id", groupId)).data || []).map((item: any) => String(item.id))
      : [companyId];
    const [{ data: targetProfile }, { data: targetCompanyMembers }, { data: targetStores }, { data: validStores }] = await Promise.all([
      admin.from("profiles").select("username, email, recovery_email, full_name, phone, platform_role, active").eq("id", userId).maybeSingle(),
      admin.from("company_members").select("company_id, role, active").in("company_id", allowedCompanyIds).eq("user_id", userId),
      admin.from("store_members").select("company_id, store_id, active, role, job_function, custom_job_function, available_as_consultant").in("company_id", allowedCompanyIds).eq("user_id", userId),
      admin.from("stores").select("id, company_id").in("company_id", allowedCompanyIds),
    ]);
    if (!targetProfile || !(targetCompanyMembers || []).length) return NextResponse.json({ error: "Usuário não encontrado no escopo autorizado." }, { status: 404 });
    if (targetProfile.platform_role === "MASTER" && !platformMaster) return NextResponse.json({ error: "Essa credencial é reservada ao MASTER Gerivo." }, { status: 403 });
    if (requesterId === userId && !active) return NextResponse.json({ error: "Você não pode desativar o próprio acesso." }, { status: 400 });

    const validStoreMap = new Map<string, string>((validStores || []).map((item: any) => [String(item.id), String(item.company_id)]));
    if (requestedStoreIds.some((id) => !validStoreMap.has(id))) return NextResponse.json({ error: "Uma das unidades selecionadas não pertence ao escopo permitido." }, { status: 400 });
    if (!platformMaster && requesterRole === "MANAGER") {
      const currentRole = String((targetCompanyMembers || []).find((item: any) => String(item.company_id) === companyId)?.role || "MEMBER");
      const currentTargetIds = (targetStores || []).filter((item: any) => item.active).map((item: any) => String(item.store_id));
      if (currentRole !== "MEMBER" || role !== "MEMBER") return NextResponse.json({ error: "Gestores podem editar somente usuários do perfil Usuário." }, { status: 403 });
      if (!currentTargetIds.some((id: string) => requesterStoreIds.includes(id))) return NextResponse.json({ error: "O usuário não pertence a uma unidade administrada por você." }, { status: 403 });
      if (requestedStoreIds.some((id: string) => !requesterStoreIds.includes(id))) return NextResponse.json({ error: "Você só pode liberar as unidades em que possui acesso." }, { status: 403 });
      if (password) return NextResponse.json({ error: "Gestores devem usar a redefinição de senha por e-mail." }, { status: 403 });
    }

    const { count: duplicateUsername } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("username_normalized", username).neq("id", userId);
    if ((duplicateUsername || 0) > 0) return NextResponse.json({ error: "Este nome de usuário já está em uso." }, { status: 409 });

    const authPatch: { email?: string; password?: string; email_confirm?: boolean; user_metadata?: Record<string, string> } = { user_metadata: { full_name: fullName, username } };
    const oldEmail = String(targetProfile.recovery_email || targetProfile.email || "").toLowerCase();
    if (email !== oldEmail) { authPatch.email = email; authPatch.email_confirm = true; }
    if (password) authPatch.password = password;
    const { error: authUpdateError } = await admin.auth.admin.updateUserById(userId, authPatch);
    if (authUpdateError) return NextResponse.json({ error: authUpdateError.message }, { status: 400 });

    const profilePatch: Record<string, unknown> = { full_name: fullName, username, username_normalized: username, email, recovery_email: email, phone: phone || null, active, updated_at: new Date().toISOString() };
    if (password) profilePatch.must_change_password = true;
    const { error: profileError } = await admin.from("profiles").update(profilePatch).eq("id", userId);
    if (profileError) throw profileError;

    const selectedCompanyIds: string[] = Array.from(new Set<string>(requestedStoreIds.map((id) => validStoreMap.get(id) || "").filter(Boolean)));
    const companyRows = allowedCompanyIds.map((id) => ({ company_id: id, user_id: userId, role, active: active && selectedCompanyIds.includes(id) }));
    const { error: companyMemberError } = await admin.from("company_members").upsert(companyRows);
    if (companyMemberError) throw companyMemberError;

    const storeRows = Array.from(validStoreMap.entries()).map(([storeId, selectedCompanyId]) => ({ company_id: selectedCompanyId, store_id: storeId, user_id: userId, role, active: active && requestedStoreIds.includes(storeId), job_function: jobFunction, custom_job_function: customJobFunction, available_as_consultant: availableAsConsultant }));
    const { error: storeMemberError } = await admin.from("store_members").upsert(storeRows);
    if (storeMemberError) throw storeMemberError;

    await admin.from("audit_logs").insert({ company_id: companyId, user_id: requesterId, action: "USER_UPDATED", entity: "profile", entity_id: userId, old_value: { profile: targetProfile, companies: targetCompanyMembers, stores: targetStores }, new_value: { fullName, username, email, phone, role, active, storeIds: requestedStoreIds, jobFunction, customJobFunction, availableAsConsultant } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível editar o usuário.";
    const status = message.includes("Sessão") ? 401 : message.includes("permissão") || message.includes("reservada") || message.includes("Gestores") || message.includes("acesso") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
