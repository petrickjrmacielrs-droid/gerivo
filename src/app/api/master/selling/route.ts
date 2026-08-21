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
  const { data: profile, error: profileError } = await admin.from("profiles").select("platform_role, active").eq("id", authData.user.id).maybeSingle();
  if (profileError) throw profileError;
  if (profile?.platform_role !== "MASTER" || !profile.active) throw new Error("Somente o MASTER Gerivo pode configurar o Selling.");
  return { admin, userId: authData.user.id };
}

async function loadSelling(admin: ReturnType<typeof getSupabaseAdminClient>) {
  const [revisionsResult, revisionItemsResult, packagesResult, packageItemsResult, packageModelsResult, packageRevisionsResult, groupsResult, importsResult, paymentSettingsResult, recommendationsResult, catalogKitsResult, catalogKitItemsResult] = await Promise.all([
    admin.from("selling_revision_templates").select("*").order("model_name").order("revision_km"),
    admin.from("selling_revision_items").select("*").order("display_order"),
    admin.from("selling_packages").select("*").order("display_order").order("created_at"),
    admin.from("selling_package_items").select("*").order("display_order"),
    admin.from("selling_package_models").select("*"),
    admin.from("selling_package_revisions").select("*"),
    admin.from("business_groups").select("id,name,companies(id,name)").order("name"),
    admin.from("selling_import_batches").select("*").order("created_at", { ascending: false }).limit(12),
    admin.from("selling_payment_settings").select("*").order("updated_at", { ascending: false }),
    admin.from("selling_recommendations").select("*").order("priority").order("min_km"),
    admin.from("selling_catalog_kits").select("*").order("display_order").order("name"),
    admin.from("selling_catalog_kit_items").select("*").order("display_order"),
  ]);
  for (const result of [revisionsResult, revisionItemsResult, packagesResult, packageItemsResult, packageModelsResult, packageRevisionsResult, groupsResult, importsResult, paymentSettingsResult, recommendationsResult, catalogKitsResult, catalogKitItemsResult]) if (result.error) throw result.error;
  const revisionItems = revisionItemsResult.data || [];
  const packageItems = packageItemsResult.data || [];
  const packageModels = packageModelsResult.data || [];
  const packageRevisions = packageRevisionsResult.data || [];
  return {
    revisions: (revisionsResult.data || []).map((revision: any) => ({ ...revision, items: revisionItems.filter((item: any) => item.revision_id === revision.id) })),
    packages: (packagesResult.data || []).map((pkg: any) => ({
      ...pkg,
      items: packageItems.filter((item: any) => item.package_id === pkg.id),
      model_keys: packageModels.filter((item: any) => item.package_id === pkg.id).map((item: any) => item.model_key),
      revision_kms: packageRevisions.filter((item: any) => item.package_id === pkg.id).map((item: any) => Number(item.revision_km)).sort((a: number, b: number) => a - b),
    })),
    groups: groupsResult.data || [],
    imports: importsResult.data || [],
    paymentSettings: paymentSettingsResult.data || [],
    recommendations: recommendationsResult.data || [],
    catalogKits: (catalogKitsResult.data || []).map((kit:any)=>({ ...kit, items:(catalogKitItemsResult.data || []).filter((item:any)=>item.kit_id===kit.id) })),
  };
}

