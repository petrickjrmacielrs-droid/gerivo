"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

type SellingItem = {
  id?: string;
  item_type?: string;
  itemType?: string;
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
  name: string;
  tier: "ESSENCIAL" | "INTERMEDIARIO" | "PREMIUM";
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
type SellingMasterData = {
  revisions: SellingRevision[];
  packages: SellingPackage[];
  groups: Array<{ id: string; name: string; companies?: Array<{ id: string; name: string }> }>;
  imports: Array<{ id: string; file_name: string; status: string; revisions_count: number; items_count: number; notes?: string; created_at: string }>;
  paymentSettings: SellingPaymentSetting[];
};
type PackageDraftItem = {
  id: string;
  itemType: "PART" | "SERVICE" | "LABOR";
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
};
type PackageDraft = {
  packageId: string;
  name: string;
  tier: "ESSENCIAL" | "INTERMEDIARIO" | "PREMIUM";
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

type PresentationUnit = { key: string; title: string; detail: string; total: number; itemIds: string[]; itemCount: number; showPrice: boolean };

const tierDefaults: Record<PackageDraft["tier"], { name: string; color: string; order: number; installments: number }> = {
  ESSENCIAL: { name: "Essencial", color: "#08c9ac", order: 10, installments: 2 },
  INTERMEDIARIO: { name: "Intermediário", color: "#6814f4", order: 20, installments: 3 },
  PREMIUM: { name: "Premium", color: "#ffae21", order: 30, installments: 4 },
};
function uid() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`; }
function money(value: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value) || 0); }
function kmLabel(value: number) { return `${new Intl.NumberFormat("pt-BR").format(value)} km`; }
function normalize(value: string) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim(); }
function itemId(item: SellingItem, index: number) { return item.id || `${item.code || "item"}-${index}`; }
function itemTotal(item: SellingItem | PackageDraftItem) {
  const explicit = (item as PackageDraftItem).lineTotal ?? (item as SellingItem).line_total;
  if (explicit !== null && explicit !== undefined) return Math.max(0, Number(explicit) || 0);
  const quantity = Math.max(0, Number((item as PackageDraftItem).quantity ?? (item as SellingItem).quantity) || 0);
  const unit = Number((item as PackageDraftItem).unitPrice ?? (item as SellingItem).unit_price ?? 0) || 0;
  return quantity * unit;
}
function emptyDraft(tier: PackageDraft["tier"] = "ESSENCIAL"): PackageDraft {
  const defaults = tierDefaults[tier];
  return { packageId: "", name: defaults.name, tier, fuelType: "FLEX", color: defaults.color, description: "", installments: defaults.installments, presentationMode: "GROUPED", displayOrder: defaults.order, active: true, published: false, scopeType: "GLOBAL", targetGroupId: "", targetCompanyId: "", modelKeys: [], revisionKms: [], items: [] };
}
function packageToDraft(pkg: SellingPackage): PackageDraft {
  return {
    packageId: pkg.id,
    name: pkg.name,
    tier: pkg.tier,
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
      itemType: (["PART", "SERVICE", "LABOR"].includes(String(item.item_type)) ? item.item_type : "SERVICE") as PackageDraftItem["itemType"],
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
function packageUnits(pkg: SellingPackage): PresentationUnit[] {
  const ordered = [...(pkg.items || [])].sort((a, b) => Number(a.display_order || 0) - Number(b.display_order || 0));
  if (pkg.presentation_mode === "DETAILED") return ordered.map((item, index) => ({ key: `item-${itemId(item, index)}`, title: item.visual_name || item.description, detail: item.item_type === "PART" ? "Peça" : "Mão de obra / serviço", total: itemTotal(item), itemIds: [itemId(item, index)], itemCount: 1, showPrice: item.show_price !== false }));

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
      if (current) { current.total += itemTotal(item); current.itemIds.push(id); current.itemCount += 1; current.showPrice = current.showPrice && item.show_price !== false; }
      else {
        const unit = { key: `category-${key}-${index}`, title, detail: "Benefício agregado", total: itemTotal(item), itemIds: [id], itemCount: 1, showPrice: item.show_price !== false };
        categoryMap.set(key, unit); units.push(unit);
      }
    } else uncategorized.push({ item, index });
  });

  // Compatibilidade com pacotes já importados: quando não houver categoria, mantém
  // o agrupamento antigo (mão de obra + peças imediatamente seguintes).
  let legacy: PresentationUnit | null = null;
  uncategorized.forEach(({ item, index }) => {
    const id = itemId(item, index);
    const type = String(item.item_type || "SERVICE");
    if (type === "LABOR" || type === "SERVICE" || item.show_individual) {
      legacy = { key: `legacy-${id}`, title: item.visual_name || item.description, detail: item.show_individual ? (type === "PART" ? "Peça" : "Serviço / mão de obra") : "Serviço / mão de obra", total: itemTotal(item), itemIds: [id], itemCount: 1, showPrice: item.show_price !== false };
      units.push(legacy);
    } else if (legacy && !item.show_individual) {
      legacy.total += itemTotal(item); legacy.itemIds.push(id); legacy.itemCount += 1; legacy.showPrice = legacy.showPrice && item.show_price !== false; legacy.detail = `${legacy.itemCount - 1} peça${legacy.itemCount - 1 > 1 ? "s" : ""} inclusa${legacy.itemCount - 1 > 1 ? "s" : ""}`;
    } else {
      const unit = { key: `part-${id}`, title: item.visual_name || item.description, detail: "Peça", total: itemTotal(item), itemIds: [id], itemCount: 1, showPrice: item.show_price !== false };
      units.push(unit); legacy = unit;
    }
  });
  return units;
}
function escapeHtml(value: string) { return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] || char)); }

export function MasterSellingManager({ sessionAccessToken }: { sessionAccessToken: string }) {
  const [data, setData] = useState<SellingMasterData>({ revisions: [], packages: [], groups: [], imports: [], paymentSettings: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"PACKAGES" | "IMPORT" | "PAYMENTS">("PACKAGES");
  const [draft, setDraft] = useState<PackageDraft | null>(null);
  const [paymentGroupId, setPaymentGroupId] = useState("");
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
          action: "save-package", packageId: draft.packageId || undefined, name: draft.name, tier: draft.tier, fuelType: "FLEX", color: draft.color,
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
      const items: PackageDraftItem[] = (payload.items || []).map((item: any) => ({ ...item, id: item.id || uid(), sourceFile: payload.fileName || file.name, categoryKey: item.categoryKey || "", categoryName: item.categoryName || "", visualName: item.visualName || "", showIndividual: Boolean(item.showIndividual), showPrice: item.showPrice !== false }));
      setDraft({ ...draft, items, presentationMode: "GROUPED" });
      setNotice(`${payload.count} recomendados importados (${payload.laborCount} M.O. e ${payload.partCount} peças). Total do PDF: ${money(payload.total)}.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao importar PDF do pacote."); } finally { setSaving(false); }
  }

  if (loading) return <div className="selling-master-loading"><span />Carregando Selling Beta...</div>;
  return <section className="selling-master">
    <header className="selling-master-hero"><div><small>GERIVO / MASTER · SELLING BETA 03</small><h2>Pacotes agregados</h2><p>A revisão obrigatória vem da planilha. Aqui você controla somente os adicionais, sua ordem, apresentação e em quais modelos/revisões FLEX cada pacote aparece.</p></div><div className="selling-master-kpis"><span><b>{visiblePackages.length}</b>pacotes FLEX</span><span><b>{models.length}</b>modelos FLEX</span><span><b>{data.revisions.filter((revision) => revision.fuel_type === "FLEX").length}</b>revisões</span></div></header>
    <div className="selling-master-tabs"><button className={tab === "PACKAGES" ? "active" : ""} onClick={() => setTab("PACKAGES")}>Pacotes agregados</button><button className={tab === "IMPORT" ? "active" : ""} onClick={() => setTab("IMPORT")}>Revisões obrigatórias</button><button className={tab === "PAYMENTS" ? "active" : ""} onClick={() => { setTab("PAYMENTS"); if (!paymentGroupId && data.groups[0]) loadPaymentDraft(data.groups[0].id); }}>Pagamento</button></div>
    {error && <div className="selling-alert error">{error}</div>}{notice && <div className="selling-alert success">{notice}</div>}
    {tab === "PACKAGES" ? <>
      <div className="selling-master-toolbar"><div className="selling-flex-beta-badge">FLEX · fase inicial</div><button className="selling-new-package" onClick={() => setDraft(emptyDraft())}>+ Novo pacote</button></div>
      {!visiblePackages.length ? <div className="selling-empty"><b>Nenhum pacote FLEX criado.</b><span>Crie Essencial, Intermediário e Premium e vincule aos modelos/revisões.</span></div> : <div className="selling-admin-package-grid">{visiblePackages.map((pkg) => <article key={pkg.id} className="selling-admin-card" style={{ "--selling-color": pkg.color } as any}>
        <div className="selling-admin-card-head"><span>{pkg.tier === "INTERMEDIARIO" ? "INTERMEDIÁRIO" : pkg.tier}</span><em>FLEX</em></div><h3>{pkg.name}</h3><p>{pkg.description || "Pacote agregado à revisão obrigatória."}</p>
        <div className="selling-admin-stats"><span><b>{pkg.items.length}</b>linhas</span><span><b>{pkg.model_keys.length || "Todos"}</b>modelos</span><span><b>{pkg.revision_kms.length || "Todas"}</b>revisões</span></div>
        <div className="selling-admin-price"><small>Adicionais configurados</small><strong>{money(pkg.items.reduce((sum, item) => sum + itemTotal(item), 0))}</strong></div>
        <div className="selling-admin-flags"><span className={pkg.active ? "on" : "off"}>{pkg.active ? "Ativo" : "Inativo"}</span><span className={pkg.published ? "on" : "off"}>{pkg.published ? "Publicado" : "Rascunho"}</span><span>{pkg.presentation_mode === "DETAILED" ? "Detalhado" : "Agrupado"}</span></div>
        <footer><button onClick={() => setDraft(packageToDraft(pkg))}>Editar</button><button className="danger" onClick={() => void deletePackage(pkg)}>Excluir</button></footer>
      </article>)}</div>}
    </> : tab === "IMPORT" ? <div className="selling-import-layout">
      <article className="selling-import-card"><small>BASE DE REVISÕES</small><h3>Importar planilha Nissan</h3><p>Atualiza peças, mão de obra, preços e quilometragens obrigatórias. A fase atual do Selling utiliza somente aplicações FLEX.</p><label className={saving ? "disabled" : ""}>Selecionar XLSX<input disabled={saving} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={importWorkbook} /></label><div className="selling-import-rules"><span>✓ Revisão obrigatória é igual nos três planos.</span><span>✓ Pacotes adicionais não alteram a planilha.</span><span>✓ FLEX é a família publicada nesta beta.</span></div></article>
      <section className="selling-model-list"><header><b>Modelos FLEX disponíveis</b><span>{models.length}</span></header>{models.slice(0, 80).map((model) => <div key={model.key}><span><b>{model.name}</b><small>{model.year || model.key}</small></span><em className="fuel-flex">FLEX</em><strong>{model.revisionKms.map(kmLabel).join(" · ")}</strong></div>)}</section>
      <section className="selling-import-history"><header><b>Últimas importações</b></header>{data.imports.length ? data.imports.map((entry) => <div key={entry.id}><span><b>{entry.file_name}</b><small>{new Date(entry.created_at).toLocaleString("pt-BR")}</small></span><em className={entry.status.toLowerCase()}>{entry.status}</em><strong>{entry.revisions_count} revisões · {entry.items_count} itens</strong></div>) : <p>Nenhuma importação registrada.</p>}</section>
    </div> : <div className="selling-payment-master"><article><small>CONDIÇÕES COMERCIAIS DO SELLING</small><h3>Pagamento por grupo</h3><p>Defina o parcelamento máximo conforme o valor total apresentado ao cliente. A operação mostra Débito/Pix e todas as parcelas de crédito até o limite da faixa.</p><label>Grupo<select value={paymentGroupId} onChange={(e) => loadPaymentDraft(e.target.value)}><option value="">Selecione...</option>{data.groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><div className="selling-payment-flags"><label><input type="checkbox" checked={paymentDraft.allowPix} onChange={(e) => setPaymentDraft({ ...paymentDraft, allowPix: e.target.checked })} /> Pix</label><label><input type="checkbox" checked={paymentDraft.allowDebit} onChange={(e) => setPaymentDraft({ ...paymentDraft, allowDebit: e.target.checked })} /> Débito</label><label><input type="checkbox" checked={paymentDraft.allowCredit} onChange={(e) => setPaymentDraft({ ...paymentDraft, allowCredit: e.target.checked })} /> Crédito</label></div><div className="selling-payment-rules"><header><span>Valor mínimo</span><span>Valor máximo</span><span>Máx. parcelas</span><span /></header>{paymentDraft.rules.map((rule, index) => <div key={index}><input type="number" min="0" step="0.01" value={rule.min} onChange={(e) => { const rules=[...paymentDraft.rules]; rules[index]={...rule,min:Number(e.target.value)}; setPaymentDraft({...paymentDraft,rules}); }} /><input type="number" min="0" step="0.01" value={rule.max ?? ""} placeholder="Sem limite" onChange={(e) => { const rules=[...paymentDraft.rules]; rules[index]={...rule,max:e.target.value===""?null:Number(e.target.value)}; setPaymentDraft({...paymentDraft,rules}); }} /><input type="number" min="1" max="12" value={rule.maxInstallments} onChange={(e) => { const rules=[...paymentDraft.rules]; rules[index]={...rule,maxInstallments:Number(e.target.value)}; setPaymentDraft({...paymentDraft,rules}); }} /><button onClick={() => setPaymentDraft({...paymentDraft,rules:paymentDraft.rules.filter((_,i)=>i!==index)})}>×</button></div>)}</div><div className="selling-payment-actions"><button className="outline" onClick={() => setPaymentDraft({...paymentDraft,rules:[...paymentDraft.rules,{min:0,max:null,maxInstallments:1}]})}>+ Faixa</button><button className="primary" disabled={!paymentGroupId || saving} onClick={() => void savePaymentSettings()}>{saving ? "Salvando..." : "Salvar condições"}</button></div></article></div>}

    {draft && <div className="selling-editor-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setDraft(null); }}><section className="selling-package-editor" role="dialog" aria-modal="true">
      <header><div><small>PACOTE AGREGADO · FLEX</small><h2>{draft.packageId ? `Editar ${draft.name}` : "Novo pacote Selling"}</h2><p>Os itens opcionais ficam coloridos na apresentação; a revisão obrigatória entra automaticamente em todos os cards.</p></div><button disabled={saving} onClick={() => setDraft(null)}>×</button></header>
      <div className="selling-package-editor-body">
        <div className="selling-editor-section"><h3>1. Identificação</h3><div className="selling-editor-grid"><label>Nome<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label><label>Nível<select value={draft.tier} onChange={(e) => { const tier = e.target.value as PackageDraft["tier"]; const defaults = tierDefaults[tier]; setDraft({ ...draft, tier, name: draft.packageId ? draft.name : defaults.name, color: draft.packageId ? draft.color : defaults.color, installments: draft.packageId ? draft.installments : defaults.installments, displayOrder: draft.packageId ? draft.displayOrder : defaults.order }); }}><option value="ESSENCIAL">Essencial</option><option value="INTERMEDIARIO">Intermediário</option><option value="PREMIUM">Premium</option></select></label><label>Família<div className="selling-fixed-family">FLEX <small>Beta inicial</small></div></label><label>Cor<div className="selling-color-field"><input type="color" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} /><input value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} /></div></label><label className="wide">Descrição<input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Ex.: Proteção, conforto e conservação" /></label></div></div>

        <div className="selling-editor-section"><div className="selling-section-title-row"><div><h3>2. Opcionais do pacote</h3><p className="selling-section-help">A posição abaixo é a mesma posição apresentada ao cliente. Use ↑ e ↓ para ordenar.</p></div><label className="selling-package-pdf-import">Importar RECOMENDADOS Mobato<input disabled={saving} type="file" accept="application/pdf,.pdf" onChange={importPackagePdf} /></label></div>
          <div className="selling-pdf-rule">PDF Mobato: somente a tabela <b>RECOMENDADOS</b> · <b>negrito = mão de obra</b> · texto normal = peça.</div>
          <div className="selling-items-editor"><div className="selling-items-header selling-items-header-v2"><span>Pos.</span><span>Tipo</span><span>Código</span><span>Descrição técnica</span><span>Qtd.</span><span>Valor un.</span><span>Total</span><span>M.O. h</span><span /></div>{draft.items.map((item, index) => <div className="selling-item-row-shell" key={item.id}>
            <div className="selling-item-row selling-item-row-v2">
              <div className="selling-item-position"><button disabled={index === 0} title="Mover para cima" onClick={() => setDraft({ ...draft, items: moveItem(draft.items, index, index - 1) })}>↑</button><span>{index + 1}</span><button disabled={index === draft.items.length - 1} title="Mover para baixo" onClick={() => setDraft({ ...draft, items: moveItem(draft.items, index, index + 1) })}>↓</button></div>
              <select value={item.itemType} onChange={(e) => { const items = [...draft.items]; items[index] = { ...item, itemType: e.target.value as PackageDraftItem["itemType"] }; setDraft({ ...draft, items }); }}><option value="LABOR">Mão de obra</option><option value="SERVICE">Serviço</option><option value="PART">Peça</option></select>
              <input value={item.code} onChange={(e) => { const items = [...draft.items]; items[index] = { ...item, code: e.target.value }; setDraft({ ...draft, items }); }} />
              <input value={item.description} onChange={(e) => { const items = [...draft.items]; items[index] = { ...item, description: e.target.value }; setDraft({ ...draft, items }); }} placeholder="Descrição técnica do adicional" />
              <input type="number" min="0.001" step="0.1" value={item.quantity} onChange={(e) => { const items = [...draft.items]; items[index] = { ...item, quantity: Number(e.target.value) }; setDraft({ ...draft, items }); }} />
              <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => { const items = [...draft.items]; items[index] = { ...item, unitPrice: Number(e.target.value), lineTotal: item.source === "MANUAL" ? null : item.lineTotal }; setDraft({ ...draft, items }); }} />
              <input type="number" min="0" step="0.01" value={item.lineTotal === null ? Number((item.quantity * item.unitPrice).toFixed(2)) : item.lineTotal} onChange={(e) => { const items = [...draft.items]; items[index] = { ...item, lineTotal: Math.max(0, Number(e.target.value) || 0) }; setDraft({ ...draft, items }); }} />
              <input type="number" min="0" step="0.1" value={item.laborHours} onChange={(e) => { const items = [...draft.items]; items[index] = { ...item, laborHours: Number(e.target.value) }; setDraft({ ...draft, items }); }} />
              <button className="selling-remove-item" onClick={() => setDraft({ ...draft, items: draft.items.filter((_, itemIndex) => itemIndex !== index) })}>×</button>
            </div>
            <div className="selling-item-category-row"><label>Categoria<input value={item.categoryKey} onChange={(e) => { const items=[...draft.items]; const categoryKey=e.target.value; items[index]={...item,categoryKey,categoryName:item.categoryName || categoryKey}; setDraft({...draft,items}); }} placeholder="Ex.: HIGIENIZACAO_AC" /></label><label>Nome visual no card<input value={item.visualName} onChange={(e) => { const items=[...draft.items]; items[index]={...item,visualName:e.target.value,categoryName:e.target.value || item.categoryName}; setDraft({...draft,items}); }} placeholder="Ex.: Higienização do A/C" /></label><label className="selling-item-individual"><input type="checkbox" checked={item.showIndividual} onChange={(e) => { const items=[...draft.items]; items[index]={...item,showIndividual:e.target.checked}; setDraft({...draft,items}); }} /> Mostrar separado</label><label className="selling-item-individual"><input type="checkbox" checked={item.showPrice} onChange={(e) => { const items=[...draft.items]; items[index]={...item,showPrice:e.target.checked}; setDraft({...draft,items}); }} /> Exibir valor</label></div>
          </div>)}<button className="selling-add-item" onClick={() => setDraft({ ...draft, items: [...draft.items, { id: uid(), itemType: "LABOR", code: "", description: "", quantity: 1, unitPrice: 0, lineTotal: null, laborHours: 0, source: "MANUAL", sourceFile: "", categoryKey: "", categoryName: "", visualName: "", showIndividual: false, showPrice: true }] })}>+ Adicionar peça / mão de obra</button></div>
          <div className="selling-presentation-mode"><b>Como mostrar os adicionais ao cliente?</b><label className={draft.presentationMode === "GROUPED" ? "selected" : ""}><input type="radio" checked={draft.presentationMode === "GROUPED"} onChange={() => setDraft({ ...draft, presentationMode: "GROUPED" })} /><span><strong>Agrupar por categoria</strong><small>Itens com a mesma categoria viram um único benefício visual. Sem categoria, mantém a lógica mão de obra + peças seguintes.</small></span></label><label className={draft.presentationMode === "DETAILED" ? "selected" : ""}><input type="radio" checked={draft.presentationMode === "DETAILED"} onChange={() => setDraft({ ...draft, presentationMode: "DETAILED" })} /><span><strong>Detalhar item a item</strong><small>Mostra cada peça e cada mão de obra separadamente.</small></span></label><em>Total atual: {money(draft.items.reduce((sum, item) => sum + itemTotal(item), 0))}</em></div>
        </div>

        <div className="selling-editor-section"><h3>3. Aplicação</h3><p className="selling-section-help">Nesta fase somente modelos FLEX são liberados. Selecione exatamente os modelos e revisões em que o pacote deve aparecer.</p><div className="selling-model-checks">{models.length ? models.map((model) => <label key={model.key} className={draft.modelKeys.includes(model.key) ? "selected" : ""}><input type="checkbox" checked={draft.modelKeys.includes(model.key)} onChange={() => setDraft({ ...draft, modelKeys: draft.modelKeys.includes(model.key) ? draft.modelKeys.filter((key) => key !== model.key) : [...draft.modelKeys, model.key], revisionKms: [] })} /><span><b>{model.name}</b><small>{model.year || "FLEX"}</small></span></label>) : <div className="selling-empty-inline">Importe a planilha para liberar os modelos.</div>}</div><h4>Revisões em que o pacote aparece</h4><div className="selling-km-checks">{availableKms.map((km) => <label key={km} className={draft.revisionKms.includes(km) ? "selected" : ""}><input type="checkbox" checked={draft.revisionKms.includes(km)} onChange={() => setDraft({ ...draft, revisionKms: draft.revisionKms.includes(km) ? draft.revisionKms.filter((value) => value !== km) : [...draft.revisionKms, km] })} />{kmLabel(km)}</label>)}</div></div>

        <div className="selling-editor-section"><h3>4. Publicação e posição</h3><div className="selling-editor-grid"><label>Escopo<select value={draft.scopeType} onChange={(e) => setDraft({ ...draft, scopeType: e.target.value as PackageDraft["scopeType"], targetGroupId: "", targetCompanyId: "" })}><option value="GLOBAL">Todas as operações com Selling</option><option value="GROUP">Somente um grupo</option><option value="COMPANY">Somente uma empresa</option></select></label>{draft.scopeType === "GROUP" && <label>Grupo<select value={draft.targetGroupId} onChange={(e) => setDraft({ ...draft, targetGroupId: e.target.value })}><option value="">Selecione...</option>{data.groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>}{draft.scopeType === "COMPANY" && <label>Empresa<select value={draft.targetCompanyId} onChange={(e) => setDraft({ ...draft, targetCompanyId: e.target.value })}><option value="">Selecione...</option>{data.groups.flatMap((group) => (group.companies || []).map((company) => <option key={company.id} value={company.id}>{group.name} · {company.name}</option>))}</select></label>}<label>Parcelamento<input type="number" min="1" max="24" value={draft.installments} onChange={(e) => setDraft({ ...draft, installments: Number(e.target.value) })} /></label><label>Posição do plano<input type="number" min="0" value={draft.displayOrder} onChange={(e) => setDraft({ ...draft, displayOrder: Number(e.target.value) })} /></label></div><div className="selling-publish-toggles"><label><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Ativo</label><label><input type="checkbox" checked={draft.published} onChange={(e) => setDraft({ ...draft, published: e.target.checked })} /> Publicado na operação</label></div></div>
      </div>
      <footer><button className="outline" disabled={saving} onClick={() => setDraft(null)}>Cancelar</button><button className="primary" disabled={saving || draft.name.trim().length < 2 || !draft.modelKeys.length || !draft.revisionKms.length || (draft.scopeType === "GROUP" && !draft.targetGroupId) || (draft.scopeType === "COMPANY" && !draft.targetCompanyId)} onClick={() => void savePackage()}>{saving ? "Salvando..." : "Salvar pacote"}</button></footer>
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

export function SellingOperationPage({ companyId, storeId, accessToken, currentUserName, currentUserPhone, storeName, companyName, identity }: SellingOperationProps) {
  const [revisions, setRevisions] = useState<SellingRevision[]>([]);
  const [packages, setPackages] = useState<SellingPackage[]>([]);
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

  // Dados comerciais são preenchidos somente depois de o plano ser escolhido.
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [plate, setPlate] = useState("");
  const [vehicleDescription, setVehicleDescription] = useState("");
  const [promisedTime, setPromisedTime] = useState("");
  const [consultantName, setConsultantName] = useState(currentUserName || "");
  const [consultantPhone, setConsultantPhone] = useState(currentUserPhone || "");

  useEffect(() => { setConsultantName(currentUserName || ""); setConsultantPhone(currentUserPhone || ""); }, [currentUserName, currentUserPhone]);
  useEffect(() => { void (async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/selling?companyId=${encodeURIComponent(companyId)}&storeId=${encodeURIComponent(storeId)}`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
      const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || "Não foi possível abrir o Selling.");
      const flexRevisions = (payload.revisions || []).filter((revision: SellingRevision) => revision.fuel_type === "FLEX");
      setRevisions(flexRevisions);
      setPackages((payload.packages || []).filter((pkg: SellingPackage) => pkg.fuel_type === "FLEX"));
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
  const matchingPackages = selectedRevision ? packages.filter((pkg) => (!pkg.model_keys.length || pkg.model_keys.includes(selectedRevision.model_key)) && (!pkg.revision_kms.length || pkg.revision_kms.includes(Number(selectedRevision.revision_km)))).sort((a, b) => Number(a.display_order) - Number(b.display_order)) : [];
  const selectedPackage = matchingPackages.find((pkg) => pkg.id === selectedPackageId) || null;
  const selectedDisabled = selectedPackage ? disabledItems[selectedPackage.id] || [] : [];

  function packageAddonTotal(pkg: SellingPackage) {
    const disabled = disabledItems[pkg.id] || [];
    return pkg.items.reduce((sum, item, index) => disabled.includes(itemId(item, index)) ? sum : sum + itemTotal(item), 0);
  }
  function packageTotal(pkg: SellingPackage) { return Number(selectedRevision?.base_price || 0) + packageAddonTotal(pkg); }
  const selectedTotal = selectedPackage ? packageTotal(selectedPackage) : 0;

  function maxInstallmentsFor(total: number) {
    const rules = [...(paymentSettings.installment_rules || [])].sort((a, b) => Number(a.min) - Number(b.min));
    const matched = rules.find((rule) => total >= Number(rule.min || 0) && (rule.max === null || rule.max === undefined || total <= Number(rule.max)));
    return Math.max(1, Math.floor(Number(matched?.max_installments || 1)));
  }
  function paymentOptions(total: number) {
    const options: Array<{ key: string; label: string; detail: string }> = [];
    if (paymentSettings.allow_debit || paymentSettings.allow_pix) options.push({ key: "DEBIT_PIX", label: paymentSettings.allow_debit && paymentSettings.allow_pix ? "Débito / Pix" : paymentSettings.allow_pix ? "Pix" : "Débito", detail: money(total) });
    if (paymentSettings.allow_credit) {
      const max = maxInstallmentsFor(total);
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
  function startShowcase(event: FormEvent) {
    event.preventDefault();
    if (!selectedRevision) return window.alert("Selecione o modelo e a revisão.");
    setSelectedPackageId(""); setPaymentPackageId(""); setStep("SHOWCASE");
  }
  function openCheckout() {
    if (!selectedPackage || !selectedRevision) return;
    if (!paymentChoiceByPackage[selectedPackage.id]) {
      const first = paymentOptions(selectedTotal)[0];
      if (first) setPaymentChoiceByPackage((current) => ({ ...current, [selectedPackage.id]: `${first.label} · ${first.detail}` }));
    }
    setStep("CHECKOUT");
  }

  async function savePresentation(printAfter = false) {
    if (!selectedPackage || !selectedRevision) return;
    if (!customerName.trim()) return window.alert("Informe o nome do cliente.");
    if (!plate.trim()) return window.alert("Informe a placa.");
    if (!vehicleDescription.trim()) return window.alert("Informe o veículo.");
    if (!promisedTime) return window.alert("Informe o horário previsto de entrega.");
    setSavingPresentation(true); setError("");
    const disabled = disabledItems[selectedPackage.id] || [];
    const accepted = selectedPackage.items.filter((item, index) => !disabled.includes(itemId(item, index)));
    const declined = selectedPackage.items.filter((item, index) => disabled.includes(itemId(item, index)));
    const snapshot = { revision: selectedRevision, package: { ...selectedPackage, items: accepted }, declinedItems: declined, requiredItems: selectedRevision.items, payment: paymentChoiceByPackage[selectedPackage.id] || "" };
    try {
      const response = await fetch("/api/selling", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ companyId, storeId, revisionId: selectedRevision.id, packageId: selectedPackage.id, customerName: customerName.trim(), customerPhone: customerPhone.trim(), plate: plate.trim(), vehicleDescription: vehicleDescription.trim(), consultantName: consultantName.trim(), consultantPhone: consultantPhone.trim(), promisedTime, total: selectedTotal, snapshot }) });
      const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || "Não foi possível registrar a apresentação.");
      setPresentationId(payload.id || "");
      if (printAfter) window.setTimeout(() => printPresentation(), 80);
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao salvar apresentação."); }
    finally { setSavingPresentation(false); }
  }

  function printPresentation() {
    if (!selectedPackage || !selectedRevision || !customerName.trim() || !plate.trim()) return;
    const disabled = disabledItems[selectedPackage.id] || [];
    const acceptedUnits = packageUnits(selectedPackage).filter((unit) => !unit.itemIds.every((id) => disabled.includes(id)));
    const declinedUnits = packageUnits(selectedPackage).filter((unit) => unit.itemIds.every((id) => disabled.includes(id)));
    const accent = /^#[0-9a-f]{6}$/i.test(selectedPackage.color) ? selectedPackage.color : "#08c9ac";
    const logo = identity?.logo ? `<img src="${escapeHtml(identity.logo)}" alt="Logo"/>` : `<div class="logo">G</div>`;
    const requiredRows = selectedRevision.items.map((item) => `<tr><td>${escapeHtml(item.description)}</td><td>${item.item_type === "LABOR" ? `${Number(item.labor_hours || item.quantity || 0).toLocaleString("pt-BR")} h` : `${Number(item.quantity).toLocaleString("pt-BR")}x`}</td></tr>`).join("");
    const acceptedRows = acceptedUnits.map((unit) => `<tr><td>${escapeHtml(unit.title)}</td><td>${unit.showPrice ? money(unit.total) : ""}</td></tr>`).join("");
    const declinedRows = declinedUnits.length ? `<section><h3>Benefícios não autorizados</h3><ul>${declinedUnits.map((unit) => `<li>${escapeHtml(unit.title)}</li>`).join("")}</ul></section>` : "";
    const payment = paymentChoiceByPackage[selectedPackage.id] || "Não definido";
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Selling - ${escapeHtml(customerName)}</title><style>
      :root{--accent:${accent};--ink:#142331;--muted:#667682;--line:#dfe5e9}*{box-sizing:border-box}body{margin:0;background:#edf1f4;color:var(--ink);font-family:Arial,sans-serif}.toolbar{max-width:210mm;margin:10px auto;text-align:right}.toolbar button{border:0;border-radius:8px;padding:10px 16px;background:var(--accent);color:white;font-weight:800}.sheet{width:210mm;min-height:287mm;margin:0 auto 20px;padding:12mm;background:white}.head{display:flex;justify-content:space-between;gap:20px;align-items:center;border-bottom:4px solid var(--accent);padding-bottom:10px}.brand{display:flex;align-items:center;gap:12px}.brand img{max-width:130px;max-height:54px}.logo{display:grid;place-items:center;width:48px;height:48px;border-radius:12px;background:var(--accent);color:white;font-size:24px;font-weight:900}.head h1{margin:0;font-size:22px}.head p{margin:4px 0;color:var(--muted)}.package{text-align:right}.package b{display:block;color:var(--accent);font-size:20px}.package strong{font-size:25px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:15px 0}.card{border:1px solid var(--line);border-radius:9px;padding:10px}.card small{display:block;color:var(--muted);font-size:9px;text-transform:uppercase}.card b,.card strong{display:block;margin-top:3px}.checkout{border-color:var(--accent);background:#f8fffd}.checkout strong{font-size:22px;color:var(--accent)}section{margin-top:14px}h3{margin:0 0 7px;font-size:14px}table{width:100%;border-collapse:collapse}td{border-bottom:1px solid var(--line);padding:6px 2px;font-size:11px}td:last-child{text-align:right;font-weight:700}.total{display:flex;justify-content:space-between;align-items:center;margin-top:18px;padding:13px;border-radius:9px;background:#102837;color:white}.total strong{font-size:23px;color:var(--accent)}.payment{margin-top:10px;padding:10px;border:1px solid var(--line);border-radius:8px}.signature{display:grid;grid-template-columns:1fr 1fr;gap:35px;margin-top:35px}.signature div{padding-top:25px;border-top:1px solid #555;text-align:center;font-size:10px}.foot{margin-top:20px;text-align:center;color:#89959c;font-size:9px}@media print{body{background:#fff}.toolbar{display:none}.sheet{margin:0;box-shadow:none}}
    </style></head><body><div class="toolbar"><button onclick="window.print()">Imprimir / PDF</button></div><main class="sheet"><div class="head"><div class="brand">${logo}<div><h1>${escapeHtml(identity?.displayName || companyName || "Gerivo Selling")}</h1><p>${escapeHtml(storeName)}</p></div></div><div class="package"><span>${escapeHtml(selectedPackage.name)}</span><b>${kmLabel(Number(selectedRevision.revision_km))}</b><strong>${money(selectedTotal)}</strong></div></div><div class="meta"><div class="card"><small>Cliente</small><b>${escapeHtml(customerName)}</b><span>${escapeHtml(customerPhone)}</span></div><div class="card"><small>Veículo / placa</small><b>${escapeHtml(vehicleDescription)}</b><span>${escapeHtml(plate.toUpperCase())}</span></div><div class="card checkout"><small>Check-out previsto</small><strong>${escapeHtml(promisedTime)}</strong><span>Horário combinado de entrega</span></div><div class="card"><small>Consultor responsável</small><b>${escapeHtml(consultantName)}</b><span>${escapeHtml(consultantPhone)}</span></div></div><section><h3>Revisão obrigatória / preconizado - ${escapeHtml(selectedRevision.model_name)}</h3><table>${requiredRows}</table></section><section><h3>Benefícios autorizados - ${escapeHtml(selectedPackage.name)}</h3><table>${acceptedRows || "<tr><td>Nenhum adicional autorizado</td><td>R$ 0,00</td></tr>"}</table></section>${declinedRows}<div class="payment"><b>Forma de pagamento</b><div>${escapeHtml(payment)}</div></div><div class="total"><span>Revisão + benefícios autorizados</span><strong>${money(selectedTotal)}</strong></div><div class="signature"><div>Assinatura do cliente / pessoa autorizada</div><div>${escapeHtml(consultantName)} - Consultor</div></div><div class="foot">Gerivo Selling${presentationId ? ` · Registro ${escapeHtml(presentationId)}` : ""} · ${new Date().toLocaleString("pt-BR")}</div></main></body></html>`;
    const popup = window.open("", "_blank", "width=980,height=900"); if (!popup) return window.alert("O navegador bloqueou a janela de impressão."); popup.document.open(); popup.document.write(html); popup.document.close();
  }

  if (loading) return <div className="selling-operation-loading"><span />Preparando Selling...</div>;
  if (error && !revisions.length) return <div className="selling-operation-error"><b>Não foi possível abrir o Selling.</b><span>{error}</span></div>;
  if (!revisions.length) return <div className="selling-operation-error"><b>Não existem revisões FLEX importadas.</b><span>O MASTER deve importar a planilha de revisões antes de usar o Selling.</span></div>;

  const paymentPkg = matchingPackages.find((pkg) => pkg.id === paymentPackageId) || null;
  const paymentPkgTotal = paymentPkg ? packageTotal(paymentPkg) : 0;

  return <section className="selling-operation-v3">
    {step === "SETUP" && <div className="selling-setup-v3"><div className="selling-stepper"><span className="active"><b>1</b>Revisão</span><i /><span><b>2</b>Pacotes</span><i /><span><b>3</b>Fechamento</span></div><form onSubmit={startShowcase} className="selling-setup-v3-card"><div><small>GERIVO SELLING · FLEX</small><h2>Qual revisão vamos apresentar?</h2><p>Escolha somente o modelo e a quilometragem. Os dados do cliente, placa, veículo e entrega serão preenchidos depois que o pacote for fechado.</p></div><label>Modelo<select value={modelKey} onChange={(e) => { const next=e.target.value; setModelKey(next); const first=revisions.find((revision)=>revision.model_key===next); setRevisionKm(Number(first?.revision_km)||0); setSelectedPackageId(""); }}>{models.map((model)=><option key={model.key} value={model.key}>{model.name}</option>)}</select></label><label>Revisão<select value={revisionKm} onChange={(e)=>{setRevisionKm(Number(e.target.value));setSelectedPackageId("");}}>{modelRevisions.map((revision)=><option key={revision.id} value={revision.revision_km}>{kmLabel(Number(revision.revision_km))} · {money(Number(revision.base_price))}</option>)}</select></label><button type="submit">Apresentar pacotes →</button></form></div>}

    {step === "SHOWCASE" && selectedRevision && <div className="selling-fullscreen selling-fullscreen-v3"><header className="selling-showcase-top-v3"><div><small>REVISÃO SELECIONADA</small><b>{selectedRevision.model_name}</b><span>{kmLabel(Number(selectedRevision.revision_km))} · Preconizado {money(Number(selectedRevision.base_price))}</span></div><div className="selling-stepper light"><span><b>1</b>Revisão</span><i /><span className="active"><b>2</b>Pacotes</span><i /><span><b>3</b>Fechamento</span></div><button onClick={()=>setStep("SETUP")}>← Alterar revisão</button></header><main className="selling-fullscreen-body selling-fullscreen-body-v3">
      {!matchingPackages.length ? <div className="selling-no-packages"><b>Nenhum pacote publicado para esta combinação.</b><span>Vincule no MASTER um pacote FLEX ao modelo {selectedRevision.model_name} e à revisão {kmLabel(Number(selectedRevision.revision_km))}.</span></div> : <div className="selling-package-showcase-v3">{matchingPackages.map((pkg) => {
        const disabled=disabledItems[pkg.id]||[]; const units=packageUnits(pkg); const total=packageTotal(pkg); const selected=selectedPackageId===pkg.id; const paymentLabel=paymentChoiceByPackage[pkg.id];
        return <article key={pkg.id} className={`selling-showcase-card-v3 ${selected?"selected":""}`} style={{"--selling-color":pkg.color} as any}><header><b>{pkg.tier === "INTERMEDIARIO" ? "INTERMEDIÁRIO" : pkg.tier}</b></header><button type="button" className="selling-card-price-v3" onClick={()=>setPaymentPackageId(pkg.id)}><small>A partir de</small><strong>{money(total)}</strong><span>{paymentLabel || `Toque no valor para ver pagamento · até ${maxInstallmentsFor(total)}x`}</span></button><section className="selling-required-v3"><div><small>REVISÃO OBRIGATÓRIA · PRECONIZADO</small><b>{money(Number(selectedRevision.base_price))}</b></div>{selectedRevision.items.map((item,index)=><p key={item.id||index}><span>{item.description}</span><em>{item.item_type === "LABOR" ? `${Number(item.labor_hours || item.quantity || 0).toLocaleString("pt-BR")} h` : `${Number(item.quantity || 0).toLocaleString("pt-BR")}x`}</em></p>)}</section><section className="selling-benefits-v3"><small>BENEFÍCIOS DO PACOTE</small>{units.map((unit)=>{const off=unit.itemIds.every((id)=>disabled.includes(id));return <button key={unit.key} type="button" className={off?"disabled":""} onClick={()=>toggleUnit(pkg,unit)}><i>{off?"×":"✓"}</i><span><b>{unit.title}</b><small>{off?"Cliente não deseja executar":unit.detail}</small></span>{unit.showPrice && <em>{off?`- ${money(unit.total)}`:money(unit.total)}</em>}</button>})}</section><button className="selling-select-plan-v3" onClick={()=>setSelectedPackageId(selected?"":pkg.id)}>{selected?"✓ PACOTE ESCOLHIDO":"ESCOLHER ESTE PACOTE"}</button></article>;
      })}</div>}
    </main>{selectedPackage && <footer className="selling-fullscreen-footer selling-fullscreen-footer-v3"><div><small>PACOTE ESCOLHIDO</small><b>{selectedPackage.name}</b><span>{packageUnits(selectedPackage).filter((unit)=>!unit.itemIds.every((id)=>selectedDisabled.includes(id))).length} benefício(s) autorizado(s)</span></div><div><small>TOTAL</small><strong>{money(selectedTotal)}</strong><button onClick={openCheckout}>Fechar proposta →</button></div></footer>}</div>}

    {paymentPkg && <div className="selling-payment-backdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget)setPaymentPackageId("")}}><section className="selling-payment-modal"><header><div><small>FORMAS DE PAGAMENTO</small><h3>{paymentPkg.name}</h3></div><button onClick={()=>setPaymentPackageId("")}>×</button></header><strong>{money(paymentPkgTotal)}</strong><p>Condição disponível conforme a faixa de valor configurada no Gerivo MASTER.</p><div>{paymentOptions(paymentPkgTotal).map((option)=><button key={option.key} onClick={()=>{setPaymentChoiceByPackage((current)=>({...current,[paymentPkg.id]:`${option.label} · ${option.detail}`}));setPaymentPackageId("");}}><span>{option.label}</span><b>{option.detail}</b></button>)}</div></section></div>}

    {step === "CHECKOUT" && selectedRevision && selectedPackage && <div className="selling-fullscreen selling-checkout-v3"><header className="selling-showcase-top-v3"><div><small>PACOTE ESCOLHIDO</small><b>{selectedPackage.name}</b><span>{selectedRevision.model_name} · {kmLabel(Number(selectedRevision.revision_km))}</span></div><div className="selling-stepper light"><span><b>1</b>Revisão</span><i /><span><b>2</b>Pacotes</span><i /><span className="active"><b>3</b>Fechamento</span></div><button onClick={()=>setStep("SHOWCASE")}>← Voltar aos pacotes</button></header><main className="selling-checkout-v3-body"><section className="selling-checkout-v3-form"><small>DADOS PARA FECHAMENTO</small><h2>Complete os dados do cliente</h2><div className="selling-checkout-v3-grid"><label>Nome do cliente<input value={customerName} onChange={(e)=>setCustomerName(e.target.value)} /></label><label>Telefone<input value={customerPhone} onChange={(e)=>setCustomerPhone(e.target.value)} /></label><label>Placa<input value={plate} onChange={(e)=>setPlate(e.target.value.toUpperCase())} /></label><label>Veículo<input value={vehicleDescription} onChange={(e)=>setVehicleDescription(e.target.value)} placeholder={selectedRevision.model_name} /></label><label>Horário previsto de entrega<input type="time" value={promisedTime} onChange={(e)=>setPromisedTime(e.target.value)} /></label><label>Consultor<input value={consultantName} onChange={(e)=>setConsultantName(e.target.value)} /></label><label>Contato do consultor<input value={consultantPhone} onChange={(e)=>setConsultantPhone(e.target.value)} /></label><label>Pagamento<select value={paymentChoiceByPackage[selectedPackage.id] || ""} onChange={(e)=>setPaymentChoiceByPackage((current)=>({...current,[selectedPackage.id]:e.target.value}))}><option value="">Selecione...</option>{paymentOptions(selectedTotal).map((option)=><option key={option.key} value={`${option.label} · ${option.detail}`}>{option.label} · {option.detail}</option>)}</select></label></div>{error && <div className="selling-checkout-warning">{error}</div>}<div className="selling-checkout-v3-actions"><button className="outline" disabled={savingPresentation} onClick={()=>void savePresentation(false)}>{savingPresentation?"Salvando...":"Salvar fechamento"}</button><button className="primary" disabled={savingPresentation} onClick={()=>void savePresentation(true)}>{savingPresentation?"Preparando...":"Salvar e imprimir para assinatura"}</button></div></section><aside className="selling-checkout-summary-v3"><small>CHECK-OUT</small><h3>{selectedPackage.name}</h3><strong>{money(selectedTotal)}</strong><span><b>{selectedRevision.model_name}</b>{kmLabel(Number(selectedRevision.revision_km))}</span><span><b>Pagamento</b>{paymentChoiceByPackage[selectedPackage.id] || "A definir"}</span><span><b>Entrega prevista</b>{promisedTime || "A definir"}</span><span><b>Consultor</b>{consultantName || "A definir"}</span>{presentationId && <div className="selling-recorded">✓ Fechamento registrado no Gerivo</div>}<button disabled={!customerName.trim() || !plate.trim()} onClick={printPresentation}>Imprimir novamente</button></aside></main></div>}
  </section>;
}
