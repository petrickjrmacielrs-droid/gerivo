import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../../lib/supabase-admin";
import { parseGerivoSellingTemplate, type SellingTemplateIssue, type SellingTemplatePackage } from "../../../../../lib/selling-template-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Admin = ReturnType<typeof getSupabaseAdminClient>;
type ResolvedPackage = SellingTemplatePackage & { targetGroupId: string | null; targetCompanyId: string | null; modelKeys: string[]; revisionKms: number[] };

async function requireMaster(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) throw new Error("Sessão inválida. Entre novamente no Gerivo.");
  const admin = getSupabaseAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) throw new Error("Sessão expirada. Entre novamente no Gerivo.");
  const { data: profile, error: profileError } = await admin.from("profiles").select("platform_role,active").eq("id", authData.user.id).maybeSingle();
  if (profileError) throw profileError;
  if (profile?.platform_role !== "MASTER" || !profile.active) throw new Error("Somente o MASTER Gerivo pode importar o padrão do Selling.");
  return { admin, userId: authData.user.id };
}
function ascii(value: string) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function comparable(value: string) { return ascii(value).toUpperCase().replace(/\s+/g, " ").trim(); }
function chunk<T>(items: T[], size = 400) { const chunks: T[][] = []; for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size)); return chunks; }
function addIssue(issues: SellingTemplateIssue[], level: SellingTemplateIssue["level"], sheet: string, message: string) { issues.push({ level, sheet, message }); }

async function dbContext(admin: Admin, revisionKeys: string[], packageCodes: string[]) {
  const existingRevisionsPromise = revisionKeys.length
    ? admin.from("selling_revision_templates").select("id,source_key,model_key,model_name,revision_km").in("source_key", revisionKeys)
    : Promise.resolve({ data: [], error: null } as any);
  const existingPackagesPromise = packageCodes.length
    ? admin.from("selling_packages").select("id,import_code,name").in("import_code", packageCodes)
    : Promise.resolve({ data: [], error: null } as any);
  const [allRevisionsResult, existingRevisionsResult, existingPackagesResult, groupsResult, companiesResult] = await Promise.all([
    admin.from("selling_revision_templates").select("model_key,model_name,revision_km,fuel_type,active").eq("fuel_type", "FLEX").eq("active", true),
    existingRevisionsPromise,
    existingPackagesPromise,
    admin.from("business_groups").select("id,name"),
    admin.from("companies").select("id,name,document,group_id"),
  ]);
  for (const result of [allRevisionsResult, existingRevisionsResult, existingPackagesResult, groupsResult, companiesResult]) if (result.error) throw result.error;
  return {
    allRevisions: allRevisionsResult.data || [], existingRevisions: existingRevisionsResult.data || [], existingPackages: existingPackagesResult.data || [],
    groups: groupsResult.data || [], companies: companiesResult.data || [],
  };
}

