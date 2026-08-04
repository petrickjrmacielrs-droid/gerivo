import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../../lib/supabase-admin";

export const runtime = "nodejs";

async function requireMaster(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) throw new Error("Sessão inválida. Entre novamente no Gerivo.");
  const admin = getSupabaseAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) throw new Error("Sessão expirada. Entre novamente no Gerivo.");
  const { data: profile } = await admin.from("profiles").select("platform_role, active").eq("id", authData.user.id).maybeSingle();
  if (profile?.platform_role !== "MASTER" || !profile.active) throw new Error("Somente o MASTER Gerivo pode editar planos e valores.");
  return { admin, userId: authData.user.id };
}

function cleanFeatures(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 20);
}

export async function POST(request: Request) {
  try {
    const { admin, userId } = await requireMaster(request);
    const body = await request.json();
    const planId = String(body.planId || "").trim();
    const name = String(body.name || "").trim();
    if (!planId || name.length < 2) return NextResponse.json({ error: "Informe um plano e um nome válidos." }, { status: 400 });

    const { data: previous, error: previousError } = await admin.from("subscription_plans").select("*").eq("id", planId).maybeSingle();
    if (previousError || !previous) return NextResponse.json({ error: "Plano não encontrado." }, { status: 404 });

    const payload = {
      name,
      monthly_price: Math.max(0, Number(body.monthlyPrice) || 0),
      annual_price: Math.max(0, Number(body.annualPrice) || 0),
      company_limit: Math.max(1, Math.floor(Number(body.companyLimit) || 1)),
      store_limit: Math.max(1, Math.floor(Number(body.storeLimit) || 1)),
      user_limit: Math.max(1, Math.floor(Number(body.userLimit) || 1)),
      storage_gb: Math.max(1, Math.floor(Number(body.storageGb) || Number(previous.storage_gb) || 5)),
      ai_queries_monthly: Math.max(0, Math.floor(Number(body.aiQueriesMonthly) || 0)),
      public_description: String(body.publicDescription || "").trim() || null,
      public_features: cleanFeatures(body.publicFeatures),
      public_cta_label: String(body.publicCtaLabel || "Tenho interesse").trim() || "Tenho interesse",
      recommended: Boolean(body.recommended),
      public_visible: body.publicVisible !== false,
      public_sort_order: Math.max(0, Math.floor(Number(body.publicSortOrder) || 0)),
      updated_at: new Date().toISOString(),
    };

    const { error } = await admin.from("subscription_plans").update(payload).eq("id", planId);
    if (error) throw error;

    if (payload.recommended) {
      await admin.from("subscription_plans").update({ recommended: false, updated_at: new Date().toISOString() }).neq("id", planId);
      await admin.from("subscription_plans").update({ recommended: true, updated_at: new Date().toISOString() }).eq("id", planId);
    }

    await admin.from("audit_logs").insert({
      user_id: userId,
      action: "SUBSCRIPTION_PLAN_UPDATED",
      entity: "subscription_plan",
      entity_id: planId,
      old_value: previous,
      new_value: payload,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Gerivo update plan:", error);
    const message = error instanceof Error ? error.message : "Não foi possível atualizar o plano.";
    return NextResponse.json({ error: message }, { status: message.includes("Sessão") ? 401 : message.includes("MASTER") ? 403 : 500 });
  }
}
