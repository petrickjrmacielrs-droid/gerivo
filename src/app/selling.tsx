"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

type SellingItem = {
  id?: string;
  item_type?: string;
  itemType?: string;
  item_class?: string | null;
  bundle_key?: string | null;
  bundle_name?: string | null;
  code?: string | null;
  description: string;
  quantity: number;
  unit_price?: number;
  unitPrice?: number;
  total_price?: number;
  line_total?: number | null;
  lineTotal?: number | null;
  labor_hours?: number;
  laborHours?: number;
  display_order?: number;
  source?: string | null;
  source_file?: string | null;
  category_key?: string | null;
  category_name?: string | null;
  visual_name?: string | null;
  show_individual?: boolean;
  show_price?: boolean;
  info_title?: string | null;
  info_text?: string | null;
  info_image_url?: string | null;
  is_tire?: boolean;
  max_installments?: number | null;
  is_courtesy?: boolean;
  courtesy_label?: string | null;
  courtesy_note?: string | null;
  is_recommendation?: boolean;
  recommendation_text?: string | null;
  recommendation_id?: string | null;
};
type SellingRevision = {
  id: string;
  model_key: string;
  model_name: string;
  fuel_type: "FLEX" | "DIESEL" | "ELECTRIC" | "OTHER";
  year_label?: string | null;
  revision_km: number;
  base_price: number;
  labor_hours: number;
  labor_value: number;
  source_sheet?: string;
  items: SellingItem[];
};
type SellingPackage = {
  id: string;
  import_code?: string | null;
  name: string;
  tier: "ESSENCIAL" | "INTERMEDIARIO" | "PREMIUM";
  offer_type?: "REVISION" | "OIL_CHANGE";
  fuel_type: "FLEX" | "DIESEL";
  color: string;
  description?: string | null;
  price_mode: "ITEM_SUM" | "FIXED";
  fixed_addon_price: number;
  installments: number;
  presentation_mode?: "GROUPED" | "DETAILED";
  target_group_id?: string | null;
  target_company_id?: string | null;
  display_order: number;
  active: boolean;
  published: boolean;
  items: SellingItem[];
  model_keys: string[];
  revision_kms: number[];
};
type SellingRecommendation = { id: string; model_key: string | null; title: string; description: string; min_km: number; min_months: number; interval_km?: number; interval_months?: number; priority: "INFO" | "IMPORTANT" | "SAFETY"; active: boolean; catalog_kit_id?: string | null; include_in_packages?: boolean; show_price?: boolean };
type SellingMasterData = {
  revisions: SellingRevision[];
  packages: SellingPackage[];
  groups: Array<{ id: string; name: string; companies?: Array<{ id: string; name: string }> }>;
  imports: Array<{ id: string; file_name: string; status: string; revisions_count: number; items_count: number; notes?: string; created_at: string }>;
  paymentSettings: SellingPaymentSetting[];
  recommendations: SellingRecommendation[];
  catalogKits: SellingCatalogKit[];
};
type PackageDraftItem = {
  id: string;
  itemType: "PART" | "CHEMICAL" | "SERVICE" | "LABOR";
  code: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number | null;
  laborHours: number;
  source: string;
  sourceFile: string;
  categoryKey: string;
  categoryName: string;
  visualName: string;
  showIndividual: boolean;
  showPrice: boolean;
  infoTitle: string;
  infoText: string;
  infoImageUrl: string;
  isCourtesy: boolean;
  courtesyLabel: string;
  courtesyNote: string;
  bundleKey: string;
  bundleName: string;
  isTire: boolean;
  maxInstallments: number | null;
};
type PackageDraft = {
  packageId: string;
  name: string;
  tier: "ESSENCIAL" | "INTERMEDIARIO" | "PREMIUM";
  offerType: "REVISION" | "OIL_CHANGE";
  fuelType: "FLEX";
  color: string;
  description: string;
  installments: number;
  presentationMode: "GROUPED" | "DETAILED";
  displayOrder: number;
  active: boolean;
  published: boolean;
  scopeType: "GLOBAL" | "GROUP" | "COMPANY";
  targetGroupId: string;
  targetCompanyId: string;
  modelKeys: string[];
  revisionKms: number[];
  items: PackageDraftItem[];
};
export type SellingCustomer = { id: string; name: string; phone: string; email?: string };
export type SellingVehicle = { id: string; customerId: string; plate: string; description: string };
export type SellingIdentity = { displayName?: string; logo?: string; selectionColor?: string };
type SellingPaymentRule = { min: number; max: number | null; max_installments: number };
type SellingPaymentSetting = { id?: string; group_id: string | null; allow_pix: boolean; allow_debit: boolean; allow_credit: boolean; installment_rules: SellingPaymentRule[] };
type SellingCatalogKit = { id: string; name: string; visual_name?: string | null; description?: string | null; is_tire?: boolean; max_installments?: number | null; target_group_id?: string | null; target_company_id?: string | null; active: boolean; display_order?: number; items: SellingItem[] };
type SellingKitDraft = { kitId: string; name: string; visualName: string; description: string; showPrice: boolean; infoTitle: string; infoText: string; infoImageUrl: string; isTire: boolean; maxInstallments: number; active: boolean; displayOrder: number; scopeType: "GLOBAL" | "GROUP" | "COMPANY"; targetGroupId: string; targetCompanyId: string; items: PackageDraftItem[] };

type SellingTemplateIssue = { level?: "ERROR" | "WARNING"; sheet: string; row?: number; message: string };
type SellingTemplatePreview = {
  fileName: string;
  summary: { revisions: number; revisionItems: number; packages: number; packageItems: number; applications: number; revisionCreates: number; revisionUpdates: number; packageCreates: number; packageUpdates: number };
  samples: { revisions: Array<{ code: string; model: string; km: number; price: number; items: number }>; packages: Array<{ code: string; name: string; tier: string; models: number; revisions: number; items: number; published: boolean }> };
  errors: SellingTemplateIssue[]; warnings: SellingTemplateIssue[];
};
type PresentationUnit = { key: string; title: string; detail: string; total: number; referenceTotal: number; itemIds: string[]; itemCount: number; showPrice: boolean; hasCourtesy: boolean; courtesyItemIds: string[]; courtesyValue: number; courtesyLabel?: string; courtesyNote?: string; courtesyItems: string[]; infoTitle?: string; infoText?: string; infoImageUrl?: string; isRecommended?: boolean; recommendationText?: string };
type SellingAdHocItem = SellingItem & { id: string; item_type: "PART" | "SERVICE"; is_tire?: boolean; max_installments?: number | null };

const tierDefaults: Record<PackageDraft["tier"], { name: string; color: string; order: number; installments: number }> = {
  ESSENCIAL: { name: "Essencial", color: "#08c9ac", order: 10, installments: 2 },
  INTERMEDIARIO: { name: "Intermediário", color: "#6814f4", order: 20, installments: 3 },
  PREMIUM: { name: "Premium", color: "#ffae21", order: 30, installments: 4 },
};
function uid() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`; }
function money(value: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0); }
function kmLabel(value: number) { return `${new Intl.NumberFormat("pt-BR").format(value)} km`; }
function infoMedia(value: string) {
  const url=String(value||"").trim(); if(!url) return { kind:"NONE" as const, src:"" };
  try {
    const parsed=new URL(url); const host=parsed.hostname.replace(/^www\./,"").toLowerCase();
    if(host==="youtu.be"){ const id=parsed.pathname.split("/").filter(Boolean)[0]; if(id) return {kind:"EMBED" as const,src:`https://www.youtube.com/embed/${id}`}; }
    if(host.endsWith("youtube.com")){ const parts=parsed.pathname.split("/").filter(Boolean); const id=parsed.searchParams.get("v") || ((parts[0]==="shorts"||parts[0]==="embed")?parts[1]:""); if(id) return {kind:"EMBED" as const,src:`https://www.youtube.com/embed/${id}`}; }
    if(host==="vimeo.com"||host.endsWith(".vimeo.com")){ const id=parsed.pathname.split("/").filter(Boolean).find((part)=>/^\d+$/.test(part)); if(id) return {kind:"EMBED" as const,src:`https://player.vimeo.com/video/${id}`}; }
    if(/\.(mp4|webm|ogg)(?:$|\?)/i.test(url)) return {kind:"VIDEO" as const,src:url};
  } catch {}
  return {kind:"IMAGE" as const,src:url};
}
function normalize(value: string) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim(); }
function itemId(item: SellingItem, index: number) { return item.id || `${item.code || "item"}-${index}`; }
function itemTotal(item: SellingItem | PackageDraftItem) {
  const explicit = (item as PackageDraftItem).lineTotal ?? (item as SellingItem).line_total;
  if (explicit !== null && explicit !== undefined) return Math.max(0, Number(explicit) || 0);
  const quantity = Math.max(0, Number((item as PackageDraftItem).quantity ?? (item as SellingItem).quantity) || 0);
  const unit = Number((item as PackageDraftItem).unitPrice ?? (item as SellingItem).unit_price ?? 0) || 0;
  return quantity * unit;
}
function emptyDraft(tier: PackageDraft["tier"] = "ESSENCIAL", offerType: PackageDraft["offerType"] = "REVISION"): PackageDraft {
  const defaults = tierDefaults[tier];
  return { packageId: "", name: offerType === "OIL_CHANGE" ? `${defaults.name} · Troca de óleo` : defaults.name, tier, offerType, fuelType: "FLEX", color: defaults.color, description: offerType === "OIL_CHANGE" ? "Pacote de troca de óleo" : "", installments: defaults.installments, presentationMode: "GROUPED", displayOrder: defaults.order, active: true, published: false, scopeType: "GLOBAL", targetGroupId: "", targetCompanyId: "", modelKeys: [], revisionKms: [], items: [] };
}
function packageToDraft(pkg: SellingPackage): PackageDraft {
  return {
    packageId: pkg.id,
    name: pkg.name,
    tier: pkg.tier,
    offerType: pkg.offer_type === "OIL_CHANGE" ? "OIL_CHANGE" : "REVISION",
    fuelType: "FLEX",
    color: pkg.color || tierDefaults[pkg.tier].color,
    description: pkg.description || "",
    installments: Number(pkg.installments) || 1,
    presentationMode: pkg.presentation_mode === "DETAILED" ? "DETAILED" : "GROUPED",
    displayOrder: Number(pkg.display_order) || 0,
    active: pkg.active !== false,
    published: Boolean(pkg.published),
    scopeType: pkg.target_company_id ? "COMPANY" : pkg.target_group_id ? "GROUP" : "GLOBAL",
    targetGroupId: pkg.target_group_id || "",
    targetCompanyId: pkg.target_company_id || "",
    modelKeys: pkg.model_keys || [],
    revisionKms: pkg.revision_kms || [],
    items: (pkg.items || []).map((item) => ({
      id: item.id || uid(),
      itemType: item.item_class === "CHEMICAL" ? "CHEMICAL" : (["PART", "SERVICE", "LABOR"].includes(String(item.item_type)) ? item.item_type : "SERVICE") as PackageDraftItem["itemType"],
      code: item.code || "",
      description: item.description || "",
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unit_price) || 0,
      lineTotal: item.line_total === null || item.line_total === undefined ? null : Number(item.line_total),
      laborHours: Number(item.labor_hours) || 0,
      source: item.source || "MANUAL",
      sourceFile: item.source_file || "",
      categoryKey: item.category_key || "",
      categoryName: item.category_name || "",
      visualName: item.visual_name || "",
      showIndividual: Boolean(item.show_individual),
      showPrice: item.show_price !== false,
      infoTitle: item.info_title || "",
      infoText: item.info_text || "",
      infoImageUrl: item.info_image_url || "",
      isCourtesy: Boolean(item.is_courtesy),
      courtesyLabel: item.courtesy_label || "Cortesia",
      courtesyNote: item.courtesy_note || "",
      bundleKey: item.bundle_key || ((String(item.item_type || item.itemType) === "LABOR" || String(item.item_type || item.itemType) === "SERVICE") ? `SERVICE_${item.id || uid()}` : ""),
      bundleName: item.bundle_name || "",
      isTire: Boolean(item.is_tire),
      maxInstallments: item.max_installments ? Number(item.max_installments) : null,
    })),
  };
}
function moveItem<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length || from === to) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
function blankPackageItem(type: PackageDraftItem["itemType"] = "LABOR"): PackageDraftItem { const id=uid(); const service=type === "LABOR" || type === "SERVICE"; return { id, itemType: type, code: "", description: "", quantity: 1, unitPrice: 0, lineTotal: null, laborHours: 0, source: "MANUAL", sourceFile: "", categoryKey: "", categoryName: "", visualName: "", showIndividual: false, showPrice: true, infoTitle: "", infoText: "", infoImageUrl: "", isCourtesy: false, courtesyLabel: "Cortesia", courtesyNote: "", bundleKey: service ? `SERVICE_${id}` : "", bundleName: "", isTire:false, maxInstallments:null }; }
function moveDraftItemGroup(items: PackageDraftItem[], index: number, direction: -1 | 1) {
  if (!items[index]) return items;
  const keyOf = (item: PackageDraftItem) => normalize(item.bundleKey || "") || `ITEM_${item.id}`;
  const groups = new Map<string, PackageDraftItem[]>();
  const order: string[] = [];
  items.forEach((item) => { const key=keyOf(item); if(!groups.has(key)){groups.set(key,[]);order.push(key);} groups.get(key)!.push(item); });
  const currentKey=keyOf(items[index]); const currentIndex=order.indexOf(currentKey); const target=currentIndex+direction;
  if(currentIndex<0 || target<0 || target>=order.length) return items;
  const nextOrder=[...order]; [nextOrder[currentIndex],nextOrder[target]]=[nextOrder[target],nextOrder[currentIndex]];
  return nextOrder.flatMap((key)=>groups.get(key)||[]);
}
function packageUnits(pkg: SellingPackage): PresentationUnit[] {
  const ordered = [...(pkg.items || [])].sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0));
  const full = (item: SellingItem) => itemTotal(item);
  const courtesyName = (item: SellingItem) => String(item.visual_name || item.description || "Cortesia").trim();
  const recommendationText = (item: SellingItem) => String(item.recommendation_text || "").trim();
  const makeUnit = (item: SellingItem, index: number, key: string): PresentationUnit => {
    const id = itemId(item, index);
    const canCourtesy = Boolean(item.is_courtesy);
    return {
      key, title: item.visual_name || item.description,
      detail: String(item.info_text || "").trim(), total: full(item), referenceTotal: full(item), itemIds: [id], itemCount: 1,
      showPrice: item.show_price !== false, hasCourtesy: canCourtesy, courtesyItemIds: canCourtesy ? [id] : [], courtesyValue: canCourtesy ? full(item) : 0,
      courtesyLabel: item.courtesy_label || "Cortesia", courtesyNote: item.courtesy_note || "",
      courtesyItems: canCourtesy ? [courtesyName(item)] : [], infoTitle: item.info_title || "", infoText: item.info_text || "", infoImageUrl: item.info_image_url || "",
      isRecommended: Boolean(item.is_recommendation), recommendationText: recommendationText(item),
    };
  };
  if (pkg.presentation_mode === "DETAILED") return ordered.map((item, index) => makeUnit(item, index, `item-${itemId(item,index)}`));

  const units: PresentationUnit[] = [];
  const categoryMap = new Map<string, PresentationUnit>();
  const uncategorized: Array<{ item: SellingItem; index: number }> = [];

  ordered.forEach((item, index) => {
    const id = itemId(item, index);
    const rawKey = String(item.category_key || item.category_name || "").trim();
    if (rawKey && !item.show_individual) {
      const key = normalize(rawKey);
      const current = categoryMap.get(key);
      const title = String(item.visual_name || item.category_name || item.description || "Benefício").trim();
      const canCourtesy = Boolean(item.is_courtesy);
      if (current) {
        current.total += full(item); current.referenceTotal += full(item); current.itemIds.push(id); current.itemCount += 1;
        current.showPrice = current.showPrice && item.show_price !== false; current.infoText = current.infoText || item.info_text || "";
        current.infoImageUrl = current.infoImageUrl || item.info_image_url || "";
        if (canCourtesy) { current.hasCourtesy = true; current.courtesyItemIds.push(id); current.courtesyValue += full(item); current.courtesyItems.push(courtesyName(item)); current.courtesyLabel = item.courtesy_label || current.courtesyLabel || "Cortesia"; current.courtesyNote = item.courtesy_note || current.courtesyNote || ""; }
        if (item.is_recommendation) { current.isRecommended = true; current.recommendationText = current.recommendationText || recommendationText(item); }
      } else {
        const unit = makeUnit(item, index, `category-${key}-${index}`);
        unit.title = title; unit.detail = String(item.info_text || item.category_name || "").trim(); unit.infoTitle = item.info_title || title;
        categoryMap.set(key, unit); units.push(unit);
      }
    } else uncategorized.push({ item, index });
  });

  let legacy: PresentationUnit | null = null;
  uncategorized.forEach(({ item, index }) => {
    const id = itemId(item, index);
    const type = String(item.item_type || "SERVICE");
    if (type === "LABOR" || type === "SERVICE" || item.show_individual) {
      legacy = makeUnit(item, index, `legacy-${id}`); units.push(legacy);
    } else if (legacy && !item.show_individual) {
      legacy.total += full(item); legacy.referenceTotal += full(item); legacy.itemIds.push(id); legacy.itemCount += 1; legacy.showPrice = legacy.showPrice && item.show_price !== false; legacy.detail = `${legacy.itemCount - 1} peça${legacy.itemCount - 1 > 1 ? "s" : ""} inclusa${legacy.itemCount - 1 > 1 ? "s" : ""}`;
      if (item.is_courtesy) { legacy.hasCourtesy = true; legacy.courtesyItemIds.push(id); legacy.courtesyValue += full(item); legacy.courtesyItems.push(courtesyName(item)); legacy.courtesyLabel = item.courtesy_label || legacy.courtesyLabel || "Cortesia"; legacy.courtesyNote = item.courtesy_note || legacy.courtesyNote || ""; }
      if (item.is_recommendation) { legacy.isRecommended = true; legacy.recommendationText = legacy.recommendationText || recommendationText(item); }
    } else { const unit = makeUnit(item, index, `part-${id}`); units.push(unit); legacy = unit; }
  });
  return units;
}
function escapeHtml(value: string) { return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] || char)); }

