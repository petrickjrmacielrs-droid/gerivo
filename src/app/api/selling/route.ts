import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireOperationAccess(request: Request, companyId: string, storeId: string) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) throw new Error("Sessão inválida. Entre novamente no Gerivo.");
  const admin = getSupabaseAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) throw new Error("Sessão expirada. Entre novamente no Gerivo.");
  const { data: profile } = await admin.from("profiles").select("platform_role,active").eq("id", authData.user.id).maybeSingle();
  if (!profile?.active) throw new Error("Usuário inativo.");
  if (profile.platform_role !== "MASTER") {
    const { data: member, error } = await admin.from("store_members").select("store_id").eq("store_id", storeId).eq("company_id", companyId).eq("user_id", authData.user.id).eq("active", true).maybeSingle();
    if (error || !member) throw new Error("Você não possui acesso a esta unidade.");
  }
  const { data: settings, error: settingsError } = await admin.from("store_settings").select("modules").eq("store_id", storeId).eq("company_id", companyId).maybeSingle();
  if (settingsError) throw settingsError;
  if (!settings?.modules?.SELLING && profile.platform_role !== "MASTER") throw new Error("O módulo Selling não está contratado para esta operação.");
  const { data: company, error: companyError } = await admin.from("companies").select("id,group_id").eq("id", companyId).maybeSingle();
  if (companyError || !company) throw new Error("Empresa não encontrada.");
  return { admin, userId: authData.user.id, groupId: company.group_id || null };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const companyId = String(url.searchParams.get("companyId") || "");
    const storeId = String(url.searchParams.get("storeId") || "");
    if (!companyId || !storeId) return NextResponse.json({ error: "Empresa e unidade são obrigatórias." }, { status: 400 });
    const { admin, groupId } = await requireOperationAccess(request, companyId, storeId);

    const [revisionsResult, revisionItemsResult, packagesResult, packageItemsResult, packageModelsResult, packageRevisionsResult, paymentSettingsResult] = await Promise.all([
      admin.from("selling_revision_templates").select("*").eq("active", true).eq("fuel_type", "FLEX").order("model_name").order("revision_km"),
      admin.from("selling_revision_items").select("*").order("display_order"),
      admin.from("selling_packages").select("*").eq("active", true).eq("published", true).eq("fuel_type", "FLEX").order("display_order"),
      admin.from("selling_package_items").select("*").order("display_order"),
      admin.from("selling_package_models").select("*"),
      admin.from("selling_package_revisions").select("*"),
      groupId ? admin.from("selling_payment_settings").select("*").eq("group_id", groupId).maybeSingle() : Promise.resolve({ data: null, error: null } as any),
    ]);
    for (const result of [revisionsResult, revisionItemsResult, packagesResult, packageItemsResult, packageModelsResult, packageRevisionsResult, paymentSettingsResult]) if (result.error) throw result.error;

    const revisionItems = revisionItemsResult.data || [];
    const packageItems = packageItemsResult.data || [];
    const packageModels = packageModelsResult.data || [];
    const packageRevisions = packageRevisionsResult.data || [];
    const packages = (packagesResult.data || []).filter((pkg: any) => {
      if (pkg.target_company_id) return pkg.target_company_id === companyId;
      if (pkg.target_group_id) return pkg.target_group_id === groupId;
      return true;
    });

    return NextResponse.json({
      revisions: (revisionsResult.data || []).map((revision: any) => ({ ...revision, items: revisionItems.filter((item: any) => item.revision_id === revision.id) })),
      packages: packages.map((pkg: any) => ({
        ...pkg,
        items: packageItems.filter((item: any) => item.package_id === pkg.id),
        model_keys: packageModels.filter((item: any) => item.package_id === pkg.id).map((item: any) => item.model_key),
        revision_kms: packageRevisions.filter((item: any) => item.package_id === pkg.id).map((item: any) => Number(item.revision_km)),
      })),
      paymentSettings: paymentSettingsResult.data || {
        group_id: groupId,
        allow_pix: true,
        allow_debit: true,
        allow_credit: true,
        installment_rules: [
          { min: 0, max: 250, max_installments: 1 },
          { min: 250.01, max: 500, max_installments: 2 },
          { min: 500.01, max: 1000, max_installments: 3 },
          { min: 1000.01, max: null, max_installments: 4 },
        ],
      },
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Gerivo Selling operation:", error);
    const message = error instanceof Error ? error.message : "Não foi possível carregar o Selling.";
    return NextResponse.json({ error: message }, { status: message.includes("Sessão") ? 401 : message.includes("acesso") || message.includes("contratado") ? 403 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const companyId = String(body.companyId || "");
    const storeId = String(body.storeId || "");
    if (!companyId || !storeId) return NextResponse.json({ error: "Empresa e unidade são obrigatórias." }, { status: 400 });
    const { admin, userId } = await requireOperationAccess(request, companyId, storeId);
    const customerName = String(body.customerName || "").trim();
    const plate = String(body.plate || "").trim().toUpperCase();
    if (!customerName || !plate) return NextResponse.json({ error: "Cliente e placa são obrigatórios." }, { status: 400 });
    const total = Math.max(0, Number(body.total) || 0);
    const { data, error } = await admin.from("selling_presentations").insert({
      company_id: companyId,
      store_id: storeId,
      revision_id: String(body.revisionId || "").trim() || null,
      package_id: String(body.packageId || "").trim() || null,
      customer_ref: String(body.customerRef || "").trim() || null,
      vehicle_ref: String(body.vehicleRef || "").trim() || null,
      customer_name: customerName,
      customer_phone: String(body.customerPhone || "").trim() || null,
      plate,
      vehicle_description: String(body.vehicleDescription || "").trim() || null,
      consultant_name: String(body.consultantName || "").trim() || null,
      consultant_phone: String(body.consultantPhone || "").trim() || null,
      promised_time: String(body.promisedTime || "").trim() || null,
      total,
      snapshot: body.snapshot && typeof body.snapshot === "object" ? body.snapshot : {},
      created_by: userId,
    }).select("id,created_at").single();
    if (error) throw error;
    await admin.from("audit_logs").insert({ user_id: userId, action: "SELLING_PRESENTATION_CREATED", entity: "selling_presentation", entity_id: data.id, new_value: { customerName, plate, total, packageId: body.packageId, revisionId: body.revisionId } });
    return NextResponse.json({ success: true, id: data.id, createdAt: data.created_at });
  } catch (error) {
    console.error("Gerivo Selling save presentation:", error);
    const message = error instanceof Error ? error.message : "Não foi possível salvar a apresentação.";
    return NextResponse.json({ error: message }, { status: message.includes("Sessão") ? 401 : message.includes("acesso") || message.includes("contratado") ? 403 : 500 });
  }
}