function resolveTemplate(parsed: ReturnType<typeof parseGerivoSellingTemplate>, context: Awaited<ReturnType<typeof dbContext>>) {
  const issues = [...parsed.issues];
  const revisionMatrix = new Map<string, Set<number>>();
  const modelNames = new Map<string, string>();
  for (const row of context.allRevisions as any[]) {
    const key = String(row.model_key || ""); if (!key) continue;
    if (!revisionMatrix.has(key)) revisionMatrix.set(key, new Set<number>());
    revisionMatrix.get(key)!.add(Number(row.revision_km)); modelNames.set(key, String(row.model_name || key));
  }
  for (const revision of parsed.revisions) {
    if (!revision.active) continue;
    if (!revisionMatrix.has(revision.modelKey)) revisionMatrix.set(revision.modelKey, new Set<number>());
    revisionMatrix.get(revision.modelKey)!.add(revision.revisionKm); modelNames.set(revision.modelKey, revision.modelName);
  }
  const allModelKeys = Array.from(revisionMatrix.keys()).sort();
  const groupByName = new Map((context.groups as any[]).map((group) => [comparable(group.name), group]));
  const companyByDocument = new Map((context.companies as any[]).filter((company) => String(company.document || "").replace(/\D/g, "")).map((company) => [String(company.document).replace(/\D/g, ""), company]));
  const resolvedPackages: ResolvedPackage[] = [];

  for (const pkg of parsed.packages) {
    let targetGroupId: string | null = null; let targetCompanyId: string | null = null;
    if (pkg.scope === "GROUP") {
      const group = groupByName.get(comparable(pkg.groupName));
      if (!group) addIssue(issues, "ERROR", "PACOTES", `${pkg.importCode}: grupo '${pkg.groupName}' não encontrado no Gerivo.`);
      else targetGroupId = String(group.id);
    } else if (pkg.scope === "COMPANY") {
      const company = companyByDocument.get(pkg.companyDocument);
      if (!company) addIssue(issues, "ERROR", "PACOTES", `${pkg.importCode}: empresa com CNPJ/documento ${pkg.companyDocument} não encontrada no Gerivo.`);
      else targetCompanyId = String(company.id);
    }

    const wildcardModels = pkg.applications.some((app) => app.modelKey === "*");
    const requestedModels = Array.from(new Set(pkg.applications.filter((app) => app.modelKey !== "*").map((app) => app.modelKey)));
    const modelKeys = wildcardModels ? allModelKeys : requestedModels;
    if (!modelKeys.length) addIssue(issues, "ERROR", "APLICACOES", `${pkg.importCode}: nenhuma aplicação FLEX disponível para o pacote.`);
    for (const modelKey of modelKeys) if (!revisionMatrix.has(modelKey)) addIssue(issues, "ERROR", "APLICACOES", `${pkg.importCode}: modelo '${modelKey}' não existe nas revisões FLEX atuais nem na aba REVISOES deste arquivo.`);

    let revisionKms: number[] = [];
    if (pkg.offerType === "REVISION") {
      const wildcardKms = pkg.applications.some((app) => app.revisionKm === 0);
      const specificKms = Array.from(new Set(pkg.applications.map((app) => app.revisionKm).filter((km) => km > 0))).sort((a, b) => a - b);
      revisionKms = wildcardKms
        ? Array.from(new Set(modelKeys.flatMap((modelKey) => Array.from(revisionMatrix.get(modelKey) || [])))).sort((a, b) => a - b)
        : specificKms;
      if (!revisionKms.length) addIssue(issues, "ERROR", "APLICACOES", `${pkg.importCode}: nenhuma revisão foi resolvida para o pacote.`);
      for (const km of revisionKms) {
        if (!modelKeys.some((modelKey) => revisionMatrix.get(modelKey)?.has(km))) addIssue(issues, "WARNING", "APLICACOES", `${pkg.importCode}: ${km.toLocaleString("pt-BR")} km não existe para os modelos selecionados e não terá efeito.`);
      }
    }
    resolvedPackages.push({ ...pkg, targetGroupId, targetCompanyId, modelKeys, revisionKms });
  }

  const existingRevisionKeys = new Set((context.existingRevisions as any[]).map((row) => String(row.source_key)));
  const existingPackageCodes = new Set((context.existingPackages as any[]).map((row) => String(row.import_code)));
  const revisionItems = parsed.revisions.reduce((sum, revision) => sum + revision.items.length, 0);
  const packageItems = parsed.packages.reduce((sum, pkg) => sum + pkg.items.length, 0);
  const applications = resolvedPackages.reduce((sum, pkg) => sum + pkg.modelKeys.length * Math.max(1, pkg.offerType === "REVISION" ? pkg.revisionKms.length : 1), 0);
  const errors = issues.filter((entry) => entry.level === "ERROR");
  const warnings = issues.filter((entry) => entry.level === "WARNING");
  return {
    issues, errors, warnings, resolvedPackages,
    summary: {
      revisions: parsed.revisions.length, revisionItems, packages: parsed.packages.length, packageItems, applications,
      revisionCreates: parsed.revisions.filter((revision) => !existingRevisionKeys.has(revision.sourceKey)).length,
      revisionUpdates: parsed.revisions.filter((revision) => existingRevisionKeys.has(revision.sourceKey)).length,
      packageCreates: parsed.packages.filter((pkg) => !existingPackageCodes.has(pkg.importCode)).length,
      packageUpdates: parsed.packages.filter((pkg) => existingPackageCodes.has(pkg.importCode)).length,
    },
    samples: {
      revisions: parsed.revisions.slice(0, 8).map((revision) => ({ code: revision.revisionCode, model: revision.modelName, km: revision.revisionKm, price: revision.basePrice, items: revision.items.length })),
      packages: resolvedPackages.slice(0, 8).map((pkg) => ({ code: pkg.importCode, name: pkg.name, tier: pkg.tier, models: pkg.modelKeys.length, revisions: pkg.offerType === "REVISION" ? pkg.revisionKms.length : 0, items: pkg.items.length, published: pkg.published })),
    },
  };
}

