import { NextResponse } from "next/server";
import { getSupabaseAdminClient, normalizeUsername } from "../../../../lib/supabase-admin";
import { apiErrorMessage, isMissingColumnError } from "../../../../lib/api-error";
import { getEffectiveSubscription } from "../../../../lib/effective-subscription";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let createdUserId = "";
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    const admin = getSupabaseAdminClient();
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });

    const body = await request.json();
    const companyId = String(body.companyId || "").trim();
    const storeIds: string[] = Array.isArray(body.storeIds)
      ? Array.from(new Set<string>(body.storeIds.map((value: unknown) => String(value)).filter(Boolean)))
      : [];
    const username = normalizeUsername(String(body.username || ""));
    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const phone = String(body.phone || "").trim();
    const role = ["ADMIN", "MANAGER", "MEMBER"].includes(body.role) ? body.role : "MEMBER";
    const jobFunction = String(body.jobFunction || "OUTRO").trim().toUpperCase();
    const customJobFunction = String(body.customJobFunction || "").trim() || null;
    const availableAsConsultant = body.availableAsConsultant === true || jobFunction === "CONSULTOR_SERVICOS";
    if (!companyId || !username || !fullName || !email || password.length < 8 || storeIds.length === 0) {
      return NextResponse.json({ error: "Preencha nome, usuário, e-mail, senha temporária e ao menos uma unidade." }, { status: 400 });
    }

    const [{ data: requesterProfile, error: requesterProfileError }, { data: requesterMember, error: requesterMemberError }, { data: anchorCompany, error: anchorCompanyError }] = await Promise.all([
      admin.from("profiles").select("platform_role, active").eq("id", authData.user.id).maybeSingle(),
      admin.from("company_members").select("role, active").eq("company_id", companyId).eq("user_id", authData.user.id).maybeSingle(),
      admin.from("companies").select("id, group_id").eq("id", companyId).maybeSingle(),
    ]);
    if (requesterProfileError) throw requesterProfileError;
    if (requesterMemberError) throw requesterMemberError;
    if (anchorCompanyError) throw anchorCompanyError;

    const platformMaster = requesterProfile?.platform_role === "MASTER" && requesterProfile?.active;
    const requesterRole = requesterMember?.active ? String(requesterMember.role || "MEMBER") : "MEMBER";
    const companyAdmin = ["MASTER", "ADMIN"].includes(requesterRole);
    const companyManager = requesterRole === "MANAGER";
    if (!platformMaster && !companyAdmin && !companyManager) return NextResponse.json({ error: "Sem permissão para criar usuários." }, { status: 403 });
    if (companyManager && role !== "MEMBER") return NextResponse.json({ error: "Gestores podem criar somente usuários do perfil Usuário." }, { status: 403 });

    const allowedCompanyIds = platformMaster && anchorCompany?.group_id
      ? ((await admin.from("companies").select("id").eq("group_id", anchorCompany.group_id)).data || []).map((item: any) => String(item.id))
      : [companyId];
    const { data: allStores, error: storesError } = await admin.from("stores").select("id, company_id").in("company_id", allowedCompanyIds).in("id", storeIds);
    if (storesError) throw storesError;
    const validStores = allStores || [];
    if (validStores.length !== storeIds.length) return NextResponse.json({ error: "Uma das unidades selecionadas não pertence ao escopo permitido." }, { status: 400 });
    if (companyManager) {
      const { data: ownStores, error: ownStoresError } = await admin.from("store_members").select("store_id").eq("user_id", authData.user.id).eq("company_id", companyId).eq("active", true);
      if (ownStoresError) throw ownStoresError;
      const allowed = new Set((ownStores || []).map((item: any) => String(item.store_id)));
      if (storeIds.some((id: string) => !allowed.has(id))) return NextResponse.json({ error: "O gestor só pode criar usuários nas unidades em que possui acesso." }, { status: 403 });
    }

    const { count: usernameCount, error: usernameError } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("username_normalized", username);
    if (usernameError) throw usernameError;
    const { subscription, planScope, group } = await getEffectiveSubscription(admin, companyId);
    if ((usernameCount || 0) > 0) return NextResponse.json({ error: "Este usuário já está em uso." }, { status: 409 });
    if (!platformMaster && (!subscription || !["ACTIVE", "GRACE", "READ_ONLY", "DEMO"].includes(String(subscription.status || "")))) return NextResponse.json({ error: "A assinatura da empresa não está ativa." }, { status: 403 });

    if (!platformMaster && subscription?.user_limit) {
      let limitCompanyIds = [companyId];
      if (planScope === "GROUP" && group?.id) {
        const { data: groupCompanies, error: groupCompaniesError } = await admin.from("companies").select("id").eq("group_id", group.id);
        if (groupCompaniesError) throw groupCompaniesError;
        limitCompanyIds = (groupCompanies || []).map((item: { id: string }) => String(item.id));
      }
      const { data: activeMembers, error: activeUsersError } = await admin
        .from("company_members")
        .select("user_id")
        .in("company_id", limitCompanyIds)
        .eq("active", true);
      if (activeUsersError) throw activeUsersError;
      const activeUsers = new Set((activeMembers || []).map((item: { user_id: string }) => String(item.user_id))).size;
      if (activeUsers >= Number(subscription.user_limit)) {
        return NextResponse.json({ error: `O limite de ${subscription.user_limit} usuário(s) ${planScope === "GROUP" ? "do grupo" : "do plano"} foi atingido.` }, { status: 409 });
      }
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, username },
    });
    if (createError || !created.user) return NextResponse.json({ error: createError?.message || "Falha ao criar usuário." }, { status: 400 });
    createdUserId = created.user.id;

    const profileResult = await admin.from("profiles").upsert({
      id: createdUserId,
      full_name: fullName,
      username,
      username_normalized: username,
      email,
      recovery_email: email,
      phone: phone || null,
      must_change_password: true,
      active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });
    if (profileResult.error) throw profileResult.error;

    const selectedCompanyIds = Array.from(new Set(validStores.map((item: any) => String(item.company_id))));
    const companyMemberResult = await admin.from("company_members").upsert(
      selectedCompanyIds.map((id) => ({ company_id: id, user_id: createdUserId, role, active: true })),
      { onConflict: "company_id,user_id" },
    );
    if (companyMemberResult.error) throw companyMemberResult.error;

    const storeRows = validStores.map((item: any) => ({
      store_id: item.id,
      company_id: item.company_id,
      user_id: createdUserId,
      role,
      active: true,
      job_function: jobFunction,
      custom_job_function: customJobFunction,
      available_as_consultant: availableAsConsultant,
    }));
    const storeMemberResult = await admin.from("store_members").upsert(storeRows, { onConflict: "store_id,user_id" });
    if (storeMemberResult.error) {
      if (isMissingColumnError(storeMemberResult.error)) {
        throw new Error("O banco de dados está desatualizado para funções e consultores. Execute o SQL de reparo da v1.7.13.1 no Supabase.");
      }
      throw storeMemberResult.error;
    }

    const auditResult = await admin.from("audit_logs").insert({
      company_id: companyId,
      user_id: authData.user.id,
      action: "USER_CREATED",
      entity: "profile",
      entity_id: createdUserId,
      new_value: { fullName, username, email, phone, role, storeIds, jobFunction, availableAsConsultant },
    });
    if (auditResult.error) console.error("Gerivo user audit:", auditResult.error);

    return NextResponse.json({ id: createdUserId, username });
  } catch (error) {
    console.error("Gerivo create user:", error);
    if (createdUserId) {
      try {
        const admin = getSupabaseAdminClient();
        await admin.auth.admin.deleteUser(createdUserId);
      } catch (rollbackError) {
        console.error("Gerivo create user rollback:", rollbackError);
      }
    }
    const message = apiErrorMessage(error, "Não foi possível criar o usuário.");
    const status = message.includes("Sessão") ? 401
      : message.includes("permissão") || message.includes("Gestores") || message.includes("assinatura") ? 403
      : message.includes("limite") || message.includes("uso") ? 409
      : message.includes("Preencha") || message.includes("unidade") ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