export function MasterSellingManager({ sessionAccessToken }: { sessionAccessToken: string }) {
  const [data, setData] = useState<SellingMasterData>({ revisions: [], packages: [], groups: [], imports: [], paymentSettings: [], recommendations: [], catalogKits: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"PACKAGES" | "KITS" | "IMPORT" | "PAYMENTS" | "RECOMMENDATIONS">("PACKAGES");
  const [draft, setDraft] = useState<PackageDraft | null>(null);
  const [kitDraft, setKitDraft] = useState<SellingKitDraft | null>(null);
  const [paymentGroupId, setPaymentGroupId] = useState("");
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templatePreview, setTemplatePreview] = useState<SellingTemplatePreview | null>(null);
  const [recommendationDraft, setRecommendationDraft] = useState({ id: "", modelKey: "", title: "", description: "", intervalKm: 20000, intervalMonths: 24, priority: "IMPORTANT" as "INFO" | "IMPORTANT" | "SAFETY", active: true, catalogKitId: "", includeInPackages: true, showPrice: false });
  const [paymentDraft, setPaymentDraft] = useState<{ allowPix: boolean; allowDebit: boolean; allowCredit: boolean; rules: Array<{ min: number; max: number | null; maxInstallments: number }> }>({ allowPix: true, allowDebit: true, allowCredit: true, rules: [
    { min: 0, max: 250, maxInstallments: 1 }, { min: 250.01, max: 500, maxInstallments: 2 }, { min: 500.01, max: 1000, maxInstallments: 3 }, { min: 1000.01, max: null, maxInstallments: 4 },
  ] });

  async function apiGet() {
    const response = await fetch("/api/master/selling", { headers: { Authorization: `Bearer ${sessionAccessToken}` }, cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Não foi possível carregar o Selling.");
    setData(payload);
  }
  useEffect(() => { void (async () => { setLoading(true); setError(""); try { await apiGet(); } catch (e) { setError(e instanceof Error ? e.message : "Falha ao carregar Selling."); } finally { setLoading(false); } })(); }, [sessionAccessToken]);

  function loadPaymentDraft(groupId: string, source = data.paymentSettings) {
    setPaymentGroupId(groupId);
    const current = source.find((setting) => setting.group_id === groupId);
    setPaymentDraft(current ? { allowPix: current.allow_pix !== false, allowDebit: current.allow_debit !== false, allowCredit: current.allow_credit !== false, rules: (current.installment_rules || []).map((rule) => ({ min: Number(rule.min) || 0, max: rule.max === null ? null : Number(rule.max), maxInstallments: Number(rule.max_installments) || 1 })) } : { allowPix: true, allowDebit: true, allowCredit: true, rules: [
      { min: 0, max: 250, maxInstallments: 1 }, { min: 250.01, max: 500, maxInstallments: 2 }, { min: 500.01, max: 1000, maxInstallments: 3 }, { min: 1000.01, max: null, maxInstallments: 4 },
    ] });
  }
  async function savePaymentSettings() {
    if (!paymentGroupId || saving) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/master/selling", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionAccessToken}` }, body: JSON.stringify({ action: "save-payment-settings", groupId: paymentGroupId, allowPix: paymentDraft.allowPix, allowDebit: paymentDraft.allowDebit, allowCredit: paymentDraft.allowCredit, rules: paymentDraft.rules }) });
      const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || "Não foi possível salvar as condições.");
      if (payload.data) setData(payload.data); else await apiGet();
      setNotice("Condições de pagamento do grupo atualizadas.");
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao salvar condições."); } finally { setSaving(false); }
  }

  const models = useMemo(() => {
    const map = new Map<string, { key: string; name: string; fuel: string; year: string; revisionKms: number[] }>();
    data.revisions.filter((revision) => revision.fuel_type === "FLEX").forEach((revision) => {
      const current = map.get(revision.model_key) || { key: revision.model_key, name: revision.model_name, fuel: revision.fuel_type, year: revision.year_label || "", revisionKms: [] };
      if (!current.revisionKms.includes(Number(revision.revision_km))) current.revisionKms.push(Number(revision.revision_km));
      map.set(revision.model_key, current);
    });
    return Array.from(map.values()).map((item) => ({ ...item, revisionKms: item.revisionKms.sort((a, b) => a - b) })).sort((a, b) => a.name.localeCompare(b.name));
  }, [data.revisions]);
  const availableKms = draft ? Array.from(new Set(models.filter((model) => !draft.modelKeys.length || draft.modelKeys.includes(model.key)).flatMap((model) => model.revisionKms))).sort((a, b) => a - b) : [];
  const visiblePackages = data.packages.filter((pkg) => pkg.fuel_type === "FLEX");

  async function savePackage() {
    if (!draft || saving) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/master/selling", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionAccessToken}` },
        body: JSON.stringify({
          action: "save-package", packageId: draft.packageId || undefined, name: draft.name, tier: draft.tier, offerType: draft.offerType, fuelType: "FLEX", color: draft.color,
          description: draft.description, installments: draft.installments, presentationMode: draft.presentationMode, displayOrder: draft.displayOrder,
          active: draft.active, published: draft.published, targetGroupId: draft.scopeType === "GROUP" ? draft.targetGroupId : null, targetCompanyId: draft.scopeType === "COMPANY" ? draft.targetCompanyId : null,
          modelKeys: draft.modelKeys, revisionKms: draft.revisionKms, items: draft.items,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Não foi possível salvar o pacote.");
      if (payload.data) setData(payload.data); else await apiGet();
      setDraft(null); setNotice("Pacote salvo. Ordem, modelos, revisões e apresentação foram atualizados.");
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao salvar pacote."); } finally { setSaving(false); }
  }
  async function deletePackage(pkg: SellingPackage) {
    if (!window.confirm(`Excluir o pacote ${pkg.name}?`)) return;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/master/selling", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionAccessToken}` }, body: JSON.stringify({ action: "delete-package", packageId: pkg.id }) });
      const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || "Não foi possível excluir.");
      await apiGet();
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao excluir pacote."); } finally { setSaving(false); }
  }
  async function saveRecommendation() {
    if (!recommendationDraft.title.trim() || saving) return;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/master/selling", { method:"POST", headers:{"Content-Type":"application/json",Authorization:`Bearer ${sessionAccessToken}`}, body:JSON.stringify({ action:"save-recommendation", recommendationId: recommendationDraft.id || undefined, modelKey: recommendationDraft.modelKey || null, title: recommendationDraft.title, description: recommendationDraft.description, intervalKm: recommendationDraft.intervalKm, intervalMonths: recommendationDraft.intervalMonths, priority: recommendationDraft.priority, active: recommendationDraft.active, catalogKitId: recommendationDraft.catalogKitId || null, includeInPackages: recommendationDraft.includeInPackages, showPrice: recommendationDraft.showPrice }) });
      const payload=await response.json().catch(()=>({})); if(!response.ok) throw new Error(payload.error||"Não foi possível salvar a recomendação.");
      if(payload.data) setData(payload.data); else await apiGet();
      setRecommendationDraft({ id:"", modelKey:"", title:"", description:"", intervalKm:20000, intervalMonths:24, priority:"IMPORTANT", active:true, catalogKitId:"", includeInPackages:true, showPrice:false });
      setNotice("Recomendação da montadora salva.");
    } catch(e){ setError(e instanceof Error?e.message:"Falha ao salvar recomendação."); } finally { setSaving(false); }
  }
  async function deleteRecommendation(id:string) {
    if(!window.confirm("Excluir esta recomendação?")) return;
    const response=await fetch("/api/master/selling",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${sessionAccessToken}`},body:JSON.stringify({action:"delete-recommendation",recommendationId:id})});
    const payload=await response.json().catch(()=>({})); if(!response.ok) return setError(payload.error||"Não foi possível excluir.");
    if(payload.data) setData(payload.data); else await apiGet();
  }

  async function saveCatalogKit() {
    if (!kitDraft || saving || !kitDraft.name.trim()) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/master/selling", { method:"POST", headers:{"Content-Type":"application/json",Authorization:`Bearer ${sessionAccessToken}`}, body:JSON.stringify({ action:"save-kit", kitId:kitDraft.kitId || undefined, name:kitDraft.name, visualName:kitDraft.visualName, description:kitDraft.description, showPrice:kitDraft.showPrice, infoTitle:kitDraft.infoTitle, infoText:kitDraft.infoText, infoImageUrl:kitDraft.infoImageUrl, isTire:kitDraft.isTire, maxInstallments:kitDraft.maxInstallments, active:kitDraft.active, displayOrder:kitDraft.displayOrder, targetGroupId:kitDraft.scopeType === "GROUP" ? kitDraft.targetGroupId : null, targetCompanyId:kitDraft.scopeType === "COMPANY" ? kitDraft.targetCompanyId : null, items:kitDraft.items }) });
      const payload=await response.json().catch(()=>({})); if(!response.ok) throw new Error(payload.error||"Não foi possível salvar o kit.");
      if(payload.data) setData(payload.data); else await apiGet(); setKitDraft(null); setNotice("Kit avulso salvo no catálogo.");
    } catch(e){ setError(e instanceof Error?e.message:"Falha ao salvar kit."); } finally { setSaving(false); }
  }
  async function deleteCatalogKit(kit:SellingCatalogKit) {
    if(!window.confirm(`Excluir o kit ${kit.name}?`)) return;
    const response=await fetch("/api/master/selling",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${sessionAccessToken}`},body:JSON.stringify({action:"delete-kit",kitId:kit.id})});
    const payload=await response.json().catch(()=>({})); if(!response.ok) return setError(payload.error||"Não foi possível excluir o kit.");
    if(payload.data) setData(payload.data); else await apiGet();
  }
  function editCatalogKit(kit:SellingCatalogKit) {
    const lead=(kit.items||[]).find((item)=>item.info_text||item.info_image_url||item.info_title)||(kit.items||[])[0];
    setKitDraft({ kitId:kit.id, name:kit.name, visualName:kit.visual_name || kit.name, description:kit.description || "", showPrice:(kit.items||[]).every((item)=>item.show_price!==false), infoTitle:lead?.info_title||kit.visual_name||kit.name, infoText:lead?.info_text||kit.description||"", infoImageUrl:lead?.info_image_url||"", isTire:Boolean(kit.is_tire), maxInstallments:Number(kit.max_installments)||4, active:kit.active !== false, displayOrder:Number(kit.display_order)||0, scopeType:kit.target_company_id?"COMPANY":kit.target_group_id?"GROUP":"GLOBAL", targetGroupId:kit.target_group_id||"", targetCompanyId:kit.target_company_id||"", items:(kit.items||[]).map((item)=>({ ...blankPackageItem(item.item_class === "CHEMICAL" ? "CHEMICAL" : (item.item_type as PackageDraftItem["itemType"] || "PART")), id:item.id||uid(), code:item.code||"", description:item.description||"", quantity:Number(item.quantity)||1, unitPrice:Number(item.unit_price)||0, lineTotal:item.line_total===null||item.line_total===undefined?null:Number(item.line_total), laborHours:Number(item.labor_hours)||0, showPrice:item.show_price!==false, infoTitle:item.info_title||"", infoText:item.info_text||"", infoImageUrl:item.info_image_url||"", isCourtesy:Boolean(item.is_courtesy), courtesyLabel:item.courtesy_label||"Cortesia", courtesyNote:item.courtesy_note||"" })) });
  }

  async function previewStandardTemplate(event: ChangeEvent<HTMLInputElement>) {
    const file=event.target.files?.[0]; event.target.value=""; if(!file) return;
    setTemplateFile(file); setTemplatePreview(null); setSaving(true); setError(""); setNotice("Validando o padrão Gerivo...");
    try {
      const form=new FormData(); form.append("file",file); form.append("mode","preview");
      const response=await fetch("/api/master/selling/import-template",{method:"POST",headers:{Authorization:`Bearer ${sessionAccessToken}`},body:form});
      const payload=await response.json().catch(()=>({}));
      if(payload.preview) setTemplatePreview(payload.preview);
      if(!response.ok){ setNotice(""); setError(payload.error || (payload.preview?.errors?.length ? "A planilha possui erros. Corrija os itens destacados e valide novamente." : "Não foi possível validar a planilha.")); return; }
      const summary=payload.preview?.summary; setNotice(summary?`Prévia pronta: ${summary.revisions} revisões e ${summary.packages} pacotes. Confira antes de importar.`:"Prévia pronta para conferência.");
    } catch(e){ setNotice(""); setError(e instanceof Error?e.message:"Falha ao validar o padrão Gerivo."); } finally { setSaving(false); }
  }
  async function commitStandardTemplate() {
    if(!templateFile || !templatePreview || templatePreview.errors.length || saving) return;
    if(!window.confirm(`Importar ${templatePreview.summary.revisions} revisões e ${templatePreview.summary.packages} pacotes? Códigos já existentes serão atualizados.`)) return;
    setSaving(true); setError(""); setNotice("Importando revisões e pacotes do padrão Gerivo...");
    try {
      const form=new FormData(); form.append("file",templateFile); form.append("mode","commit");
      const response=await fetch("/api/master/selling/import-template",{method:"POST",headers:{Authorization:`Bearer ${sessionAccessToken}`},body:form});
      const payload=await response.json().catch(()=>({})); if(!response.ok) throw new Error(payload.error||"Não foi possível importar o padrão Gerivo.");
      const summary=payload.imported; setNotice(`Importação concluída: ${summary.revisions} revisões, ${summary.revisionItems} itens obrigatórios, ${summary.packages} pacotes e ${summary.packageItems} adicionais.`);
      setTemplateFile(null); setTemplatePreview(null); await apiGet();
    } catch(e){ setError(e instanceof Error?e.message:"Falha ao importar o padrão Gerivo."); } finally { setSaving(false); }
  }

  async function importWorkbook(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    setSaving(true); setError(""); setNotice("Lendo a planilha de revisões...");
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch("/api/master/selling/import", { method: "POST", headers: { Authorization: `Bearer ${sessionAccessToken}` }, body: form });
      const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || "Não foi possível importar.");
      setNotice(`Importação concluída: ${payload.models} modelos/aplicações, ${payload.revisions} revisões e ${payload.items} itens obrigatórios.`); await apiGet();
    } catch (e) { setError(e instanceof Error ? e.message : "Falha na importação."); } finally { setSaving(false); }
  }
  async function importPackagePdf(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file || !draft) return;
    if (draft.items.length && !window.confirm("Substituir os opcionais atuais pelos RECOMENDADOS deste PDF?")) return;
    setSaving(true); setError(""); setNotice("Lendo somente a seção RECOMENDADOS do Mobato...");
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch("/api/master/selling/import-package", { method: "POST", headers: { Authorization: `Bearer ${sessionAccessToken}` }, body: form });
      const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || "Não foi possível importar os recomendados.");
      const items: PackageDraftItem[] = (payload.items || []).map((item: any) => { const id=item.id || uid(); const itemType=(item.itemType || item.item_type || "SERVICE") as PackageDraftItem["itemType"]; const service=itemType === "LABOR" || itemType === "SERVICE"; return ({ ...item, id, itemType, sourceFile: payload.fileName || file.name, categoryKey: item.categoryKey || "", categoryName: item.categoryName || "", visualName: item.visualName || "", showIndividual: Boolean(item.showIndividual), showPrice: item.showPrice !== false, infoTitle: item.infoTitle || "", infoText: item.infoText || "", infoImageUrl: item.infoImageUrl || "", isCourtesy: false, courtesyLabel: "Cortesia", courtesyNote: "", bundleKey: item.bundleKey || (service ? `SERVICE_${id}` : ""), bundleName: item.bundleName || (service ? (item.visualName || item.description || "") : "") }); });
      setDraft({ ...draft, items, presentationMode: "GROUPED" });
      setNotice(`${payload.count} recomendados importados (${payload.laborCount} M.O. e ${payload.partCount} peças). Total do PDF: ${money(payload.total)}.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao importar PDF do pacote."); } finally { setSaving(false); }
  }

  if (loading) return <div className="selling-master-loading"><span />Carregando Selling Beta...</div>;
  return <section className="selling-master">
    <header className="selling-master-hero"><div><small>GERIVO / MASTER · SELLING v1.7.23 · BETA 07</small><h2>Pacotes agregados</h2><p>Configure pacotes de revisão e de troca de óleo. Cortesias são aplicadas durante a apresentação; recomendações periódicas podem entrar automaticamente nos três planos.</p></div><div className="selling-master-kpis"><span><b>{visiblePackages.length}</b>pacotes FLEX</span><span><b>{models.length}</b>modelos FLEX</span><span><b>{data.revisions.filter((revision) => revision.fuel_type === "FLEX").length}</b>revisões</span></div></header>
    <div className="selling-master-tabs"><button className={tab === "PACKAGES" ? "active" : ""} onClick={() => setTab("PACKAGES")}>Pacotes agregados</button><button className={tab === "KITS" ? "active" : ""} onClick={() => setTab("KITS")}>Kits avulsos</button><button className={tab === "IMPORT" ? "active" : ""} onClick={() => setTab("IMPORT")}>Planilhas / Revisões</button><button className={tab === "PAYMENTS" ? "active" : ""} onClick={() => { setTab("PAYMENTS"); if (!paymentGroupId && data.groups[0]) loadPaymentDraft(data.groups[0].id); }}>Pagamento</button><button className={tab === "RECOMMENDATIONS" ? "active" : ""} onClick={() => setTab("RECOMMENDATIONS")}>Recomendações</button></div>
    {error && <div className="selling-alert error">{error}</div>}{notice && <div className="selling-alert success">{notice}</div>}
    {tab === "PACKAGES" ? <>
      <div className="selling-master-toolbar"><div className="selling-flex-beta-badge">FLEX · fase inicial</div><div className="selling-master-create-actions"><button className="selling-new-package" onClick={() => setDraft(emptyDraft("ESSENCIAL", "REVISION"))}>+ Pacote de revisão</button><button className="selling-new-package oil" onClick={() => setDraft(emptyDraft("ESSENCIAL", "OIL_CHANGE"))}>+ Pacote troca de óleo</button></div></div>
      {!visiblePackages.length ? <div className="selling-empty"><b>Nenhum pacote FLEX criado.</b><span>Crie Essencial, Intermediário e Premium e vincule aos modelos/revisões.</span></div> : <div className="selling-admin-package-grid">{visiblePackages.map((pkg) => <article key={pkg.id} className="selling-admin-card" style={{ "--selling-color": pkg.color } as any}>
        <div className="selling-admin-card-head"><span>{pkg.tier === "INTERMEDIARIO" ? "INTERMEDIÁRIO" : pkg.tier}</span><em>{pkg.offer_type === "OIL_CHANGE" ? "TROCA DE ÓLEO" : "REVISÃO"} · FLEX</em></div><h3>{pkg.name}</h3><p>{pkg.description || "Pacote agregado à revisão obrigatória."}</p>
        <div className="selling-admin-stats"><span><b>{pkg.items.length}</b>linhas</span><span><b>{pkg.model_keys.length || "Todos"}</b>modelos</span><span><b>{pkg.revision_kms.length || "Todas"}</b>revisões</span></div>
        <div className="selling-admin-price"><small>Adicionais configurados</small><strong>{money(pkg.items.reduce((sum, item) => sum + itemTotal(item), 0))}</strong></div>
        <div className="selling-admin-flags"><span className={pkg.active ? "on" : "off"}>{pkg.active ? "Ativo" : "Inativo"}</span><span className={pkg.published ? "on" : "off"}>{pkg.published ? "Publicado" : "Rascunho"}</span><span>{pkg.presentation_mode === "DETAILED" ? "Detalhado" : "Agrupado"}</span></div>
        <footer><button onClick={() => setDraft(packageToDraft(pkg))}>Editar</button><button className="danger" onClick={() => void deletePackage(pkg)}>Excluir</button></footer>
      </article>)}</div>}
    </> : tab === "IMPORT" ? <div className="selling-import-layout">
      <article className="selling-import-card selling-standard-template-v9"><small>PADRÃO GERIVO · REVISÕES + PACOTES</small><h3>Criar ou atualizar pelo XLSX padrão</h3><p>Cadastre uma revisão preconizada completa e, no mesmo arquivo, os padrões Essencial, Intermediário e Premium. O código da revisão/pacote identifica atualizações futuras sem duplicar registros.</p><div className="selling-template-actions-v9"><a href="/templates/Gerivo_Modelo_Padrao_Revisoes_e_Pacotes.xlsx" download>↓ Baixar modelo padrão</a><label className={saving ? "disabled" : ""}>Validar planilha<input disabled={saving} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={previewStandardTemplate}/></label></div><div className="selling-import-rules"><span>✓ REVISOES + ITENS_REVISAO criam o preconizado.</span><span>✓ PACOTES + APLICACOES + ITENS_PACOTE criam os 3 níveis comerciais.</span><span>✓ Primeiro valida e mostra o que será criado/atualizado; só depois grava.</span></div>{templatePreview&&<div className={`selling-template-preview-v9 ${templatePreview.errors.length?"has-errors":"ready"}`}><header><div><small>PRÉVIA · {templatePreview.fileName}</small><b>{templatePreview.errors.length?"Corrija antes de importar":"Pronto para importar"}</b></div><span>{templatePreview.warnings.length} aviso(s)</span></header><div className="selling-template-kpis-v9"><span><b>{templatePreview.summary.revisions}</b>revisões<small>{templatePreview.summary.revisionCreates} novas · {templatePreview.summary.revisionUpdates} atualizações</small></span><span><b>{templatePreview.summary.revisionItems}</b>itens obrigatórios<small>preconizado</small></span><span><b>{templatePreview.summary.packages}</b>pacotes<small>{templatePreview.summary.packageCreates} novos · {templatePreview.summary.packageUpdates} atualizações</small></span><span><b>{templatePreview.summary.packageItems}</b>adicionais<small>itens comerciais</small></span></div>{templatePreview.errors.length>0&&<div className="selling-template-issues-v9 errors"><b>Erros</b>{templatePreview.errors.slice(0,12).map((item,index)=><span key={`e-${index}`}>{item.sheet}{item.row?` · linha ${item.row}`:""}: {item.message}</span>)}</div>}{templatePreview.warnings.length>0&&<div className="selling-template-issues-v9 warnings"><b>Avisos</b>{templatePreview.warnings.slice(0,8).map((item,index)=><span key={`w-${index}`}>{item.sheet}{item.row?` · linha ${item.row}`:""}: {item.message}</span>)}</div>}<button className="selling-template-commit-v9" disabled={saving||templatePreview.errors.length>0} onClick={()=>void commitStandardTemplate()}>{saving?"Processando...":templatePreview.errors.length?"Corrija a planilha para importar":"Importar revisões e pacotes"}</button></div>}</article>
      <article className="selling-import-card"><small>BASE OFICIAL NISSAN</small><h3>Importar planilha Nissan</h3><p>Atualiza peças, mão de obra, preços e quilometragens obrigatórias a partir do layout oficial Nissan. Não altera os pacotes comerciais.</p><label className={saving ? "disabled" : ""}>Selecionar XLSX Nissan<input disabled={saving} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={importWorkbook} /></label><div className="selling-import-rules"><span>✓ Revisão obrigatória é igual nos três planos.</span><span>✓ Pacotes adicionais não são alterados.</span><span>✓ FLEX é a família publicada nesta beta.</span></div></article>
      <section className="selling-model-list"><header><b>Modelos FLEX disponíveis</b><span>{models.length}</span></header>{models.slice(0, 80).map((model) => <div key={model.key}><span><b>{model.name}</b><small>{model.year || model.key}</small></span><em className="fuel-flex">FLEX</em><strong>{model.revisionKms.map(kmLabel).join(" · ")}</strong></div>)}</section>
      <section className="selling-import-history"><header><b>Últimas importações</b></header>{data.imports.length ? data.imports.map((entry) => <div key={entry.id}><span><b>{entry.file_name}</b><small>{new Date(entry.created_at).toLocaleString("pt-BR")}</small></span><em className={entry.status.toLowerCase()}>{entry.status}</em><strong>{entry.revisions_count} revisões · {entry.items_count} itens</strong></div>) : <p>Nenhuma importação registrada.</p>}</section>
    </div> : tab === "PAYMENTS" ? <div className="selling-payment-master"><article><small>CONDIÇÕES COMERCIAIS DO SELLING</small><h3>Pagamento por grupo</h3><p>Defina o parcelamento máximo conforme o valor total apresentado ao cliente. A operação mostra Débito/Pix e todas as parcelas de crédito até o limite da faixa.</p><label>Grupo<select value={paymentGroupId} onChange={(e) => loadPaymentDraft(e.target.value)}><option value="">Selecione...</option>{data.groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><div className="selling-payment-flags"><label><input type="checkbox" checked={paymentDraft.allowPix} onChange={(e) => setPaymentDraft({ ...paymentDraft, allowPix: e.target.checked })} /> Pix</label><label><input type="checkbox" checked={paymentDraft.allowDebit} onChange={(e) => setPaymentDraft({ ...paymentDraft, allowDebit: e.target.checked })} /> Débito</label><label><input type="checkbox" checked={paymentDraft.allowCredit} onChange={(e) => setPaymentDraft({ ...paymentDraft, allowCredit: e.target.checked })} /> Crédito</label></div><div className="selling-payment-rules"><header><span>Valor mínimo</span><span>Valor máximo</span><span>Máx. parcelas</span><span /></header>{paymentDraft.rules.map((rule, index) => <div key={index}><input type="number" min="0" step="0.01" value={rule.min} onChange={(e) => { const rules=[...paymentDraft.rules]; rules[index]={...rule,min:Number(e.target.value)}; setPaymentDraft({...paymentDraft,rules}); }} /><input type="number" min="0" step="0.01" value={rule.max ?? ""} placeholder="Sem limite" onChange={(e) => { const rules=[...paymentDraft.rules]; rules[index]={...rule,max:e.target.value===""?null:Number(e.target.value)}; setPaymentDraft({...paymentDraft,rules}); }} /><input type="number" min="1" max="12" value={rule.maxInstallments} onChange={(e) => { const rules=[...paymentDraft.rules]; rules[index]={...rule,maxInstallments:Number(e.target.value)}; setPaymentDraft({...paymentDraft,rules}); }} /><button onClick={() => setPaymentDraft({...paymentDraft,rules:paymentDraft.rules.filter((_,i)=>i!==index)})}>×</button></div>)}</div><div className="selling-payment-actions"><button className="outline" onClick={() => setPaymentDraft({...paymentDraft,rules:[...paymentDraft.rules,{min:0,max:null,maxInstallments:1}]})}>+ Faixa</button><button className="primary" disabled={!paymentGroupId || saving} onClick={() => void savePaymentSettings()}>{saving ? "Salvando..." : "Salvar condições"}</button></div></article></div> : tab === "RECOMMENDATIONS" ? <div className="selling-recommendations-master"><article className="selling-rec-form"><small>RECOMENDAÇÕES DA MONTADORA</small><h3>Itens periódicos por km / tempo</h3><p>O intervalo é recorrente: 20.000 km aparece em 20, 40, 60, 80 mil km — não em todas as revisões seguintes. Vincule um kit para inserir o serviço automaticamente como primeiro item dos três planos.</p><div className="selling-rec-grid"><label>Modelo<select value={recommendationDraft.modelKey} onChange={(e)=>setRecommendationDraft({...recommendationDraft,modelKey:e.target.value})}><option value="">Todos os modelos FLEX</option>{models.map((model)=><option key={model.key} value={model.key}>{model.name}</option>)}</select></label><label>Prioridade<select value={recommendationDraft.priority} onChange={(e)=>setRecommendationDraft({...recommendationDraft,priority:e.target.value as any})}><option value="INFO">Informativa</option><option value="IMPORTANT">Importante</option><option value="SAFETY">Segurança</option></select></label><label>Intervalo em km<input type="number" min="0" step="1000" value={recommendationDraft.intervalKm} onChange={(e)=>setRecommendationDraft({...recommendationDraft,intervalKm:Number(e.target.value)})} /></label><label>Intervalo em meses<input type="number" min="0" value={recommendationDraft.intervalMonths} onChange={(e)=>setRecommendationDraft({...recommendationDraft,intervalMonths:Number(e.target.value)})} /></label><label className="wide">Título<input value={recommendationDraft.title} onChange={(e)=>setRecommendationDraft({...recommendationDraft,title:e.target.value})} placeholder="Ex.: Substituição do fluido de freio" /></label><label className="wide">Kit / serviço que entra nos planos<select value={recommendationDraft.catalogKitId} onChange={(e)=>setRecommendationDraft({...recommendationDraft,catalogKitId:e.target.value})}><option value="">Somente aviso, sem item automático</option>{data.catalogKits.filter((kit)=>kit.active).map((kit)=><option key={kit.id} value={kit.id}>{kit.visual_name || kit.name}</option>)}</select></label><label className="wide">Explicação<textarea rows={3} value={recommendationDraft.description} onChange={(e)=>setRecommendationDraft({...recommendationDraft,description:e.target.value})} placeholder="Ex.: recomendada a cada 24 meses ou 20.000 km" /></label></div><div className="selling-rec-options-v6"><label><input type="checkbox" checked={recommendationDraft.includeInPackages} onChange={(e)=>setRecommendationDraft({...recommendationDraft,includeInPackages:e.target.checked})}/> Inserir automaticamente como primeiro item dos 3 planos</label><label><input type="checkbox" checked={recommendationDraft.showPrice} onChange={(e)=>setRecommendationDraft({...recommendationDraft,showPrice:e.target.checked})}/> Exibir valor deste recomendado no card</label></div><button className="primary" disabled={saving || !recommendationDraft.title.trim()} onClick={()=>void saveRecommendation()}>Salvar recomendação</button></article><section className="selling-rec-list">{data.recommendations.length ? data.recommendations.map((rec)=><article key={rec.id}><i>!</i><div><b>{rec.title}</b><span>{rec.description}</span><small>{rec.model_key || "Todos os modelos"} · a cada {rec.interval_km || rec.min_km ? kmLabel(Number(rec.interval_km || rec.min_km)) : "km não definido"}{Number(rec.interval_months || rec.min_months) ? ` ou ${Number(rec.interval_months || rec.min_months)} meses` : ""}{rec.catalog_kit_id ? ` · kit vinculado` : " · somente aviso"}</small></div><button onClick={()=>setRecommendationDraft({id:rec.id,modelKey:rec.model_key||"",title:rec.title,description:rec.description,intervalKm:Number(rec.interval_km || rec.min_km)||0,intervalMonths:Number(rec.interval_months || rec.min_months)||0,priority:rec.priority,active:rec.active,catalogKitId:rec.catalog_kit_id||"",includeInPackages:rec.include_in_packages!==false,showPrice:rec.show_price===true})}>Editar</button><button className="danger" onClick={()=>void deleteRecommendation(rec.id)}>Excluir</button></article>) : <div className="selling-empty">Nenhuma recomendação cadastrada.</div>}</section></div> : null}

    {tab === "KITS" && <section className="selling-kits-master-v6"><div className="selling-kits-master-head-v6"><div><small>CATÁLOGO REUTILIZÁVEL</small><h3>Kits de serviço / químicos</h3><p>Monte uma vez e adicione avulso em qualquer plano durante a apresentação.</p></div><button className="selling-new-package" onClick={()=>setKitDraft({kitId:"",name:"",visualName:"",description:"",showPrice:true,infoTitle:"",infoText:"",infoImageUrl:"",isTire:false,maxInstallments:4,active:true,displayOrder:0,scopeType:"GLOBAL",targetGroupId:"",targetCompanyId:"",items:[blankPackageItem("SERVICE"),blankPackageItem("CHEMICAL")]})}>+ Novo kit</button></div><div className="selling-kits-grid-v6">{data.catalogKits.length ? data.catalogKits.map((kit)=><article key={kit.id}><div><small>{kit.is_tire?"PNEU / CONDIÇÃO ESPECIAL":"KIT AVULSO"}</small><h4>{kit.visual_name || kit.name}</h4><p>{kit.description || `${kit.items.length} componente(s)`}</p></div><strong>{money((kit.items||[]).reduce((sum,item)=>sum+itemTotal(item),0))}</strong><footer><button onClick={()=>editCatalogKit(kit)}>Editar</button><button className="danger" onClick={()=>void deleteCatalogKit(kit)}>Excluir</button></footer></article>) : <div className="selling-empty"><b>Nenhum kit criado.</b><span>Ex.: troca de fluido de freio, limpeza interna do motor, higienização do A/C.</span></div>}</div></section>}

    {kitDraft && <div className="selling-editor-backdrop" onMouseDown={(event)=>{if(event.target===event.currentTarget&&!saving)setKitDraft(null)}}><section className="selling-kit-editor-v6"><header><div><small>KIT AVULSO · FLEX</small><h2>{kitDraft.kitId?`Editar ${kitDraft.name}`:"Novo kit"}</h2><p>Vincule serviço, peça e químico em um conjunto reutilizável.</p></div><button onClick={()=>setKitDraft(null)}>×</button></header><div className="selling-kit-editor-body-v6"><div className="selling-editor-grid"><label>Nome<input value={kitDraft.name} onChange={(e)=>setKitDraft({...kitDraft,name:e.target.value})}/></label><label>Nome visual<input value={kitDraft.visualName} onChange={(e)=>setKitDraft({...kitDraft,visualName:e.target.value})}/></label><label>Posição<input type="number" value={kitDraft.displayOrder} onChange={(e)=>setKitDraft({...kitDraft,displayOrder:Number(e.target.value)})}/></label><label className="selling-tire-check-v4"><input type="checkbox" checked={kitDraft.isTire} onChange={(e)=>setKitDraft({...kitDraft,isTire:e.target.checked})}/> Kit de pneu</label><label className="selling-kit-show-price-v8"><input type="checkbox" checked={kitDraft.showPrice} onChange={(e)=>setKitDraft({...kitDraft,showPrice:e.target.checked})}/> Exibir valor do kit no Selling</label><label className="wide">Descrição<input value={kitDraft.description} onChange={(e)=>setKitDraft({...kitDraft,description:e.target.value})}/></label><label>Título da informação<input value={kitDraft.infoTitle} onChange={(e)=>setKitDraft({...kitDraft,infoTitle:e.target.value})} placeholder={kitDraft.visualName||kitDraft.name||"Nome do serviço"}/></label><label className="wide">Texto demonstrativo<input value={kitDraft.infoText} onChange={(e)=>setKitDraft({...kitDraft,infoText:e.target.value})} placeholder="Benefício, explicação ou orientação ao cliente"/></label><label className="wide">Imagem ou vídeo (URL)<input value={kitDraft.infoImageUrl} onChange={(e)=>setKitDraft({...kitDraft,infoImageUrl:e.target.value})} placeholder="Imagem, YouTube, Vimeo ou MP4"/></label>{kitDraft.isTire&&<label>Máx. parcelas com pneu<input type="number" min="1" max="24" value={kitDraft.maxInstallments} onChange={(e)=>setKitDraft({...kitDraft,maxInstallments:Number(e.target.value)})}/></label>}</div><h3>Componentes</h3><div className="selling-kit-components-v6">{kitDraft.items.map((item,index)=><div key={item.id}><select value={item.itemType} onChange={(e)=>{const items=[...kitDraft.items];items[index]={...item,itemType:e.target.value as PackageDraftItem["itemType"]};setKitDraft({...kitDraft,items})}}><option value="SERVICE">Serviço</option><option value="LABOR">Mão de obra</option><option value="CHEMICAL">Químico / produto</option><option value="PART">Peça</option></select><input value={item.code} onChange={(e)=>{const items=[...kitDraft.items];items[index]={...item,code:e.target.value};setKitDraft({...kitDraft,items})}} placeholder="Código"/><input value={item.description} onChange={(e)=>{const items=[...kitDraft.items];items[index]={...item,description:e.target.value};setKitDraft({...kitDraft,items})}} placeholder="Descrição"/><input type="number" step="0.01" value={item.quantity} onChange={(e)=>{const items=[...kitDraft.items];items[index]={...item,quantity:Number(e.target.value)};setKitDraft({...kitDraft,items})}}/><input type="number" step="0.01" value={item.unitPrice} onChange={(e)=>{const items=[...kitDraft.items];items[index]={...item,unitPrice:Number(e.target.value)};setKitDraft({...kitDraft,items})}}/><label title="Permitir cortesia durante a apresentação"><input type="checkbox" checked={item.isCourtesy} onChange={(e)=>{const items=[...kitDraft.items];items[index]={...item,isCourtesy:e.target.checked};setKitDraft({...kitDraft,items})}}/> Permitir *</label><button className="selling-remove-item" onClick={()=>setKitDraft({...kitDraft,items:kitDraft.items.filter((_,i)=>i!==index)})}>×</button></div>)}</div><button className="selling-add-item" onClick={()=>setKitDraft({...kitDraft,items:[...kitDraft.items,blankPackageItem("CHEMICAL")]})}>+ Componente</button></div><footer><button className="outline" onClick={()=>setKitDraft(null)}>Cancelar</button><button className="primary" disabled={!kitDraft.name.trim()||!kitDraft.items.some((item)=>item.description.trim())} onClick={()=>void saveCatalogKit()}>Salvar kit</button></footer></section></div>}

    {draft && <div className="selling-editor-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setDraft(null); }}><section className="selling-package-editor" role="dialog" aria-modal="true">
      <header><div><small>{draft.offerType === "OIL_CHANGE" ? "PACOTE TROCA DE ÓLEO" : "PACOTE AGREGADO"} · FLEX</small><h2>{draft.packageId ? `Editar ${draft.name}` : "Novo pacote Selling"}</h2><p>{draft.offerType === "OIL_CHANGE" ? "Pacote independente de revisão: os itens cadastrados compõem a troca de óleo apresentada ao cliente." : "Os itens opcionais ficam coloridos na apresentação; a revisão obrigatória entra automaticamente em todos os cards."}</p></div><button disabled={saving} onClick={() => setDraft(null)}>×</button></header>
      <div className="selling-package-editor-body">
        <div className="selling-editor-section"><h3>1. Identificação</h3><div className="selling-editor-grid"><label>Nome<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label><label>Nível<select value={draft.tier} onChange={(e) => { const tier = e.target.value as PackageDraft["tier"]; const defaults = tierDefaults[tier]; setDraft({ ...draft, tier, name: draft.packageId ? draft.name : draft.offerType === "OIL_CHANGE" ? `${defaults.name} · Troca de óleo` : defaults.name, color: draft.packageId ? draft.color : defaults.color, installments: draft.packageId ? draft.installments : defaults.installments, displayOrder: draft.packageId ? draft.displayOrder : defaults.order }); }}><option value="ESSENCIAL">Essencial</option><option value="INTERMEDIARIO">Intermediário</option><option value="PREMIUM">Premium</option></select></label><label>Tipo de oferta<select value={draft.offerType} onChange={(e)=>setDraft({...draft,offerType:e.target.value as PackageDraft["offerType"],revisionKms:e.target.value === "OIL_CHANGE" ? [] : draft.revisionKms})}><option value="REVISION">Revisão + agregados</option><option value="OIL_CHANGE">Troca de óleo</option></select></label><label>Família<div className="selling-fixed-family">FLEX <small>Beta inicial</small></div></label><label>Cor<div className="selling-color-field"><input type="color" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} /><input value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} /></div></label><label className="wide">Descrição<input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Ex.: Proteção, conforto e conservação" /></label></div></div>

        <div className="selling-editor-section"><div className="selling-section-title-row"><div><h3>2. Opcionais do pacote</h3><p className="selling-section-help">A posição abaixo é a mesma posição apresentada ao cliente. Use ↑ e ↓ para ordenar.</p></div><label className="selling-package-pdf-import">Importar RECOMENDADOS Mobato<input disabled={saving} type="file" accept="application/pdf,.pdf" onChange={importPackagePdf} /></label></div>
          <div className="selling-pdf-rule">PDF Mobato: somente a tabela <b>RECOMENDADOS</b> · <b>negrito = mão de obra</b> · texto normal = peça.</div>
          <div className="selling-items-editor"><div className="selling-items-header selling-items-header-v2"><span>Pos.</span><span>Tipo</span><span>Código</span><span>Descrição técnica</span><span>Qtd.</span><span>Valor un.</span><span>Total</span><span>M.O. h</span><span /></div>{draft.items.map((item, index) => <div className="selling-item-row-shell" key={item.id}>
            <div className="selling-item-row selling-item-row-v2">
              <div className="selling-item-position"><button disabled={index === 0} title="Mover para cima" onClick={() => setDraft({ ...draft, items: moveDraftItemGroup(draft.items, index, -1) })}>↑</button><span>{index + 1}</span><button disabled={index === draft.items.length - 1} title="Mover para baixo" onClick={() => setDraft({ ...draft, items: moveDraftItemGroup(draft.items, index, 1) })}>↓</button></div>
              <select value={item.itemType} onChange={(e) => { const items = [...draft.items]; const itemType=e.target.value as PackageDraftItem["itemType"]; const service=itemType === "LABOR" || itemType === "SERVICE"; items[index] = { ...item, itemType, bundleKey: service ? (item.bundleKey || `SERVICE_${item.id}`) : item.bundleKey, bundleName: service ? (item.bundleName || item.visualName || item.description) : item.bundleName }; setDraft({ ...draft, items }); }}><option value="LABOR">Mão de obra</option><option value="SERVICE">Serviço</option><option value="CHEMICAL">Químico / produto</option><option value="PART">Peça</option></select>
              <input value={item.code} onChange={(e) => { const items = [...draft.items]; items[index] = { ...item, code: e.target.value }; setDraft({ ...draft, items }); }} />
              <input value={item.description} onChange={(e) => { const items = [...draft.items]; items[index] = { ...item, description: e.target.value }; setDraft({ ...draft, items }); }} placeholder="Descrição técnica do adicional" />
              <input type="number" min="0.001" step="0.1" value={item.quantity} onChange={(e) => { const items = [...draft.items]; items[index] = { ...item, quantity: Number(e.target.value) }; setDraft({ ...draft, items }); }} />
              <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => { const items = [...draft.items]; items[index] = { ...item, unitPrice: Number(e.target.value), lineTotal: item.source === "MANUAL" ? null : item.lineTotal }; setDraft({ ...draft, items }); }} />
              <input type="number" min="0" step="0.01" value={item.lineTotal === null ? Number((item.quantity * item.unitPrice).toFixed(2)) : item.lineTotal} onChange={(e) => { const items = [...draft.items]; items[index] = { ...item, lineTotal: Math.max(0, Number(e.target.value) || 0) }; setDraft({ ...draft, items }); }} />
              <input type="number" min="0" step="0.1" value={item.laborHours} onChange={(e) => { const items = [...draft.items]; items[index] = { ...item, laborHours: Number(e.target.value) }; setDraft({ ...draft, items }); }} />
              <button className="selling-remove-item" onClick={() => setDraft({ ...draft, items: draft.items.filter((_, itemIndex) => itemIndex !== index) })}>×</button>
            </div>
            <div className="selling-item-category-row selling-item-category-row-v4">{(item.itemType === "PART" || item.itemType === "CHEMICAL") ? <label>Vincular à mão de obra<select value={item.bundleKey} onChange={(e)=>{const service=draft.items.find((candidate)=>candidate.bundleKey===e.target.value);const items=[...draft.items];items[index]={...item,bundleKey:e.target.value,bundleName:service?.bundleName||service?.visualName||service?.description||""};setDraft({...draft,items});}}><option value="">Sem vínculo</option>{draft.items.filter((candidate)=>candidate.itemType === "LABOR" || candidate.itemType === "SERVICE").map((candidate,serviceIndex)=><option key={candidate.id} value={candidate.bundleKey || `SERVICE_${candidate.id}`}>{candidate.bundleName || candidate.visualName || candidate.description || `Serviço ${serviceIndex+1}`}</option>)}</select></label> : <label>Vínculo do serviço<input value={item.bundleKey || `SERVICE_${item.id}`} onFocus={()=>{if(!item.bundleKey){const items=[...draft.items];items[index]={...item,bundleKey:`SERVICE_${item.id}`,bundleName:item.bundleName||item.visualName||item.description};setDraft({...draft,items});}}} onChange={(e)=>{const items=[...draft.items];items[index]={...item,bundleKey:e.target.value};setDraft({...draft,items});}} /></label>}<label>Nome do conjunto<input value={item.bundleName} onChange={(e)=>{const items=[...draft.items];items[index]={...item,bundleName:e.target.value};setDraft({...draft,items});}} placeholder="Ex.: Troca fluido de freio" /></label><label>Categoria<input value={item.categoryKey} onChange={(e) => { const items=[...draft.items]; const categoryKey=e.target.value; items[index]={...item,categoryKey,categoryName:item.categoryName || categoryKey}; setDraft({...draft,items}); }} placeholder="Ex.: HIGIENIZACAO_AC" /></label><label>Nome visual no card<input value={item.visualName} onChange={(e) => { const items=[...draft.items]; items[index]={...item,visualName:e.target.value,categoryName:e.target.value || item.categoryName}; setDraft({...draft,items}); }} placeholder="Ex.: Higienização do A/C" /></label><label>Descrição / benefício<input value={item.infoText} onChange={(e) => { const items=[...draft.items]; items[index]={...item,infoText:e.target.value}; setDraft({...draft,items}); }} placeholder="Ex.: reduz odores e impurezas do sistema" /></label><label>Imagem ou vídeo (URL)<input value={item.infoImageUrl} onChange={(e) => { const items=[...draft.items]; items[index]={...item,infoImageUrl:e.target.value}; setDraft({...draft,items}); }} placeholder="Imagem, YouTube, Vimeo ou MP4" /></label><label className="selling-item-individual"><input type="checkbox" checked={item.showIndividual} onChange={(e) => { const items=[...draft.items]; items[index]={...item,showIndividual:e.target.checked}; setDraft({...draft,items}); }} /> Mostrar separado</label><label className="selling-item-individual"><input type="checkbox" checked={item.showPrice} onChange={(e) => { const items=[...draft.items]; items[index]={...item,showPrice:e.target.checked}; setDraft({...draft,items}); }} /> Exibir valor</label><label className="selling-item-individual courtesy"><input type="checkbox" checked={item.isCourtesy} onChange={(e) => { const items=[...draft.items]; items[index]={...item,isCourtesy:e.target.checked}; setDraft({...draft,items}); }} /> Permitir botão * de cortesia</label>{item.isCourtesy && <><label>Nome da condição<input value={item.courtesyLabel} onChange={(e)=>{const items=[...draft.items];items[index]={...item,courtesyLabel:e.target.value};setDraft({...draft,items});}} placeholder="Cortesia" /></label><label>Explicação ao aplicar cortesia<input value={item.courtesyNote} onChange={(e)=>{const items=[...draft.items];items[index]={...item,courtesyNote:e.target.value};setDraft({...draft,items});}} placeholder="Ex.: Cortesia comercial — o valor será retirado do total ao clicar em *" /></label></>}</div>
          </div>)}<button className="selling-add-item" onClick={() => setDraft({ ...draft, items: [...draft.items, blankPackageItem("LABOR")] })}>+ Adicionar peça / mão de obra</button></div>
          <div className="selling-presentation-mode"><b>Como mostrar os adicionais ao cliente?</b><label className={draft.presentationMode === "GROUPED" ? "selected" : ""}><input type="radio" checked={draft.presentationMode === "GROUPED"} onChange={() => setDraft({ ...draft, presentationMode: "GROUPED" })} /><span><strong>Agrupar por categoria</strong><small>Itens com a mesma categoria viram um único benefício visual. Sem categoria, mantém a lógica mão de obra + peças seguintes.</small></span></label><label className={draft.presentationMode === "DETAILED" ? "selected" : ""}><input type="radio" checked={draft.presentationMode === "DETAILED"} onChange={() => setDraft({ ...draft, presentationMode: "DETAILED" })} /><span><strong>Detalhar item a item</strong><small>Mostra cada peça e cada mão de obra separadamente.</small></span></label><em>Total cobrado: {money(draft.items.reduce((sum, item) => sum + itemTotal(item), 0))} · Referência: {money(draft.items.reduce((sum, item) => sum + itemTotal(item), 0))}</em></div>
        </div>

        <div className="selling-editor-section"><h3>3. Aplicação</h3><p className="selling-section-help">Nesta fase somente modelos FLEX são liberados. Selecione exatamente os modelos e revisões em que o pacote deve aparecer.</p><div className="selling-model-checks">{models.length ? models.map((model) => <label key={model.key} className={draft.modelKeys.includes(model.key) ? "selected" : ""}><input type="checkbox" checked={draft.modelKeys.includes(model.key)} onChange={() => setDraft({ ...draft, modelKeys: draft.modelKeys.includes(model.key) ? draft.modelKeys.filter((key) => key !== model.key) : [...draft.modelKeys, model.key], revisionKms: [] })} /><span><b>{model.name}</b><small>{model.year || "FLEX"}</small></span></label>) : <div className="selling-empty-inline">Importe a planilha para liberar os modelos.</div>}</div>{draft.offerType === "REVISION" ? <><h4>Revisões em que o pacote aparece</h4><div className="selling-km-checks">{availableKms.map((km) => <label key={km} className={draft.revisionKms.includes(km) ? "selected" : ""}><input type="checkbox" checked={draft.revisionKms.includes(km)} onChange={() => setDraft({ ...draft, revisionKms: draft.revisionKms.includes(km) ? draft.revisionKms.filter((value) => value !== km) : [...draft.revisionKms, km] })} />{kmLabel(km)}</label>)}</div></> : <div className="selling-oil-master-note"><b>Troca de óleo</b><span>Este pacote aparece pelo modelo selecionado e não depende de quilometragem de revisão.</span></div>}</div>

        <div className="selling-editor-section"><h3>4. Publicação e posição</h3><div className="selling-editor-grid"><label>Escopo<select value={draft.scopeType} onChange={(e) => setDraft({ ...draft, scopeType: e.target.value as PackageDraft["scopeType"], targetGroupId: "", targetCompanyId: "" })}><option value="GLOBAL">Todas as operações com Selling</option><option value="GROUP">Somente um grupo</option><option value="COMPANY">Somente uma empresa</option></select></label>{draft.scopeType === "GROUP" && <label>Grupo<select value={draft.targetGroupId} onChange={(e) => setDraft({ ...draft, targetGroupId: e.target.value })}><option value="">Selecione...</option>{data.groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>}{draft.scopeType === "COMPANY" && <label>Empresa<select value={draft.targetCompanyId} onChange={(e) => setDraft({ ...draft, targetCompanyId: e.target.value })}><option value="">Selecione...</option>{data.groups.flatMap((group) => (group.companies || []).map((company) => <option key={company.id} value={company.id}>{group.name} · {company.name}</option>))}</select></label>}<label>Parcelamento<input type="number" min="1" max="24" value={draft.installments} onChange={(e) => setDraft({ ...draft, installments: Number(e.target.value) })} /></label><label>Posição do plano<input type="number" min="0" value={draft.displayOrder} onChange={(e) => setDraft({ ...draft, displayOrder: Number(e.target.value) })} /></label></div><div className="selling-publish-toggles"><label><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Ativo</label><label><input type="checkbox" checked={draft.published} onChange={(e) => setDraft({ ...draft, published: e.target.checked })} /> Publicado na operação</label></div></div>
      </div>
      <footer><button className="outline" disabled={saving} onClick={() => setDraft(null)}>Cancelar</button><button className="primary" disabled={saving || draft.name.trim().length < 2 || !draft.modelKeys.length || (draft.offerType === "REVISION" && !draft.revisionKms.length) || (draft.scopeType === "GROUP" && !draft.targetGroupId) || (draft.scopeType === "COMPANY" && !draft.targetCompanyId)} onClick={() => void savePackage()}>{saving ? "Salvando..." : "Salvar pacote"}</button></footer>
    </section></div>}
  </section>;
}

type SellingOperationProps = {
  companyId: string;
  storeId: string;
  accessToken: string;
  customers: SellingCustomer[];
  vehicles: SellingVehicle[];
  currentUserName: string;
  currentUserPhone: string;
  storeName: string;
  companyName: string;
  identity?: SellingIdentity;
};

export function SellingOperationPage({ companyId, storeId, accessToken, customers, vehicles, currentUserName, currentUserPhone, storeName, companyName, identity }: SellingOperationProps) {
  const [revisions, setRevisions] = useState<SellingRevision[]>([]);
  const [packages, setPackages] = useState<SellingPackage[]>([]);
  const [catalogKits, setCatalogKits] = useState<SellingCatalogKit[]>([]);
  const [recommendations, setRecommendations] = useState<SellingRecommendation[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<SellingPaymentSetting>({ group_id: null, allow_pix: true, allow_debit: true, allow_credit: true, installment_rules: [
    { min: 0, max: 250, max_installments: 1 }, { min: 250.01, max: 500, max_installments: 2 }, { min: 500.01, max: 1000, max_installments: 3 }, { min: 1000.01, max: null, max_installments: 4 },
  ] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"SETUP" | "SHOWCASE" | "CHECKOUT">("SETUP");
  const [modelKey, setModelKey] = useState("");
  const [revisionKm, setRevisionKm] = useState(0);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [disabledItems, setDisabledItems] = useState<Record<string, string[]>>({});
  const [paymentPackageId, setPaymentPackageId] = useState("");
  const [paymentChoiceByPackage, setPaymentChoiceByPackage] = useState<Record<string, string>>({});
  const [presentationId, setPresentationId] = useState("");
  const [savingPresentation, setSavingPresentation] = useState(false);
  const [extraItemsByPackage, setExtraItemsByPackage] = useState<Record<string, SellingAdHocItem[]>>({});
  const [extraPackageId, setExtraPackageId] = useState("");
  const [selectedCatalogKitId, setSelectedCatalogKitId] = useState("");
  const [extraDraft, setExtraDraft] = useState<{ type: "PART" | "SERVICE"; code: string; description: string; quantity: number; unitPrice: number; isTire: boolean; maxInstallments: number }>({ type: "SERVICE", code: "", description: "", quantity: 1, unitPrice: 0, isTire: false, maxInstallments: 4 });
  const [infoUnit, setInfoUnit] = useState<PresentationUnit | null>(null);
  const [courtesyItemsByPackage, setCourtesyItemsByPackage] = useState<Record<string, string[]>>({});
  const [serviceMode, setServiceMode] = useState<"REVISION" | "OIL_CHANGE">("REVISION");
  const [showcaseRefresh, setShowcaseRefresh] = useState(0);
  const [showcaseNotice, setShowcaseNotice] = useState("");

  // Cliente e placa precisam estar definidos antes da apresentação; no fechamento entra somente o horário.
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [plate, setPlate] = useState("");
  const [vehicleDescription, setVehicleDescription] = useState("");
  const [promisedTime, setPromisedTime] = useState("");
  const [consultantName, setConsultantName] = useState(currentUserName || "");
  const [consultantPhone, setConsultantPhone] = useState(currentUserPhone || "");

  useEffect(() => { setConsultantName(currentUserName || ""); setConsultantPhone(currentUserPhone || ""); }, [currentUserName, currentUserPhone]);
  function resetNegotiationState() {
    setSelectedPackageId("");
    setDisabledItems({});
    setCourtesyItemsByPackage({});
    setExtraItemsByPackage({});
    setPaymentChoiceByPackage({});
    setPaymentPackageId("");
    setExtraPackageId("");
    setSelectedCatalogKitId("");
    setInfoUnit(null);
    setPresentationId("");
    setPromisedTime("");
    setShowcaseNotice("");
    setShowcaseRefresh((value) => value + 1);
  }
  function announceAddition(message = "Adicionado aos 3 pacotes") {
    setShowcaseRefresh((value) => value + 1);
    setShowcaseNotice(message);
    window.setTimeout(() => setShowcaseNotice(""), 2200);
  }
  useEffect(() => { void (async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/selling?companyId=${encodeURIComponent(companyId)}&storeId=${encodeURIComponent(storeId)}`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
      const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || "Não foi possível abrir o Selling.");
      const flexRevisions = (payload.revisions || []).filter((revision: SellingRevision) => revision.fuel_type === "FLEX");
      setRevisions(flexRevisions);
      setPackages((payload.packages || []).filter((pkg: SellingPackage) => pkg.fuel_type === "FLEX"));
      setCatalogKits(payload.catalogKits || []);
      setRecommendations(payload.recommendations || []);
      if (payload.paymentSettings) setPaymentSettings(payload.paymentSettings);
      const first = flexRevisions[0]; if (first) { setModelKey(first.model_key); setRevisionKm(Number(first.revision_km)); }
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao abrir Selling."); } finally { setLoading(false); }
  })(); }, [companyId, storeId, accessToken]);

  const models = useMemo(() => {
    const map = new Map<string, { key: string; name: string; year: string }>();
    revisions.forEach((revision) => { if (!map.has(revision.model_key)) map.set(revision.model_key, { key: revision.model_key, name: revision.model_name, year: revision.year_label || "" }); });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [revisions]);
  const modelRevisions = revisions.filter((revision) => revision.model_key === modelKey).sort((a, b) => Number(a.revision_km) - Number(b.revision_km));
  const selectedRevision = modelRevisions.find((revision) => Number(revision.revision_km) === Number(revisionKm)) || modelRevisions[0] || null;
  const applicableRecommendations = selectedRevision ? recommendations.filter((rec) => { const interval = Math.max(0, Number(rec.interval_km || rec.min_km || 0)); return (!rec.model_key || rec.model_key === selectedRevision.model_key) && (!interval || Number(selectedRevision.revision_km) % interval === 0); }) : [];
  const matchingPackages = serviceMode === "OIL_CHANGE"
    ? packages.filter((pkg) => pkg.offer_type === "OIL_CHANGE" && (!pkg.model_keys.length || pkg.model_keys.includes(modelKey))).sort((a, b) => Number(a.display_order) - Number(b.display_order))
    : selectedRevision ? packages.filter((pkg) => pkg.offer_type !== "OIL_CHANGE" && (!pkg.model_keys.length || pkg.model_keys.includes(selectedRevision.model_key)) && (!pkg.revision_kms.length || pkg.revision_kms.includes(Number(selectedRevision.revision_km)))).sort((a, b) => Number(a.display_order) - Number(b.display_order)) : [];
  const selectedPackage = matchingPackages.find((pkg) => pkg.id === selectedPackageId) || null;
  const selectedDisabled = selectedPackage ? disabledItems[selectedPackage.id] || [] : [];

  function recommendationItems(): SellingAdHocItem[] {
    if (!selectedRevision || serviceMode !== "REVISION") return [];
    const rows: SellingAdHocItem[] = [];
    applicableRecommendations.filter((rec)=>rec.include_in_packages !== false && rec.catalog_kit_id).forEach((rec,recIndex)=>{
      const kit=catalogKits.find((entry)=>entry.id===rec.catalog_kit_id);
      const note=`Recomendado pela montadora · a cada ${kmLabel(Number(rec.interval_km || rec.min_km || 0))}${Number(rec.interval_months || rec.min_months) ? ` ou ${Number(rec.interval_months || rec.min_months)} meses` : ""}`;
      if(!kit){ rows.push({ id:`REC_${rec.id}_NOTICE`, item_type:"SERVICE", code:null, description:rec.title, quantity:1, unit_price:0, labor_hours:0, display_order:-10000+(recIndex*100), source:"SELLING_RECOMMENDATION", category_key:`RECOMMENDATION_${rec.id}`, category_name:rec.title, visual_name:rec.title, show_individual:false, show_price:false, info_title:rec.title, info_text:rec.description, is_recommendation:true, recommendation_id:rec.id, recommendation_text:note }); return; }
      (kit.items||[]).forEach((component,index)=>rows.push({ ...component, id:`REC_${rec.id}_${component.id||index}`, item_type:(component.item_type === "LABOR" ? "SERVICE" : (component.item_type || "PART")) as "PART"|"SERVICE", display_order:-10000+(recIndex*100)+index, source:"SELLING_RECOMMENDATION", category_key:`RECOMMENDATION_${rec.id}`, category_name:rec.title, visual_name:rec.title, show_individual:false, show_price:rec.show_price===true, info_title:rec.title, info_text:rec.description, is_recommendation:true, recommendation_id:rec.id, recommendation_text:note }));
    });
    return rows;
  }
  function effectivePackage(pkg: SellingPackage): SellingPackage { return { ...pkg, items: [...recommendationItems(), ...pkg.items, ...(extraItemsByPackage[pkg.id] || [])] }; }
  function addSharedExtras(factory: (pkg: SellingPackage) => SellingAdHocItem[]) {
    setExtraItemsByPackage((current)=>{ const next={...current}; matchingPackages.forEach((pkg)=>{ next[pkg.id]=[...(next[pkg.id]||[]),...factory(pkg)]; }); return next; });
  }
  function addExtraItem() {
    if (!extraPackageId || !extraDraft.description.trim()) return;
    const batchId = uid();
    const item: SellingAdHocItem = { id: uid(), item_type: extraDraft.type, code: extraDraft.code.trim() || null, description: extraDraft.description.trim(), quantity: Math.max(.01, Number(extraDraft.quantity)||1), unit_price: Math.max(0, Number(extraDraft.unitPrice)||0), labor_hours: 0, display_order: -9000 + (extraItemsByPackage[extraPackageId]?.length || 0), source: "SELLING_AVULSO", category_key: extraDraft.isTire ? `PNEU_${batchId}` : `AVULSO_${batchId}`, category_name: extraDraft.isTire ? "Pneu" : extraDraft.description.trim(), visual_name: extraDraft.description.trim(), show_individual: true, show_price: true, is_tire: extraDraft.isTire, max_installments: extraDraft.isTire ? Math.max(1, Math.floor(extraDraft.maxInstallments || 1)) : null };
    addSharedExtras(()=>[{...item,id:uid()}]);
    announceAddition();
    setExtraDraft({ type:"SERVICE", code:"", description:"", quantity:1, unitPrice:0, isTire:false, maxInstallments:4 });
    setExtraPackageId("");
  }

  function addCatalogKit() {
    if(!extraPackageId||!selectedCatalogKitId) return;
    const kit=catalogKits.find((item)=>item.id===selectedCatalogKitId); if(!kit) return;
    const key=`KIT_${kit.id}_${uid()}`;
    const items:SellingAdHocItem[]=(kit.items||[]).map((component,index)=>({ ...component, id:uid(), item_type:(component.item_type === "LABOR" ? "SERVICE" : (component.item_type || "PART")) as "PART"|"SERVICE", category_key:key, category_name:kit.visual_name||kit.name, visual_name:kit.visual_name||kit.name, show_individual:false, show_price:component.show_price!==false, display_order:-9000+(extraItemsByPackage[extraPackageId]?.length||0)+index, source:"SELLING_KIT", is_tire:Boolean(kit.is_tire), max_installments:kit.is_tire?Number(kit.max_installments)||4:null }));
    addSharedExtras(()=>items.map((item)=>({...item,id:uid()})));
    announceAddition(`${kit.visual_name || kit.name} adicionado aos 3 pacotes`);
    setSelectedCatalogKitId(""); setExtraPackageId("");
  }

  function packageAddonTotal(pkg: SellingPackage) {
    const disabled = disabledItems[pkg.id] || [];
    const courtesy = courtesyItemsByPackage[pkg.id] || []; return effectivePackage(pkg).items.reduce((sum, item, index) => disabled.includes(itemId(item, index)) || courtesy.includes(itemId(item,index)) ? sum : sum + itemTotal(item), 0);
  }
  function packageTotal(pkg: SellingPackage) { return (serviceMode === "REVISION" ? Number(selectedRevision?.base_price || 0) : 0) + packageAddonTotal(pkg); }
  const selectedTotal = selectedPackage ? packageTotal(selectedPackage) : 0;

  function maxInstallmentsFor(total: number, pkg?: SellingPackage) {
    const rules = [...(paymentSettings.installment_rules || [])].sort((a, b) => Number(a.min) - Number(b.min));
    const matched = rules.find((rule) => total >= Number(rule.min || 0) && (rule.max === null || rule.max === undefined || total <= Number(rule.max)));
    const base = Math.max(1, Math.floor(Number(matched?.max_installments || 1)));
    const tireBoost = pkg ? effectivePackage(pkg).items.filter((item)=>item.is_tire).reduce((max,item)=>Math.max(max, Number(item.max_installments)||1), 1) : 1;
    return Math.max(base, tireBoost);
  }
  function paymentOptions(total: number, pkg?: SellingPackage) {
    const options: Array<{ key: string; label: string; detail: string }> = [];
    if (paymentSettings.allow_debit || paymentSettings.allow_pix) options.push({ key: "DEBIT_PIX", label: paymentSettings.allow_debit && paymentSettings.allow_pix ? "Débito / Pix" : paymentSettings.allow_pix ? "Pix" : "Débito", detail: money(total) });
    if (paymentSettings.allow_credit) {
      const max = maxInstallmentsFor(total, pkg);
      for (let installments = 1; installments <= max; installments += 1) options.push({ key: `CREDIT_${installments}`, label: `Crédito ${installments}x`, detail: installments === 1 ? money(total) : `${installments}x de ${money(total / installments)}` });
    }
    return options;
  }
  function toggleUnit(pkg: SellingPackage, unit: PresentationUnit) {
    setDisabledItems((current) => {
      const list = current[pkg.id] || [];
      const disabled = unit.itemIds.every((id) => list.includes(id));
      const next = disabled ? list.filter((id) => !unit.itemIds.includes(id)) : Array.from(new Set([...list, ...unit.itemIds]));
      return { ...current, [pkg.id]: next };
    });
  }
  function toggleCourtesy(pkg: SellingPackage, unit: PresentationUnit) {
    if (!unit.courtesyItemIds.length) return;
    setCourtesyItemsByPackage((current)=>{
      const list=current[pkg.id]||[];
      const active=unit.courtesyItemIds.every((id)=>list.includes(id));
      return {...current,[pkg.id]:active?list.filter((id)=>!unit.courtesyItemIds.includes(id)):Array.from(new Set([...list,...unit.courtesyItemIds]))};
    });
  }
  function unitCharge(pkg: SellingPackage, unit: PresentationUnit) {
    const disabled=disabledItems[pkg.id]||[]; const courtesy=courtesyItemsByPackage[pkg.id]||[];
    const items=effectivePackage(pkg).items;
    return unit.itemIds.reduce((sum,id)=>{const index=items.findIndex((item,itemIndex)=>itemId(item,itemIndex)===id);if(index<0||disabled.includes(id)||courtesy.includes(id))return sum;return sum+itemTotal(items[index]);},0);
  }
  function startShowcase(event: FormEvent) {
    event.preventDefault();
    if (serviceMode === "REVISION" && !selectedRevision) return window.alert("Selecione o modelo e a revisão.");
    if (serviceMode === "OIL_CHANGE" && !modelKey) return window.alert("Selecione o modelo para a troca de óleo.");
    if (!customerName.trim()) return window.alert("Informe o nome do cliente antes de apresentar os pacotes.");
    if (!plate.trim()) return window.alert("Informe a placa antes de apresentar os pacotes.");
    if (!vehicleDescription.trim()) setVehicleDescription(selectedRevision?.model_name || models.find((model)=>model.key===modelKey)?.name || "Veículo");
    setSelectedPackageId(""); setPaymentPackageId(""); setStep("SHOWCASE");
  }
  function openCheckout() {
    if (!selectedPackage || (serviceMode === "REVISION" && !selectedRevision)) return;
    if (!paymentChoiceByPackage[selectedPackage.id]) {
      const first = paymentOptions(selectedTotal, selectedPackage)[0];
      if (first) setPaymentChoiceByPackage((current) => ({ ...current, [selectedPackage.id]: `${first.label} · ${first.detail}` }));
    }
    setStep("CHECKOUT");
  }

  async function savePresentation(printAfter = false) {
    if (!selectedPackage || (serviceMode === "REVISION" && !selectedRevision)) return;
    if (!customerName.trim()) return window.alert("Informe o nome do cliente.");
    if (!plate.trim()) return window.alert("Informe a placa.");
    if (!vehicleDescription.trim()) return window.alert("Informe o veículo.");
    if (!promisedTime) return window.alert("Informe o horário previsto de entrega.");
    setSavingPresentation(true); setError("");
    const disabled = disabledItems[selectedPackage.id] || [];
    const effective = effectivePackage(selectedPackage);
    const accepted = effective.items.filter((item, index) => !disabled.includes(itemId(item, index)));
    const declined = effective.items.filter((item, index) => disabled.includes(itemId(item, index)));
    const snapshot = { mode: serviceMode, revision: selectedRevision, package: { ...selectedPackage, items: accepted }, declinedItems: declined, courtesyItemIds: courtesyItemsByPackage[selectedPackage.id] || [], requiredItems: serviceMode === "REVISION" ? (selectedRevision?.items || []) : [], payment: paymentChoiceByPackage[selectedPackage.id] || "" };
    try {
      const response = await fetch("/api/selling", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ companyId, storeId, revisionId: serviceMode === "REVISION" ? selectedRevision?.id : null, packageId: selectedPackage.id, customerName: customerName.trim(), customerPhone: customerPhone.trim(), plate: plate.trim(), vehicleDescription: vehicleDescription.trim(), consultantName: consultantName.trim(), consultantPhone: consultantPhone.trim(), promisedTime, total: selectedTotal, snapshot }) });
      const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || "Não foi possível registrar a apresentação.");
      setPresentationId(payload.id || "");
      if (printAfter) window.setTimeout(() => printPresentation(), 80);
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao salvar apresentação."); }
    finally { setSavingPresentation(false); }
  }

  function printPresentation() {
    if (!selectedPackage || (serviceMode === "REVISION" && !selectedRevision) || !customerName.trim() || !plate.trim()) return;
    const disabled = disabledItems[selectedPackage.id] || [];
    const acceptedUnits = packageUnits(effectivePackage(selectedPackage)).filter((unit) => !unit.itemIds.every((id) => disabled.includes(id)));
    const declinedUnits = packageUnits(effectivePackage(selectedPackage)).filter((unit) => unit.itemIds.every((id) => disabled.includes(id)));
    const accent = /^#[0-9a-f]{6}$/i.test(selectedPackage.color) ? selectedPackage.color : "#08c9ac";
    const logo = identity?.logo ? `<img src="${escapeHtml(identity.logo)}" alt="Logo"/>` : `<div class="logo">G</div>`;
    const requiredRows = serviceMode === "REVISION" ? (selectedRevision?.items || []).map((item) => `<tr><td>${escapeHtml(item.description)}</td><td>${item.item_type === "LABOR" ? `${Number(item.labor_hours || item.quantity || 0).toLocaleString("pt-BR")} h` : `${Number(item.quantity).toLocaleString("pt-BR")}x`}</td></tr>`).join("") : "";
    const activeCourtesy = courtesyItemsByPackage[selectedPackage.id] || []; const acceptedRows = acceptedUnits.map((unit) => { const courtesyApplied=unit.courtesyItemIds.length>0 && unit.courtesyItemIds.every((id)=>activeCourtesy.includes(id)); const charged=unitCharge(selectedPackage,unit); return `<tr><td>${courtesyApplied ? `<b>*</b> ` : ""}${escapeHtml(unit.title)}${courtesyApplied ? ` <small>(${escapeHtml(unit.courtesyLabel || "Cortesia")})</small>` : ""}</td><td>${unit.showPrice ? (courtesyApplied ? escapeHtml(unit.courtesyLabel || "Cortesia") : money(charged)) : ""}</td></tr>`; }).join("");
    const declinedRows = declinedUnits.length ? `<section><h3>Benefícios não autorizados</h3><ul>${declinedUnits.map((unit) => `<li>${escapeHtml(unit.title)}</li>`).join("")}</ul></section>` : "";
    const payment = paymentChoiceByPackage[selectedPackage.id] || "Não definido";
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Selling - ${escapeHtml(customerName)}</title><style>
      :root{--accent:${accent};--ink:#142331;--muted:#667682;--line:#dfe5e9}*{box-sizing:border-box}body{margin:0;background:#edf1f4;color:var(--ink);font-family:Arial,sans-serif}.toolbar{max-width:210mm;margin:10px auto;text-align:right}.toolbar button{border:0;border-radius:8px;padding:10px 16px;background:var(--accent);color:white;font-weight:800}.sheet{width:210mm;min-height:287mm;margin:0 auto 20px;padding:12mm;background:white}.head{display:flex;justify-content:space-between;gap:20px;align-items:center;border-bottom:4px solid var(--accent);padding-bottom:10px}.brand{display:flex;align-items:center;gap:12px}.brand img{max-width:130px;max-height:54px}.logo{display:grid;place-items:center;width:48px;height:48px;border-radius:12px;background:var(--accent);color:white;font-size:24px;font-weight:900}.head h1{margin:0;font-size:22px}.head p{margin:4px 0;color:var(--muted)}.package{text-align:right}.package b{display:block;color:var(--accent);font-size:20px}.package strong{font-size:25px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:15px 0}.card{border:1px solid var(--line);border-radius:9px;padding:10px}.card small{display:block;color:var(--muted);font-size:9px;text-transform:uppercase}.card b,.card strong{display:block;margin-top:3px}.checkout{border-color:var(--accent);background:#f8fffd}.checkout strong{font-size:22px;color:var(--accent)}section{margin-top:14px}h3{margin:0 0 7px;font-size:14px}table{width:100%;border-collapse:collapse}td{border-bottom:1px solid var(--line);padding:6px 2px;font-size:11px}td:last-child{text-align:right;font-weight:700}.total{display:flex;justify-content:space-between;align-items:center;margin-top:18px;padding:13px;border-radius:9px;background:#102837;color:white}.total strong{font-size:23px;color:var(--accent)}.payment{margin-top:10px;padding:10px;border:1px solid var(--line);border-radius:8px}.signature{display:grid;grid-template-columns:1fr 1fr;gap:35px;margin-top:35px}.signature div{padding-top:25px;border-top:1px solid #555;text-align:center;font-size:10px}.foot{margin-top:20px;text-align:center;color:#89959c;font-size:9px}@media print{body{background:#fff}.toolbar{display:none}.sheet{margin:0;box-shadow:none}}
    </style></head><body><div class="toolbar"><button onclick="window.print()">Imprimir / PDF</button></div><main class="sheet"><div class="head"><div class="brand">${logo}<div><h1>${escapeHtml(identity?.displayName || companyName || "Gerivo Selling")}</h1><p>${escapeHtml(storeName)}</p></div></div><div class="package"><span>${escapeHtml(selectedPackage.name)}</span><b>${serviceMode === "REVISION" ? kmLabel(Number(selectedRevision?.revision_km || 0)) : "Troca de óleo"}</b><strong>${money(selectedTotal)}</strong></div></div><div class="meta"><div class="card"><small>Cliente</small><b>${escapeHtml(customerName)}</b><span>${escapeHtml(customerPhone)}</span></div><div class="card"><small>Veículo / placa</small><b>${escapeHtml(vehicleDescription)}</b><span>${escapeHtml(plate.toUpperCase())}</span></div><div class="card checkout"><small>Check-out previsto</small><strong>${escapeHtml(promisedTime)}</strong><span>Horário combinado de entrega</span></div><div class="card"><small>Consultor responsável</small><b>${escapeHtml(consultantName)}</b><span>${escapeHtml(consultantPhone)}</span></div></div>${serviceMode === "REVISION" ? `<section><h3>Revisão obrigatória / preconizado - ${escapeHtml(selectedRevision?.model_name || "")}</h3><table>${requiredRows}</table></section>` : ""}<section><h3>${serviceMode === "OIL_CHANGE" ? "Itens da troca de óleo" : "Benefícios autorizados"} - ${escapeHtml(selectedPackage.name)}</h3><table>${acceptedRows || "<tr><td>Nenhum adicional autorizado</td><td>R$ 0,00</td></tr>"}</table></section>${declinedRows}<div class="payment"><b>Forma de pagamento</b><div>${escapeHtml(payment)}</div></div><div class="total"><span>Revisão + benefícios autorizados</span><strong>${money(selectedTotal)}</strong></div><div class="signature"><div>Assinatura do cliente / pessoa autorizada</div><div>${escapeHtml(consultantName)} - Consultor</div></div><div class="foot">Gerivo Selling${presentationId ? ` · Registro ${escapeHtml(presentationId)}` : ""} · ${new Date().toLocaleString("pt-BR")}</div></main></body></html>`;
    const popup = window.open("", "_blank", "width=980,height=900"); if (!popup) return window.alert("O navegador bloqueou a janela de impressão."); popup.document.open(); popup.document.write(html); popup.document.close();
  }

  if (loading) return <div className="selling-operation-loading"><span />Preparando Selling...</div>;
  if (error && !revisions.length) return <div className="selling-operation-error"><b>Não foi possível abrir o Selling.</b><span>{error}</span></div>;
  if (!revisions.length) return <div className="selling-operation-error"><b>Não existem revisões FLEX importadas.</b><span>O MASTER deve importar a planilha de revisões antes de usar o Selling.</span></div>;

  const paymentPkg = matchingPackages.find((pkg) => pkg.id === paymentPackageId) || null;
  const paymentPkgTotal = paymentPkg ? packageTotal(paymentPkg) : 0;

  return <section className="selling-operation-v3">
    {step === "SETUP" && <div className="selling-setup-v3 selling-setup-v4"><div className="selling-stepper"><span className="active"><b>1</b>Revisão</span><i /><span><b>2</b>Pacotes</span><i /><span><b>3</b>Fechamento</span></div><form onSubmit={startShowcase} className="selling-setup-v3-card"><div><small>GERIVO SELLING · FLEX</small><h2>Prepare a apresentação</h2><p>Cliente e placa ficam registrados antes dos pacotes. Escolha revisão ou troca de óleo e apresente as opções.</p><div className="selling-service-mode-v5"><button type="button" className={serviceMode === "REVISION" ? "active" : ""} onClick={()=>{resetNegotiationState();setServiceMode("REVISION");}}>Revisão</button><button type="button" className={serviceMode === "OIL_CHANGE" ? "active" : ""} onClick={()=>{resetNegotiationState();setServiceMode("OIL_CHANGE");}}>Troca de óleo</button></div></div><label>Cliente<input list="selling-customers" value={customerName} onChange={(e)=>setCustomerName(e.target.value)} placeholder="Nome do cliente" /><datalist id="selling-customers">{customers.map((customer)=><option key={customer.id} value={customer.name} />)}</datalist></label><label>Placa<input value={plate} onChange={(e)=>{const value=e.target.value.toUpperCase();setPlate(value);const vehicle=vehicles.find((item)=>item.plate.toUpperCase()===value);if(vehicle){setVehicleDescription(vehicle.description);const customer=customers.find((item)=>item.id===vehicle.customerId);if(customer){setCustomerName(customer.name);setCustomerPhone(customer.phone);}}}} placeholder="ABC1D23" /></label><label>Modelo<select value={modelKey} onChange={(e) => { const next=e.target.value; resetNegotiationState(); setModelKey(next); const first=revisions.find((revision)=>revision.model_key===next); setRevisionKm(Number(first?.revision_km)||0); }}>{models.map((model)=><option key={model.key} value={model.key}>{model.name}</option>)}</select></label>{serviceMode === "REVISION" ? <label>Revisão<select value={revisionKm} onChange={(e)=>{resetNegotiationState();setRevisionKm(Number(e.target.value));}}>{modelRevisions.map((revision)=><option key={revision.id} value={revision.revision_km}>{kmLabel(Number(revision.revision_km))} · {money(Number(revision.base_price))}</option>)}</select></label> : <div className="selling-oil-setup-note-v5"><small>TIPO</small><b>Pacotes de troca de óleo</b><span>Serão exibidos somente os pacotes publicados para o modelo selecionado.</span></div>}<button type="submit">Apresentar pacotes →</button></form></div>}

    {step === "SHOWCASE" && (serviceMode === "OIL_CHANGE" || selectedRevision) && <div className="selling-fullscreen selling-fullscreen-v3"><header className="selling-showcase-top-v3"><div><small>{serviceMode === "OIL_CHANGE" ? "TROCA DE ÓLEO" : "REVISÃO SELECIONADA"}</small><b>{selectedRevision?.model_name || models.find((model)=>model.key===modelKey)?.name || "Veículo"}</b><span>{customerName} · {plate.toUpperCase()}{serviceMode === "REVISION" ? ` · ${kmLabel(Number(selectedRevision?.revision_km || 0))} · Preconizado ${money(Number(selectedRevision?.base_price || 0))}` : " · Pacotes de troca de óleo"}</span></div><div className="selling-stepper light"><span><b>1</b>Revisão</span><i /><span className="active"><b>2</b>Pacotes</span><i /><span><b>3</b>Fechamento</span></div><button onClick={()=>setStep("SETUP")}>← Alterar revisão</button></header>{showcaseNotice && <div className="selling-showcase-notice-v7">{showcaseNotice}</div>}<main className="selling-fullscreen-body selling-fullscreen-body-v3">
      {!matchingPackages.length ? <div className="selling-no-packages"><b>Nenhum pacote publicado para esta combinação.</b><span>{serviceMode === "OIL_CHANGE" ? "Vincule no MASTER um pacote FLEX do tipo Troca de óleo ao modelo selecionado." : <>Vincule no MASTER um pacote FLEX ao modelo {selectedRevision?.model_name} e à revisão {kmLabel(Number(selectedRevision?.revision_km || 0))}.</>}</span></div> : <div className="selling-package-showcase-v3">{matchingPackages.map((pkg) => {
        const disabled=disabledItems[pkg.id]||[]; const effective=effectivePackage(pkg); const units=packageUnits(effective); const total=packageTotal(pkg); const selected=selectedPackageId===pkg.id; const paymentLabel=paymentChoiceByPackage[pkg.id];
        return <article key={`${pkg.id}-${showcaseRefresh}`} className={`selling-showcase-card-v3 ${selected?"selected":""} ${units.length >= 8 ? "dense-benefits-v7" : ""}`} style={{"--selling-color":pkg.color} as any}><header><b>{pkg.tier === "INTERMEDIARIO" ? "INTERMEDIÁRIO" : pkg.tier}</b></header><button type="button" className="selling-card-price-v3" onClick={()=>setPaymentPackageId(pkg.id)}><small>A partir de</small><strong>{money(total)}</strong><span>{paymentLabel || `Toque no valor para ver pagamento · até ${maxInstallmentsFor(total, pkg)}x`}</span></button>{serviceMode === "REVISION" && selectedRevision && <section className="selling-required-v3"><div><small>REVISÃO OBRIGATÓRIA · PRECONIZADO</small><b>{money(Number(selectedRevision.base_price))}</b></div>{selectedRevision.items.map((item,index)=><p key={item.id||index}><span>{item.description}</span><em>{item.item_type === "LABOR" ? `${Number(item.labor_hours || item.quantity || 0).toLocaleString("pt-BR")} h` : `${Number(item.quantity || 0).toLocaleString("pt-BR")}x`}</em></p>)}</section>}<section className="selling-benefits-v3"><small>{serviceMode === "OIL_CHANGE" ? "ITENS DO PACOTE" : "BENEFÍCIOS DO PACOTE"}</small>{units.map((unit)=>{const off=unit.itemIds.every((id)=>disabled.includes(id));const courtesyList=courtesyItemsByPackage[pkg.id]||[];const courtesyApplied=unit.courtesyItemIds.length>0&&unit.courtesyItemIds.every((id)=>courtesyList.includes(id));const charged=unitCharge(pkg,unit);return <div key={unit.key} role="button" tabIndex={0} className={`${off?"disabled":""} ${unit.hasCourtesy?"can-courtesy":""} ${courtesyApplied?"courtesy-applied":""} ${unit.isRecommended?"recommended-item-v6":""}`} onClick={()=>toggleUnit(pkg,unit)} onKeyDown={(event)=>{if(event.key==="Enter"||event.key===" ")toggleUnit(pkg,unit)}}>{unit.isRecommended&&<span className="selling-recommended-badge-v6" title="Recomendado pela montadora">!</span>}<i>{off?"×":"✓"}</i>{unit.hasCourtesy && <button type="button" className={`selling-courtesy-star-v6 ${courtesyApplied?"active":""}`} aria-label={courtesyApplied?`Remover ${unit.courtesyLabel||"cortesia"}`:`Aplicar ${unit.courtesyLabel||"cortesia"}`} title={courtesyApplied?`Remover ${unit.courtesyLabel||"cortesia"}`:(unit.courtesyNote||`Aplicar ${unit.courtesyLabel||"cortesia"} e retirar ${money(unit.courtesyValue)} do total`)} onClick={(event)=>{event.stopPropagation();toggleCourtesy(pkg,unit)}}>★</button>}<span><b>{unit.title}</b><small>{off?"Cliente não deseja executar":unit.isRecommended?(unit.recommendationText||unit.detail):unit.detail}</small></span><button type="button" className={`selling-unit-info ${!(unit.infoText||unit.infoImageUrl)?"empty":""}`} aria-label={`Informações sobre ${unit.title}`} title="Ver informações, imagem ou vídeo" onClick={(event)=>{event.stopPropagation();setInfoUnit(unit)}}>i</button>{unit.showPrice && <em className={courtesyApplied?"courtesy-price-v6":""}>{courtesyApplied?<><s>{money(unit.total)}</s><b>{unit.courtesyLabel||"Cortesia"}</b></>:off?`- ${money(charged)}`:money(charged)}</em>}</div>})}</section><button type="button" className="selling-add-avulso-v4" onClick={()=>setExtraPackageId(pkg.id)}>Adicionar</button><button className="selling-select-plan-v3" onClick={()=>setSelectedPackageId(selected?"":pkg.id)}>{selected?"✓ PACOTE ESCOLHIDO":"ESCOLHER ESTE PACOTE"}</button></article>;
      })}</div>}
    </main>{selectedPackage && <footer className="selling-fullscreen-footer selling-fullscreen-footer-v3"><div><small>PACOTE ESCOLHIDO</small><b>{selectedPackage.name}</b><span>{packageUnits(effectivePackage(selectedPackage)).filter((unit)=>!unit.itemIds.every((id)=>selectedDisabled.includes(id))).length} benefício(s) autorizado(s)</span></div><div><small>TOTAL</small><strong>{money(selectedTotal)}</strong><button onClick={openCheckout}>Fechar proposta →</button></div></footer>}</div>}

    {paymentPkg && <div className="selling-payment-backdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget)setPaymentPackageId("")}}><section className="selling-payment-modal"><header><div><small>FORMAS DE PAGAMENTO</small><h3>{paymentPkg.name}</h3></div><button onClick={()=>setPaymentPackageId("")}>×</button></header><strong>{money(paymentPkgTotal)}</strong><p>Condição disponível conforme a faixa de valor configurada no Gerivo MASTER.</p><div>{paymentOptions(paymentPkgTotal, paymentPkg).map((option)=><button key={option.key} onClick={()=>{setPaymentChoiceByPackage((current)=>({...current,[paymentPkg.id]:`${option.label} · ${option.detail}`}));setPaymentPackageId("");}}><span>{option.label}</span><b>{option.detail}</b></button>)}</div></section></div>}

    {infoUnit && <div className="selling-payment-backdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget)setInfoUnit(null)}}><section className="selling-info-modal-v4"><header><div><small>INFORMAÇÃO DO BENEFÍCIO</small><h3>{infoUnit.infoTitle || infoUnit.title}</h3></div><button onClick={()=>setInfoUnit(null)}>×</button></header>{(()=>{const media=infoMedia(infoUnit.infoImageUrl||"");return media.kind==="EMBED"?<iframe src={media.src} title={infoUnit.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/>:media.kind==="VIDEO"?<video src={media.src} controls playsInline preload="metadata"/>:media.kind==="IMAGE"?<img src={media.src} alt={infoUnit.title}/>:null;})()}<p>{infoUnit.infoText || infoUnit.detail || "Conteúdo demonstrativo ainda não cadastrado para este serviço."}</p></section></div>}

    {extraPackageId && <div className="selling-payment-backdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget)setExtraPackageId("")}}><section className="selling-extra-modal-v4"><header><div><small>INCLUSÃO AVULSA</small><h3>Adicionar</h3></div><button onClick={()=>setExtraPackageId("")}>×</button></header>{catalogKits.length>0&&<div className="selling-catalog-picker-v6"><label>Kit pronto<select value={selectedCatalogKitId} onChange={(e)=>setSelectedCatalogKitId(e.target.value)}><option value="">Selecione...</option>{catalogKits.filter((kit)=>kit.active).map((kit)=><option key={kit.id} value={kit.id}>{kit.visual_name||kit.name}{(kit.items||[]).every((item)=>item.show_price!==false) ? ` · ${money((kit.items||[]).reduce((sum,item)=>sum+itemTotal(item),0))}` : ""}</option>)}</select></label><button disabled={!selectedCatalogKitId} onClick={addCatalogKit}>Adicionar</button></div>}<div className="selling-extra-grid-v4"><label>Tipo<select value={extraDraft.type} onChange={(e)=>setExtraDraft({...extraDraft,type:e.target.value as "PART"|"SERVICE"})}><option value="SERVICE">Serviço</option><option value="PART">Peça / químico</option></select></label><label>Código<input value={extraDraft.code} onChange={(e)=>setExtraDraft({...extraDraft,code:e.target.value})} /></label><label className="wide">Descrição<input value={extraDraft.description} onChange={(e)=>setExtraDraft({...extraDraft,description:e.target.value})} /></label><label>Quantidade<input type="number" min="0.01" step="0.01" value={extraDraft.quantity} onChange={(e)=>setExtraDraft({...extraDraft,quantity:Number(e.target.value)})} /></label><label>Valor unitário<input type="number" min="0" step="0.01" value={extraDraft.unitPrice} onChange={(e)=>setExtraDraft({...extraDraft,unitPrice:Number(e.target.value)})} /></label><label className="selling-tire-check-v4"><input type="checkbox" checked={extraDraft.isTire} onChange={(e)=>setExtraDraft({...extraDraft,isTire:e.target.checked})} /> Pneu</label>{extraDraft.isTire && <label>Máximo de parcelas com pneu<input type="number" min="1" max="24" value={extraDraft.maxInstallments} onChange={(e)=>setExtraDraft({...extraDraft,maxInstallments:Number(e.target.value)})} /></label>}</div><footer><button className="outline" onClick={()=>setExtraPackageId("")}>Cancelar</button><button className="primary" onClick={addExtraItem}>Adicionar</button></footer></section></div>}

    {step === "CHECKOUT" && (serviceMode === "OIL_CHANGE" || selectedRevision) && selectedPackage && <div className="selling-fullscreen selling-checkout-v3"><header className="selling-showcase-top-v3"><div><small>PACOTE ESCOLHIDO</small><b>{selectedPackage.name}</b><span>{selectedRevision?.model_name || models.find((model)=>model.key===modelKey)?.name || "Veículo"} · {serviceMode === "REVISION" ? kmLabel(Number(selectedRevision?.revision_km || 0)) : "Troca de óleo"}</span></div><div className="selling-stepper light"><span><b>1</b>Revisão</span><i /><span><b>2</b>Pacotes</span><i /><span className="active"><b>3</b>Fechamento</span></div><button onClick={()=>setStep("SHOWCASE")}>← Voltar aos pacotes</button></header><main className="selling-checkout-v3-body"><section className="selling-checkout-v3-form"><small>DADOS PARA FECHAMENTO</small><h2>Defina o horário de entrega</h2><div className="selling-closing-identity-v4"><span><small>Cliente</small><b>{customerName}</b></span><span><small>Placa</small><b>{plate.toUpperCase()}</b></span><span><small>Veículo</small><b>{vehicleDescription || selectedRevision?.model_name || models.find((model)=>model.key===modelKey)?.name || "Veículo"}</b></span><span><small>Consultor</small><b>{consultantName}</b></span></div><div className="selling-checkout-v3-grid selling-checkout-v4-grid"><label>Horário previsto de entrega<input type="time" value={promisedTime} onChange={(e)=>setPromisedTime(e.target.value)} /></label><label>Pagamento<select value={paymentChoiceByPackage[selectedPackage.id] || ""} onChange={(e)=>setPaymentChoiceByPackage((current)=>({...current,[selectedPackage.id]:e.target.value}))}><option value="">Selecione...</option>{paymentOptions(selectedTotal, selectedPackage).map((option)=><option key={option.key} value={`${option.label} · ${option.detail}`}>{option.label} · {option.detail}</option>)}</select></label></div>{error && <div className="selling-checkout-warning">{error}</div>}<div className="selling-checkout-v3-actions"><button className="outline" disabled={savingPresentation} onClick={()=>void savePresentation(false)}>{savingPresentation?"Salvando...":"Salvar fechamento"}</button><button className="primary" disabled={savingPresentation} onClick={()=>void savePresentation(true)}>{savingPresentation?"Preparando...":"Salvar e imprimir para assinatura"}</button></div></section><aside className="selling-checkout-summary-v3"><small>CHECK-OUT</small><h3>{selectedPackage.name}</h3><strong>{money(selectedTotal)}</strong><span><b>{selectedRevision?.model_name || models.find((model)=>model.key===modelKey)?.name || "Veículo"}</b>{serviceMode === "REVISION" ? kmLabel(Number(selectedRevision?.revision_km || 0)) : "Troca de óleo"}</span><span><b>Pagamento</b>{paymentChoiceByPackage[selectedPackage.id] || "A definir"}</span><span><b>Entrega prevista</b>{promisedTime || "A definir"}</span><span><b>Consultor</b>{consultantName || "A definir"}</span>{presentationId && <div className="selling-recorded">✓ Fechamento registrado no Gerivo</div>}<button disabled={!customerName.trim() || !plate.trim()} onClick={printPresentation}>Imprimir novamente</button></aside></main></div>}
  </section>;
}