async function persistTemplate(admin: Admin, userId: string, parsed: ReturnType<typeof parseGerivoSellingTemplate>, resolved: ReturnType<typeof resolveTemplate>, batchId: string) {
  const now = new Date().toISOString();
  if (parsed.revisions.length) {
    const rows = parsed.revisions.map((revision) => ({
      source_key: revision.sourceKey, model_key: revision.modelKey, model_name: revision.modelName, fuel_type: "FLEX", year_label: revision.yearLabel || null,
      revision_km: revision.revisionKm, base_price: revision.basePrice, labor_hours: revision.laborHours, labor_value: revision.laborValue,
      source_sheet: "GERIVO_PADRAO", source_file: parsed.fileName, import_batch_id: batchId, active: revision.active, updated_at: now,
    }));
    const { data: savedRevisions, error: revisionError } = await admin.from("selling_revision_templates").upsert(rows, { onConflict: "source_key" }).select("id,source_key");
    if (revisionError) throw revisionError;
    const revisionIdByKey = new Map((savedRevisions || []).map((row: any) => [String(row.source_key), String(row.id)]));
    const ids = Array.from(revisionIdByKey.values());
    if (ids.length) { const { error } = await admin.from("selling_revision_items").delete().in("revision_id", ids); if (error) throw error; }
    const itemRows = parsed.revisions.flatMap((revision) => {
      const revisionId = revisionIdByKey.get(revision.sourceKey); if (!revisionId) return [];
      return revision.items.map((item) => ({ revision_id: revisionId, item_type: item.itemType, code: item.code || null, description: item.description, quantity: item.quantity, unit_price: item.unitPrice, total_price: item.totalPrice, labor_hours: item.laborHours, display_order: item.order, source_sheet: "GERIVO_PADRAO" }));
    });
    for (const part of chunk(itemRows)) { const { error } = await admin.from("selling_revision_items").insert(part); if (error) throw error; }
  }

  const packageIdByCode = new Map<string, string>();
  const existingCodes = resolved.resolvedPackages.map((pkg) => pkg.importCode);
  let existing: any[] = [];
  if (existingCodes.length) {
    const result = await admin.from("selling_packages").select("id,import_code").in("import_code", existingCodes); if (result.error) throw result.error; existing = result.data || [];
  }
  const existingMap = new Map(existing.map((row) => [String(row.import_code), String(row.id)]));
  for (const pkg of resolved.resolvedPackages) {
    const payload = {
      import_code: pkg.importCode, name: pkg.name, tier: pkg.tier, offer_type: pkg.offerType, fuel_type: "FLEX", color: pkg.color,
      description: pkg.description || null, price_mode: "ITEM_SUM", fixed_addon_price: 0, installments: pkg.installments,
      target_group_id: pkg.targetGroupId, target_company_id: pkg.targetCompanyId, display_order: pkg.displayOrder, presentation_mode: pkg.presentationMode,
      active: pkg.active, published: pkg.published, updated_by: userId, updated_at: now,
    };
    const existingId = existingMap.get(pkg.importCode);
    if (existingId) {
      const { error } = await admin.from("selling_packages").update(payload).eq("id", existingId); if (error) throw error; packageIdByCode.set(pkg.importCode, existingId);
    } else {
      const { data, error } = await admin.from("selling_packages").insert({ ...payload, created_by: userId }).select("id").single(); if (error) throw error; packageIdByCode.set(pkg.importCode, String(data.id));
    }
  }
  const packageIds = Array.from(packageIdByCode.values());
  if (packageIds.length) {
    for (const table of ["selling_package_items", "selling_package_models", "selling_package_revisions"] as const) {
      const { error } = await admin.from(table).delete().in("package_id", packageIds); if (error) throw error;
    }
  }
  const packageItemRows = resolved.resolvedPackages.flatMap((pkg) => {
    const packageId = packageIdByCode.get(pkg.importCode); if (!packageId) return [];
    return pkg.items.map((item) => ({
      package_id: packageId, item_type: item.itemType, item_class: item.itemClass, code: item.code || null, description: item.description,
      quantity: item.quantity, unit_price: item.unitPrice, line_total: item.lineTotal, labor_hours: item.laborHours, display_order: item.order,
      source: "GERIVO_TEMPLATE", source_file: parsed.fileName, category_key: item.categoryKey || null, category_name: item.categoryName || null,
      visual_name: item.visualName || null, show_individual: item.showIndividual, show_price: item.showPrice, info_title: item.infoTitle || null,
      info_text: item.infoText || null, info_image_url: item.infoMediaUrl || null, is_courtesy: item.isCourtesy, courtesy_label: item.courtesyLabel || "Cortesia",
      courtesy_note: item.courtesyNote || null, bundle_key: item.bundleKey || null, bundle_name: item.bundleName || null,
      is_tire: item.isTire, max_installments: item.maxInstallments,
    }));
  });
  const packageModelRows = resolved.resolvedPackages.flatMap((pkg) => {
    const packageId = packageIdByCode.get(pkg.importCode); return packageId ? pkg.modelKeys.map((modelKey) => ({ package_id: packageId, model_key: modelKey })) : [];
  });
  const packageRevisionRows = resolved.resolvedPackages.flatMap((pkg) => {
    const packageId = packageIdByCode.get(pkg.importCode); return packageId && pkg.offerType === "REVISION" ? pkg.revisionKms.map((revisionKm) => ({ package_id: packageId, revision_km: revisionKm })) : [];
  });
  for (const part of chunk(packageItemRows)) { const { error } = await admin.from("selling_package_items").insert(part); if (error) throw error; }
  for (const part of chunk(packageModelRows)) { const { error } = await admin.from("selling_package_models").insert(part); if (error) throw error; }
  for (const part of chunk(packageRevisionRows)) { const { error } = await admin.from("selling_package_revisions").insert(part); if (error) throw error; }
}

