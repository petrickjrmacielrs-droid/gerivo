import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../../lib/supabase-admin";
import { parseSellingWorkbook } from "../../../../../lib/selling-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireMaster(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) throw new Error("Sessão inválida. Entre novamente no Gerivo.");
  const admin = getSupabaseAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) throw new Error("Sessão expirada. Entre novamente no Gerivo.");
  const { data: profile } = await admin.from("profiles").select("platform_role,active").eq("id", authData.user.id).maybeSingle();
  if (profile?.platform_role !== "MASTER" || !profile.active) throw new Error("Somente o MASTER Gerivo pode importar revisões do Selling.");
  return { admin, userId: authData.user.id };
}

export async function POST(request: Request) {
  let batchId = "";
  try {
    const { admin, userId } = await requireMaster(request);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Selecione a planilha XLSX." }, { status: 400 });
    if (!file.name.toLowerCase().endsWith(".xlsx")) return NextResponse.json({ error: "A beta aceita arquivo .xlsx." }, { status: 400 });
    if (file.size > 12 * 1024 * 1024) return NextResponse.json({ error: "A planilha deve ter no máximo 12 MB." }, { status: 400 });

    const { data: batch, error: batchError } = await admin.from("selling_import_batches").insert({ file_name: file.name, status: "PROCESSING", imported_by: userId }).select("id").single();
    if (batchError) throw batchError;
    batchId = batch.id;

    const revisions = parseSellingWorkbook(Buffer.from(await file.arrayBuffer()), file.name);
    const revisionRows = revisions.map((revision) => ({
      source_key: revision.sourceKey,
      model_key: revision.modelKey,
      model_name: revision.modelName,
      fuel_type: revision.fuelType,
      year_label: revision.yearLabel || null,
      revision_km: revision.revisionKm,
      base_price: revision.basePrice,
      labor_hours: revision.laborHours,
      labor_value: revision.laborValue,
      source_sheet: revision.sourceSheet,
      source_file: revision.sourceFile,
      import_batch_id: batchId,
      active: true,
      updated_at: new Date().toISOString(),
    }));
    const { data: saved, error: saveError } = await admin.from("selling_revision_templates").upsert(revisionRows, { onConflict: "source_key" }).select("id,source_key");
    if (saveError) throw saveError;
    const idByKey = new Map((saved || []).map((row: any) => [row.source_key, row.id]));
    const revisionIds = Array.from(idByKey.values());
    if (revisionIds.length) {
      const { error } = await admin.from("selling_revision_items").delete().in("revision_id", revisionIds);
      if (error) throw error;
    }
    const items = revisions.flatMap((revision) => {
      const revisionId = idByKey.get(revision.sourceKey);
      if (!revisionId) return [];
      return revision.items.map((item) => ({
        revision_id: revisionId,
        item_type: item.itemType,
        code: item.code || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        labor_hours: item.laborHours,
        display_order: item.displayOrder,
        source_sheet: item.sourceSheet,
      }));
    });
    // Supabase/PostgREST aceita lotes moderados; a planilha Nissan fica muito abaixo deste limite.
    for (let index = 0; index < items.length; index += 500) {
      const { error } = await admin.from("selling_revision_items").insert(items.slice(index, index + 500));
      if (error) throw error;
    }

    const models = Array.from(new Set(revisions.map((revision) => `${revision.modelName}|${revision.fuelType}`)));
    await admin.from("selling_import_batches").update({ status: "COMPLETED", revisions_count: revisions.length, items_count: items.length, completed_at: new Date().toISOString(), notes: `${models.length} modelos/aplicações importados.` }).eq("id", batchId);
    await admin.from("audit_logs").insert({ user_id: userId, action: "SELLING_REVIEWS_IMPORTED", entity: "selling_import", entity_id: batchId, new_value: { fileName: file.name, revisions: revisions.length, items: items.length, models: models.length } });

    return NextResponse.json({ success: true, revisions: revisions.length, items: items.length, models: models.length, sample: revisions.slice(0, 8).map((revision) => ({ modelName: revision.modelName, fuelType: revision.fuelType, revisionKm: revision.revisionKm, basePrice: revision.basePrice, items: revision.items.length })) });
  } catch (error) {
    console.error("Gerivo Selling import:", error);
    const message = error instanceof Error ? error.message : "Não foi possível importar a planilha.";
    if (batchId) {
      try { await getSupabaseAdminClient().from("selling_import_batches").update({ status: "FAILED", notes: message, completed_at: new Date().toISOString() }).eq("id", batchId); } catch {}
    }
    return NextResponse.json({ error: message }, { status: message.includes("Sessão") ? 401 : message.includes("MASTER") ? 403 : 500 });
  }
}
