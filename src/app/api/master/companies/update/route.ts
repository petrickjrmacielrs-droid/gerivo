import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../../lib/supabase-admin";

export const runtime = "nodejs";

const ALLOWED_SEGMENTS = new Set(["OFICINA", "CONCESSIONARIA", "VAREJO", "CONFEITARIA", "SALAO_BELEZA", "ESTETICA_AUTOMOTIVA", "DELIVERY", "SERVICOS", "OUTRO"]);
const ALLOWED_STATUS = new Set(["DRAFT", "AWAITING_ACTIVATION", "PENDING_PAYMENT", "ACTIVE", "GRACE", "READ_ONLY", "SUSPENDED", "CANCELED", "EXPIRED", "DEMO"]);

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
    const hasStatusChange = body.status !== undefined && body.status !== null && String(body.status).trim() !== "";
    const requestedStatus = String(body.status || "").toUpperCase();
    if (hasStatusChange && !ALLOWED_STATUS.has(requestedStatus)) return NextResponse.json({ error: "Situação da empresa inválida." }, { status: 400 });
    const storeId = String(body.storeId || "").trim();
    const storeName = String(body.storeName || "").trim();

    if (!companyId || name.length < 2) return NextResponse.json({ error: "Informe a empresa e o nome cadastral." }, { status: 400 });
    const { data: previous, error: previousError } = await admin.from("companies").select("id, name, document, segment, status, active, group_id").eq("id", companyId).maybeSingle();
    if (previousError || !previous) return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });

    const status = hasStatusChange ? requestedStatus : String(previous.status || "ACTIVE");
    const active = hasStatusChange ? ["ACTIVE", "GRACE", "READ_ONLY", "DEMO"].includes(status) : Boolean(previous.active);
    const companyPatch: Record<string, unknown> = { name, document, segment, updated_at: new Date().toISOString() };
    if (hasStatusChange) Object.assign(companyPatch, { status, active });
    const { error: companyError } = await admin.from("companies").update(companyPatch).eq("id", companyId);
    if (companyError) throw companyError;
    if (storeId && storeName) {
      const storePatch: Record<string, unknown> = { name: storeName, updated_at: new Date().toISOString() };
      if (hasStatusChange) storePatch.active = active;
      const { error: storeError } = await admin.from("stores").update(storePatch).eq("id", storeId).eq("company_id", companyId);
      if (storeError) throw storeError;
      await admin.from("store_settings").update({ display_name: name, updated_by: userId, updated_at: new Date().toISOString() }).eq("store_id", storeId);
    } else if (hasStatusChange) {
      await admin.from("stores").update({ active, updated_at: new Date().toISOString() }).eq("company_id", companyId);
    }

    // Alterar nome, CNPJ ou unidade não pode reclassificar um grupo DEMO/GRACE/etc. como ACTIVE.
    // Quando há alteração explícita de status sem uma contratação, só agregamos o grupo se ele
    // estiver configurado com planos por empresa; grupos GROUP são governados pelo contrato compartilhado.
    if (hasStatusChange && previous.group_id) {
      const { data: group, error: groupError } = await admin.from("business_groups").select("plan_scope").eq("id", previous.group_id).maybeSingle();
      if (groupError) throw groupError;
      if (group?.plan_scope === "COMPANY") {
        const { data: siblings, error: siblingsError } = await admin.from("companies").select("status, active").eq("group_id", previous.group_id);
        if (siblingsError) throw siblingsError;
        const anyActive = (siblings || []).some((item: { active: boolean }) => Boolean(item.active));
        const groupStatus = anyActive ? "ACTIVE" : String((siblings || []).find((item: { status: string }) => item.status)?.status || status);
        const { error: groupUpdateError } = await admin.from("business_groups").update({ active: anyActive, status: groupStatus, updated_at: new Date().toISOString() }).eq("id", previous.group_id);
        if (groupUpdateError) throw groupUpdateError;
      }
    }

    await admin.from("audit_logs").insert({ company_id: companyId, user_id: userId, action: "COMPANY_UPDATED", entity: "company", entity_id: companyId, old_value: previous, new_value: { name, document, segment, ...(hasStatusChange ? { status, active } : {}), storeId, storeName } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Gerivo update company:", error);
    const message = error instanceof Error ? error.message : "Não foi possível editar a empresa.";
    return NextResponse.json({ error: message }, { status: message.includes("Sessão") ? 401 : message.includes("MASTER") ? 403 : 500 });
  }
}