export async function POST(request: Request) {
  let batchId = "";
  try {
    const { admin, userId } = await requireMaster(request);
    const form = await request.formData();
    const file = form.get("file");
    const mode = String(form.get("mode") || "preview").toLowerCase() === "commit" ? "commit" : "preview";
    if (!(file instanceof File)) return NextResponse.json({ error: "Selecione a planilha padrão Gerivo (.xlsx)." }, { status: 400 });
    if (!file.name.toLowerCase().endsWith(".xlsx")) return NextResponse.json({ error: "O importador padrão aceita arquivo .xlsx." }, { status: 400 });
    if (file.size > 12 * 1024 * 1024) return NextResponse.json({ error: "A planilha deve ter no máximo 12 MB." }, { status: 400 });

    const parsed = parseGerivoSellingTemplate(Buffer.from(await file.arrayBuffer()), file.name);
    const context = await dbContext(admin, parsed.revisions.map((revision) => revision.sourceKey), parsed.packages.map((pkg) => pkg.importCode));
    const resolved = resolveTemplate(parsed, context);
    const preview = { fileName: file.name, mode, summary: resolved.summary, samples: resolved.samples, errors: resolved.errors, warnings: resolved.warnings };
    if (mode === "preview") return NextResponse.json({ success: resolved.errors.length === 0, preview }, { status: resolved.errors.length ? 422 : 200 });
    if (resolved.errors.length) return NextResponse.json({ error: "A planilha possui erros. Revise a prévia antes de importar.", preview }, { status: 422 });

    const { data: batch, error: batchError } = await admin.from("selling_import_batches").insert({ file_name: file.name, status: "PROCESSING", imported_by: userId, notes: "Importação padrão Gerivo: revisões + pacotes." }).select("id").single();
    if (batchError) throw batchError; batchId = String(batch.id);
    await persistTemplate(admin, userId, parsed, resolved, batchId);
    const itemCount = resolved.summary.revisionItems + resolved.summary.packageItems;
    await admin.from("selling_import_batches").update({ status: "COMPLETED", revisions_count: resolved.summary.revisions, items_count: itemCount, completed_at: new Date().toISOString(), notes: `${resolved.summary.revisions} revisões e ${resolved.summary.packages} pacotes processados pelo padrão Gerivo.` }).eq("id", batchId);
    await admin.from("audit_logs").insert({ user_id: userId, action: "SELLING_TEMPLATE_IMPORTED", entity: "selling_import", entity_id: batchId, new_value: { fileName: file.name, ...resolved.summary } });
    return NextResponse.json({ success: true, batchId, preview, imported: resolved.summary });
  } catch (error) {
    console.error("Gerivo Selling standard template import:", error);
    const message = error instanceof Error ? error.message : "Não foi possível importar o padrão Gerivo.";
    if (batchId) { try { await getSupabaseAdminClient().from("selling_import_batches").update({ status: "FAILED", notes: message, completed_at: new Date().toISOString() }).eq("id", batchId); } catch {} }
    return NextResponse.json({ error: message }, { status: message.includes("Sessão") ? 401 : message.includes("MASTER") ? 403 : 500 });
  }
}
