import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireMaster(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) throw new Error("Sessão inválida. Entre novamente no Gerivo.");

  const admin = getSupabaseAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) throw new Error("Sessão expirada. Entre novamente no Gerivo.");

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("platform_role, active")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (profileError) throw profileError;
  if (profile?.platform_role !== "MASTER" || !profile.active) {
    throw new Error("Somente o MASTER Gerivo pode acessar a Central de empresas.");
  }

  return admin;
}

export async function GET(request: Request) {
  try {
    const admin = await requireMaster(request);

    const [plansResult, subscriptionsResult, groupsResult, historiesResult] = await Promise.all([
      admin.from("subscription_plans").select("*").eq("active", true).order("sort_order"),
      admin.from("company_subscriptions").select("*").order("created_at", { ascending: false }),
      admin
        .from("business_groups")
        .select("id, name, status, active, plan_scope, companies(id, name, document, segment, status, active, stores(id, name, public_code, active))")
        .order("name"),
      admin.from("company_subscription_history").select("*").order("changed_at", { ascending: false }).limit(300),
    ]);

    if (plansResult.error) throw plansResult.error;
    if (subscriptionsResult.error) throw subscriptionsResult.error;
    if (groupsResult.error) throw groupsResult.error;
    if (historiesResult.error) throw historiesResult.error;

    return NextResponse.json(
      {
        plans: plansResult.data || [],
        subscriptions: subscriptionsResult.data || [],
        groups: groupsResult.data || [],
        histories: historiesResult.data || [],
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Gerivo MASTER control-center:", error);
    const message = error instanceof Error ? error.message : "Não foi possível carregar a Central de empresas.";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Sessão") ? 401 : message.includes("MASTER") ? 403 : 500 },
    );
  }
}
