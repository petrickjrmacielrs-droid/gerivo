import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../lib/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    const admin = getSupabaseAdminClient();
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
    const body = await request.json();
    const storeId = String(body.storeId || "").trim();
    if (!storeId) return NextResponse.json({ error: "Informe a unidade." }, { status: 400 });
    const [{ data: profile }, { data: membership }, { data: store }] = await Promise.all([
      admin.from("profiles").select("platform_role, active").eq("id", authData.user.id).maybeSingle(),
      admin.from("store_members").select("active").eq("store_id", storeId).eq("user_id", authData.user.id).maybeSingle(),
      admin.from("stores").select("id, company_id").eq("id", storeId).maybeSingle(),
    ]);
    if (!store) return NextResponse.json({ error: "Unidade não encontrada." }, { status: 404 });
    const platformMaster = profile?.platform_role === "MASTER" && profile.active;
    if (!platformMaster && !membership?.active) return NextResponse.json({ error: "Sem acesso à unidade." }, { status: 403 });
    const { data: members, error } = await admin.from("store_members")
      .select("user_id, job_function, custom_job_function, available_as_consultant")
      .eq("store_id", storeId)
      .eq("active", true)
      .eq("available_as_consultant", true);
    if (error) throw error;
    const userIds = Array.from(new Set((members || []).map((item: any) => String(item.user_id)).filter(Boolean)));
    const { data: profiles, error: profilesError } = userIds.length
      ? await admin.from("profiles").select("id, full_name, username, active").in("id", userIds).eq("active", true)
      : { data: [], error: null } as any;
    if (profilesError) throw profilesError;
    const profileById = new Map<string, any>((profiles || []).map((item: any) => [String(item.id), item]));
    const consultants = (members || []).map((item: any) => {
      const user = profileById.get(String(item.user_id));
      return { id: String(item.user_id), name: user?.full_name || user?.username || "Consultor", jobFunction: item.job_function, customJobFunction: item.custom_job_function || "" };
    }).filter((item: any) => profileById.has(item.id));
    return NextResponse.json({ consultants });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar os consultores.";
    return NextResponse.json({ error: message }, { status: message.includes("Sessão") ? 401 : message.includes("acesso") ? 403 : 500 });
  }
}