export async function GET(request: Request) {
  try {
    const { admin } = await requireMaster(request);
    return NextResponse.json(await loadSelling(admin), { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Gerivo MASTER Selling GET:", error);
    const message = error instanceof Error ? error.message : "Não foi possível carregar o Selling.";
    return NextResponse.json({ error: message }, { status: message.includes("Sessão") ? 401 : message.includes("MASTER") ? 403 : 500 });
  }
}

function cleanColor(value: unknown) {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : "#11c7a7";
}
function cleanItems(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 120).map((item: any, index) => {
    const quantity = Math.max(0.001, Number(item.quantity) || 1);
    const unitPrice = Math.max(0, Number(item.unitPrice ?? item.unit_price) || 0);
    const hasLineTotal = item.lineTotal !== undefined && item.lineTotal !== null && item.lineTotal !== "";
    return {
      item_type: String(item.itemType || item.item_type) === "CHEMICAL" ? "PART" : (["PART", "SERVICE", "LABOR"].includes(String(item.itemType || item.item_type)) ? String(item.itemType || item.item_type) : "SERVICE"),
      item_class: String(item.itemType || item.item_class) === "CHEMICAL" ? "CHEMICAL" : String(item.item_class || item.itemType || item.item_type || "SERVICE"),
      bundle_key: String(item.bundleKey || item.bundle_key || "").trim() || null,
      bundle_name: String(item.bundleName || item.bundle_name || "").trim() || null,
      code: String(item.code || "").trim() || null,
      description: String(item.description || "").trim(),
      quantity,
      unit_price: unitPrice,
      line_total: hasLineTotal ? Math.max(0, Number(item.lineTotal) || 0) : null,
      labor_hours: Math.max(0, Number(item.laborHours ?? item.labor_hours) || 0),
      display_order: index + 1,
      source: String(item.source || "MANUAL").trim() || "MANUAL",
      source_file: String(item.sourceFile || item.source_file || "").trim() || null,
      category_key: String(item.categoryKey || item.category_key || "").trim() || null,
      category_name: String(item.categoryName || item.category_name || "").trim() || null,
      visual_name: String(item.visualName || item.visual_name || "").trim() || null,
      show_individual: Boolean(item.showIndividual ?? item.show_individual ?? false),
      show_price: item.showPrice !== false && item.show_price !== false,
      info_title: String(item.infoTitle || item.info_title || "").trim() || null,
      info_text: String(item.infoText || item.info_text || "").trim() || null,
      info_image_url: String(item.infoImageUrl || item.info_image_url || "").trim() || null,
      is_courtesy: Boolean(item.isCourtesy ?? item.is_courtesy ?? false),
      courtesy_label: String(item.courtesyLabel || item.courtesy_label || "Cortesia").trim() || "Cortesia",
      courtesy_note: String(item.courtesyNote || item.courtesy_note || "").trim() || null,
    };
  }).filter((item) => item.description.length >= 2);
}

export async function POST(request: Request) {
  try {
    const { admin, userId } = await requireMaster(request);
    const body = await request.json();
    const action = String(body.action || "save-package");

    if (action === "save-payment-settings") {
      const groupId = String(body.groupId || "").trim();
      if (!groupId) return NextResponse.json({ error: "Selecione o grupo para configurar o pagamento." }, { status: 400 });
      const rules = Array.isArray(body.rules) ? body.rules.slice(0, 12).map((rule: any) => ({
        min: Math.max(0, Number(rule.min) || 0),
        max: rule.max === null || rule.max === "" || rule.max === undefined ? null : Math.max(0, Number(rule.max) || 0),
        max_installments: Math.min(12, Math.max(1, Math.floor(Number(rule.maxInstallments ?? rule.max_installments) || 1))),
      })).sort((a: any, b: any) => a.min - b.min) : [];
      if (!rules.length) return NextResponse.json({ error: "Cadastre ao menos uma faixa de parcelamento." }, { status: 400 });
      const payload = {
        group_id: groupId,
        allow_pix: body.allowPix !== false,
        allow_debit: body.allowDebit !== false,
        allow_credit: body.allowCredit !== false,
        installment_rules: rules,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      };
      const { error } = await admin.from("selling_payment_settings").upsert(payload, { onConflict: "group_id" });
      if (error) throw error;
      await admin.from("audit_logs").insert({ user_id: userId, action: "SELLING_PAYMENT_SETTINGS_UPDATED", entity: "business_group", entity_id: groupId, new_value: payload });
      return NextResponse.json({ success: true, data: await loadSelling(admin) });
    }

    if (action === "save-recommendation") {
      const id=String(body.recommendationId||"").trim();
      const intervalKm=Math.max(0,Math.floor(Number(body.intervalKm ?? body.minKm)||0));
      const intervalMonths=Math.max(0,Math.floor(Number(body.intervalMonths ?? body.minMonths)||0));
      const catalogKitId=String(body.catalogKitId||"").trim()||null;
      if(catalogKitId){ const {data:kit,error:kitError}=await admin.from("selling_catalog_kits").select("id,fuel_type").eq("id",catalogKitId).maybeSingle(); if(kitError) throw kitError; if(!kit) return NextResponse.json({error:"Kit vinculado não encontrado."},{status:400}); if(kit.fuel_type!=="FLEX") return NextResponse.json({error:"A recomendação FLEX só pode usar kit FLEX."},{status:400}); }
      const payload={ model_key:String(body.modelKey||"").trim()||null, fuel_type:"FLEX", title:String(body.title||"").trim(), description:String(body.description||"").trim(), min_km:intervalKm, min_months:intervalMonths, interval_km:intervalKm, interval_months:intervalMonths, catalog_kit_id:catalogKitId, include_in_packages:body.includeInPackages!==false, show_price:body.showPrice===true, priority:["INFO","IMPORTANT","SAFETY"].includes(String(body.priority))?String(body.priority):"IMPORTANT", active:body.active!==false, updated_by:userId, updated_at:new Date().toISOString() };
      if(!payload.title) return NextResponse.json({error:"Informe o título da recomendação."},{status:400});
      const result=id?await admin.from("selling_recommendations").update(payload).eq("id",id):await admin.from("selling_recommendations").insert({...payload,created_by:userId});
      if(result.error) throw result.error;
      return NextResponse.json({success:true,data:await loadSelling(admin)});
    }
    if (action === "delete-recommendation") {
      const id=String(body.recommendationId||"").trim(); if(!id) return NextResponse.json({error:"Recomendação inválida."},{status:400});
      const {error}=await admin.from("selling_recommendations").delete().eq("id",id); if(error) throw error;
      return NextResponse.json({success:true,data:await loadSelling(admin)});
    }

    if (action === "save-kit") {
      const kitId=String(body.kitId||"").trim(); const name=String(body.name||"").trim();
      if(!name) return NextResponse.json({error:"Informe o nome do kit."},{status:400});
      const targetGroupId=String(body.targetGroupId||"").trim()||null; const targetCompanyId=String(body.targetCompanyId||"").trim()||null;
      if(targetGroupId&&targetCompanyId) return NextResponse.json({error:"Escolha apenas grupo ou empresa para o kit."},{status:400});
      const payload={ name, visual_name:String(body.visualName||"").trim()||name, description:String(body.description||"").trim()||null, fuel_type:"FLEX", is_tire:Boolean(body.isTire), max_installments:Math.min(24,Math.max(1,Math.floor(Number(body.maxInstallments)||4))), target_group_id:targetGroupId, target_company_id:targetCompanyId, active:body.active!==false, display_order:Math.max(0,Math.floor(Number(body.displayOrder)||0)), updated_by:userId, updated_at:new Date().toISOString() };
      let savedId=kitId;
      if(kitId){ const {error}=await admin.from("selling_catalog_kits").update(payload).eq("id",kitId); if(error) throw error; }
      else { const {data,error}=await admin.from("selling_catalog_kits").insert({...payload,created_by:userId}).select("id").single(); if(error) throw error; savedId=data.id; }
      const items=cleanItems(body.items);
      await admin.from("selling_catalog_kit_items").delete().eq("kit_id",savedId);
      if(items.length){ const {error}=await admin.from("selling_catalog_kit_items").insert(items.map((item)=>({ ...item, kit_id:savedId }))); if(error) throw error; }
      await admin.from("audit_logs").insert({user_id:userId,action:kitId?"SELLING_KIT_UPDATED":"SELLING_KIT_CREATED",entity:"selling_catalog_kit",entity_id:savedId,new_value:{...payload,itemCount:items.length}});
      return NextResponse.json({success:true,data:await loadSelling(admin)});
    }
    if (action === "delete-kit") {
      const kitId=String(body.kitId||"").trim(); if(!kitId) return NextResponse.json({error:"Kit inválido."},{status:400});
      const {error}=await admin.from("selling_catalog_kits").delete().eq("id",kitId); if(error) throw error;
      return NextResponse.json({success:true,data:await loadSelling(admin)});
    }

    if (action === "delete-package") {
      const packageId = String(body.packageId || "");
      if (!packageId) return NextResponse.json({ error: "Pacote inválido." }, { status: 400 });
      const { error } = await admin.from("selling_packages").delete().eq("id", packageId);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === "toggle-package") {
      const packageId = String(body.packageId || "");
      const patch: Record<string, unknown> = { updated_by: userId, updated_at: new Date().toISOString() };
      if (typeof body.active === "boolean") patch.active = body.active;
      if (typeof body.published === "boolean") patch.published = body.published;
      const { error } = await admin.from("selling_packages").update(patch).eq("id", packageId);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    const packageId = String(body.packageId || "").trim();
    const name = String(body.name || "").trim();
    const tier = ["ESSENCIAL", "INTERMEDIARIO", "PREMIUM"].includes(String(body.tier)) ? String(body.tier) : "ESSENCIAL";
    const offerType = body.offerType === "OIL_CHANGE" ? "OIL_CHANGE" : "REVISION";
    const fuelType = "FLEX"; // Beta inicial: somente Flex.
    if (name.length < 2) return NextResponse.json({ error: "Informe o nome do pacote." }, { status: 400 });

    const modelKeys: string[] = Array.isArray(body.modelKeys) ? Array.from(new Set<string>(body.modelKeys.map((value: unknown) => String(value || "").trim()).filter(Boolean))) : [];
    const revisionKms: number[] = Array.isArray(body.revisionKms) ? Array.from(new Set<number>(body.revisionKms.map((value: unknown) => Math.floor(Number(value) || 0)).filter((value: number) => value > 0))) : [];
    const items = cleanItems(body.items);
    if (!modelKeys.length) return NextResponse.json({ error: "Selecione ao menos um modelo para o pacote." }, { status: 400 });
    if (offerType === "REVISION" && !revisionKms.length) return NextResponse.json({ error: "Selecione ao menos uma revisão para o pacote de revisão." }, { status: 400 });

    if (modelKeys.length) {
      const { data: matched, error } = await admin.from("selling_revision_templates").select("model_key,fuel_type").in("model_key", modelKeys).eq("active", true);
      if (error) throw error;
      const flexModels = new Set((matched || []).filter((row: any) => row.fuel_type === "FLEX").map((row: any) => row.model_key));
      const incompatible = modelKeys.filter((modelKey: string) => !flexModels.has(modelKey));
      if (incompatible.length) return NextResponse.json({ error: `A Beta 02 está restrita a FLEX. Modelo(s) incompatíveis: ${incompatible.join(", ")}.` }, { status: 400 });
    }

    const targetGroupId = String(body.targetGroupId || "").trim() || null;
    const targetCompanyId = String(body.targetCompanyId || "").trim() || null;
    if (targetGroupId && targetCompanyId) return NextResponse.json({ error: "Escolha apenas um escopo: grupo ou empresa." }, { status: 400 });

    const payload = {
      name,
      tier,
      offer_type: offerType,
      fuel_type: fuelType,
      color: cleanColor(body.color),
      description: String(body.description || "").trim() || null,
      price_mode: "ITEM_SUM",
      fixed_addon_price: 0,
      installments: Math.min(24, Math.max(1, Math.floor(Number(body.installments) || 1))),
      target_group_id: targetGroupId,
      target_company_id: targetCompanyId,
      display_order: Math.max(0, Math.floor(Number(body.displayOrder) || 0)),
      presentation_mode: body.presentationMode === "DETAILED" ? "DETAILED" : "GROUPED",
      active: body.active !== false,
      published: Boolean(body.published),
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };

    let savedId = packageId;
    if (packageId) {
      const { error } = await admin.from("selling_packages").update(payload).eq("id", packageId);
      if (error) throw error;
    } else {
      const { data, error } = await admin.from("selling_packages").insert({ ...payload, created_by: userId }).select("id").single();
      if (error) throw error;
      savedId = data.id;
    }

    await Promise.all([
      admin.from("selling_package_items").delete().eq("package_id", savedId),
      admin.from("selling_package_models").delete().eq("package_id", savedId),
      admin.from("selling_package_revisions").delete().eq("package_id", savedId),
    ]);
    if (items.length) {
      const { error } = await admin.from("selling_package_items").insert(items.map((item) => ({ ...item, package_id: savedId })));
      if (error) throw error;
    }
    if (modelKeys.length) {
      const { error } = await admin.from("selling_package_models").insert(modelKeys.map((modelKey: string) => ({ package_id: savedId, model_key: modelKey })));
      if (error) throw error;
    }
    if (offerType === "REVISION" && revisionKms.length) {
      const { error } = await admin.from("selling_package_revisions").insert(revisionKms.map((revisionKm: number) => ({ package_id: savedId, revision_km: revisionKm })));
      if (error) throw error;
    }

    await admin.from("audit_logs").insert({ user_id: userId, action: packageId ? "SELLING_PACKAGE_UPDATED" : "SELLING_PACKAGE_CREATED", entity: "selling_package", entity_id: savedId, new_value: { ...payload, modelKeys, revisionKms: offerType === "REVISION" ? revisionKms : [], itemCount: items.length } });
    return NextResponse.json({ success: true, packageId: savedId, data: await loadSelling(admin) });
  } catch (error) {
    console.error("Gerivo MASTER Selling POST:", error);
    const message = error instanceof Error ? error.message : "Não foi possível salvar o Selling.";
    return NextResponse.json({ error: message }, { status: message.includes("Sessão") ? 401 : message.includes("MASTER") ? 403 : 500 });
  }
}
