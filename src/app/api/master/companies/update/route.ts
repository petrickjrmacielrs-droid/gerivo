import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../../lib/supabase-admin";

export const runtime = "nodejs";

const ALLOWED_SEGMENTS = new Set(["OFICINA", "CONCESSIONARIA", "VAREJO", "CONFEITARIA", "SALAO_BELEZA", "ESTETICA_AUTOMOTIVA", "DELIVERY", "SERVICOS", "OUTRO"]);
const ALLOWED_STATUS = new Set(["DRAFT", "AWAITING_ACTIVATION", "ACTIVE", "GRACE", "READ_ONLY", "SUSPENDED", "CANCELED", "EXPIRED", "DEMO"]);

async function requireMaster(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) throw new Error("Sessão inválida. Entre novamente no Gerivo.");
  const admin = getSupabaseAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) throw new Error("Sessão expirada. Entre novamente no Gerivo.");
  const { data: profile } = await admin.from("profiles").select("platform_role, active").eq("id", authData.user.id).maybeSingle();
  if (profile?.platform_role !== "MASTER" || !profile.active) throw new Error("Somente o MASTER Gerivo pode editar empresas.");
  return { admin, userId: authData.user.id };
}

export async function POST(request: Request) {
  try {
    const { admin, userId } = await requireMaster(request);
    const body = await request.json();
    const companyId = String(body.companyId || "").trim();
    const name = String(body.name || "").trim();
    const document = String(body.document || "").trim() || null;
    const segmentInput = String(body.segment || "OUTRO").toUpperCase();
    const segment = ALLOWED_SEGMENTS.has(segmentInput) ? segmentInput : "OUTRO";
    const statusInput = String(body.status || "ACTIVE").toUpperCase();
    const status = ALLOWED_STATUS.has(statusInput) ? statusInput : "ACTIVE";
    const storeId = String(body.storeId || "").trim();
    const storeName = String(body.storeName || "").trim();
    const active = ["ACTIVE", "GRACE", "READ_ONLY", "DEMO"].includes(status);

    if (!companyId || name.length < 2) return NextResponse.json({ error: "Informe a empresa e o nome cadastral." }, { status: 400 });
    const { data: previous, error: previousError } = await admin.from("companies").select("id, name, document, segment, status, active, group_id").eq("id", companyId).maybeSingle();
    if (previousError || !previous) return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });

    const { error: companyError } = await admin.from("companies").update({ name, document, segment, status, active, updated_at: new Date().toISOString() }).eq("id", companyId);
    if (companyError) throw companyError;
    if (storeId && storeName) {
      const { error: storeError } = await admin.from("stores").update({ name: storeName, active, updated_at: new Date().toISOString() }).eq("id", storeId).eq("company_id", companyId);
      if (storeError) throw storeError;
      await admin.from("store_settings").update({ display_name: name, updated_by: userId, updated_at: new Date().toISOString() }).eq("store_id", storeId);
    } else {
      await admin.from("stores").update({ active, updated_at: new Date().toISOString() }).eq("company_id", companyId);
    }

    if (previous.group_id) {
      const { data: siblings } = await admin.from("companies").select("status, active").eq("group_id", previous.group_id);
      const anyActive = (siblings || []).some((item: any) => item.active) || active;
      const groupStatus = anyActive ? "ACTIVE" : status;
      await admin.from("business_groups").update({ active: anyActive, status: groupStatus, updated_at: new Date().toISOString() }).eq("id", previous.group_id);
    }

    await admin.from("audit_logs").insert({ company_id: companyId, user_id: userId, action: "COMPANY_UPDATED", entity: "company", entity_id: companyId, old_value: previous, new_value: { name, document, segment, status, active, storeId, storeName } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Gerivo update company:", error);
    const message = error instanceof Error ? error.message : "Não foi possível editar a empresa.";
    return NextResponse.json({ error: message }, { status: message.includes("Sessão") ? 401 : message.includes("MASTER") ? 403 : 500 });
  }
}
