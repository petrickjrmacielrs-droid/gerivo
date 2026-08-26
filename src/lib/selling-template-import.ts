import "server-only";
import { readXlsx, type XlsxCell, type XlsxSheet } from "./xlsx-lite";

export type SellingTemplateIssue = { level: "ERROR" | "WARNING"; sheet: string; row?: number; message: string };
export type SellingTemplateRevisionItem = {
  order: number; itemType: "PART" | "LABOR"; code: string; description: string; quantity: number;
  unitPrice: number; totalPrice: number; laborHours: number; notes: string;
};
export type SellingTemplateRevision = {
  revisionCode: string; sourceKey: string; modelKey: string; modelName: string; fuelType: "FLEX";
  yearLabel: string; revisionKm: number; basePrice: number; laborHours: number; laborValue: number;
  active: boolean; notes: string; items: SellingTemplateRevisionItem[];
};
export type SellingTemplatePackageItem = {
  order: number; itemType: "PART" | "SERVICE" | "LABOR"; itemClass: string; code: string; description: string;
  quantity: number; unitPrice: number; lineTotal: number; laborHours: number; categoryKey: string; categoryName: string;
  visualName: string; showIndividual: boolean; showPrice: boolean; infoTitle: string; infoText: string; infoMediaUrl: string;
  isCourtesy: boolean; courtesyLabel: string; courtesyNote: string; bundleKey: string; bundleName: string;
  isTire: boolean; maxInstallments: number | null; notes: string;
};
export type SellingTemplateApplication = { packageCode: string; modelKey: string; modelName: string; revisionKm: number; row: number };
export type SellingTemplatePackage = {
  importCode: string; name: string; tier: "ESSENCIAL" | "INTERMEDIARIO" | "PREMIUM"; offerType: "REVISION" | "OIL_CHANGE";
  fuelType: "FLEX"; description: string; color: string; installments: number; presentationMode: "GROUPED" | "DETAILED";
  displayOrder: number; active: boolean; published: boolean; scope: "GLOBAL" | "GROUP" | "COMPANY";
  groupName: string; companyDocument: string; notes: string; applications: SellingTemplateApplication[]; items: SellingTemplatePackageItem[];
};
export type ParsedSellingTemplate = {
  fileName: string; revisions: SellingTemplateRevision[]; packages: SellingTemplatePackage[]; issues: SellingTemplateIssue[];
};

type RowObject = { row: number; values: Record<string, XlsxCell> };

function rawText(value: XlsxCell) { return String(value ?? "").trim(); }
function ascii(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function headerKey(value: XlsxCell) {
  return ascii(rawText(value)).toLowerCase().replace(/\*/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
function slug(value: XlsxCell) {
  return ascii(rawText(value)).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function codeKey(value: XlsxCell) {
  return ascii(rawText(value)).toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
function numberValue(value: XlsxCell) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  let text = rawText(value).replace(/R\$/gi, "").replace(/\s+/g, "");
  if (!text) return 0;
  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");
  if (comma > dot) text = text.replace(/\./g, "").replace(",", ".");
  else if (dot > comma && comma >= 0) text = text.replace(/,/g, "");
  else if (comma >= 0) text = text.replace(",", ".");
  else if ((text.match(/\./g) || []).length > 1) { const parts = text.split("."); const decimal = parts.pop(); text = `${parts.join("")}.${decimal}`; }
  const parsed = Number(text.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
function boolValue(value: XlsxCell, fallback: boolean) {
  const normalized = ascii(rawText(value)).toUpperCase();
  if (!normalized) return fallback;
  if (["SIM", "S", "TRUE", "VERDADEIRO", "1", "YES"].includes(normalized)) return true;
  if (["NAO", "N", "FALSE", "FALSO", "0", "NO"].includes(normalized)) return false;
  return fallback;
}
function roundMoney(value: number) { return Math.round((Number(value) + Number.EPSILON) * 100) / 100; }
function roundQty(value: number) { return Math.round((Number(value) + Number.EPSILON) * 1000) / 1000; }
function validColor(value: XlsxCell, tier: SellingTemplatePackage["tier"]) {
  const text = rawText(value);
  if (/^#[0-9a-f]{6}$/i.test(text)) return text;
  return tier === "INTERMEDIARIO" ? "#6814f4" : tier === "PREMIUM" ? "#ffae21" : "#08c9ac";
}
function normalizedDoc(value: XlsxCell) { return rawText(value).replace(/\D/g, ""); }

function findSheet(sheets: XlsxSheet[], name: string) {
  const target = ascii(name).toUpperCase();
  return sheets.find((sheet) => ascii(sheet.name).toUpperCase() === target);
}
function tableRows(sheet: XlsxSheet | undefined, keyHeader: string): RowObject[] {
  if (!sheet) return [];
  let headerIndex = -1;
  let headers: string[] = [];
  for (let i = 0; i < Math.min(12, sheet.rows.length); i += 1) {
    const candidate = (sheet.rows[i] || []).map(headerKey);
    if (candidate.includes(keyHeader)) { headerIndex = i; headers = candidate; break; }
  }
  if (headerIndex < 0) return [];
  const result: RowObject[] = [];
  const keyIndex = headers.indexOf(keyHeader);
  for (let i = headerIndex + 1; i < sheet.rows.length; i += 1) {
    const row = sheet.rows[i] || [];
    const nonEmptyCount = row.reduce<number>((count, cell) => count + (rawText(cell) !== "" ? 1 : 0), 0);
    if (!nonEmptyCount) continue;
    // Templates may contain pre-filled formulas (for example total_estimado = 0) on hundreds of blank rows.
    // Treat those as empty while still validating genuinely partially-filled rows that forgot the key column.
    if (keyIndex >= 0 && rawText(row[keyIndex]) === "" && nonEmptyCount <= 1) continue;
    const values: Record<string, XlsxCell> = {};
    headers.forEach((header, index) => { if (header) values[header] = row[index] ?? null; });
    result.push({ row: i + 1, values });
  }
  return result;
}
function issue(issues: SellingTemplateIssue[], level: SellingTemplateIssue["level"], sheet: string, row: number | undefined, message: string) {
  issues.push({ level, sheet, row, message });
}

export function parseGerivoSellingTemplate(buffer: Buffer, fileName: string): ParsedSellingTemplate {
  const sheets = readXlsx(buffer);
  const issues: SellingTemplateIssue[] = [];
  const revisions: SellingTemplateRevision[] = [];
  const packages: SellingTemplatePackage[] = [];

  const revisionSheet = findSheet(sheets, "REVISOES");
  const revisionItemsSheet = findSheet(sheets, "ITENS_REVISAO");
  const packageSheet = findSheet(sheets, "PACOTES");
  const applicationSheet = findSheet(sheets, "APLICACOES");
  const packageItemsSheet = findSheet(sheets, "ITENS_PACOTE");

  if (!revisionSheet && !packageSheet) throw new Error("O arquivo não possui as abas REVISOES ou PACOTES do padrão Gerivo.");

  const revisionRows = tableRows(revisionSheet, "revisao_codigo");
  const revisionByCode = new Map<string, SellingTemplateRevision>();
  revisionRows.forEach(({ row, values }) => {
    const revisionCode = codeKey(values.revisao_codigo);
    const modelName = rawText(values.modelo_nome);
    const modelKey = slug(values.modelo_chave || values.modelo_nome);
    const family = ascii(rawText(values.familia || "FLEX")).toUpperCase();
    const revisionKm = Math.floor(numberValue(values.revisao_km));
    const explicitPrice = roundMoney(numberValue(values.preco_preconizado));
    if (!revisionCode) issue(issues, "ERROR", "REVISOES", row, "revisao_codigo é obrigatório.");
    if (!modelKey) issue(issues, "ERROR", "REVISOES", row, "modelo_chave é obrigatório.");
    if (!modelName) issue(issues, "ERROR", "REVISOES", row, "modelo_nome é obrigatório.");
    if (family !== "FLEX") issue(issues, "ERROR", "REVISOES", row, `família ${family || "vazia"} não é suportada nesta fase; use FLEX.`);
    if (!(revisionKm > 0)) issue(issues, "ERROR", "REVISOES", row, "revisao_km deve ser maior que zero.");
    if (revisionCode && revisionByCode.has(revisionCode)) issue(issues, "ERROR", "REVISOES", row, `revisao_codigo duplicado: ${revisionCode}.`);
    if (!revisionCode || !modelKey || !modelName || family !== "FLEX" || !(revisionKm > 0) || revisionByCode.has(revisionCode)) return;
    const revision: SellingTemplateRevision = {
      revisionCode, sourceKey: `gerivo-template:${revisionCode.toLowerCase()}`, modelKey, modelName, fuelType: "FLEX",
      yearLabel: rawText(values.ano_modelo), revisionKm, basePrice: explicitPrice,
      laborHours: roundQty(numberValue(values.horas_mo)), laborValue: roundMoney(numberValue(values.valor_mo)),
      active: boolValue(values.ativo, true), notes: rawText(values.observacoes), items: [],
    };
    revisions.push(revision); revisionByCode.set(revisionCode, revision);
  });

  const revisionItemRows = tableRows(revisionItemsSheet, "revisao_codigo");
  revisionItemRows.forEach(({ row, values }) => {
    const revisionCode = codeKey(values.revisao_codigo);
    const revision = revisionByCode.get(revisionCode);
    const rawType = ascii(rawText(values.tipo_item)).toUpperCase();
    const itemType = rawType === "LABOR" ? "LABOR" : rawType === "PART" ? "PART" : null;
    const description = rawText(values.descricao);
    const quantity = roundQty(numberValue(values.quantidade));
    const unitPrice = roundMoney(numberValue(values.valor_unitario));
    const order = Math.max(0, Math.floor(numberValue(values.ordem)) || row);
    if (!revisionCode) issue(issues, "ERROR", "ITENS_REVISAO", row, "revisao_codigo é obrigatório.");
    else if (!revision) issue(issues, "ERROR", "ITENS_REVISAO", row, `revisao_codigo ${revisionCode} não existe na aba REVISOES.`);
    if (!itemType) issue(issues, "ERROR", "ITENS_REVISAO", row, "tipo_item deve ser PART ou LABOR.");
    if (!description) issue(issues, "ERROR", "ITENS_REVISAO", row, "descricao é obrigatória.");
    if (!(quantity > 0)) issue(issues, "ERROR", "ITENS_REVISAO", row, "quantidade deve ser maior que zero.");
    if (unitPrice < 0) issue(issues, "ERROR", "ITENS_REVISAO", row, "valor_unitario não pode ser negativo.");
    if (!revision || !itemType || !description || !(quantity > 0) || unitPrice < 0) return;
    const laborHours = itemType === "LABOR" ? roundQty(numberValue(values.horas_mo) || quantity) : 0;
    revision.items.push({ order, itemType, code: rawText(values.codigo), description, quantity, unitPrice, totalPrice: roundMoney(quantity * unitPrice), laborHours, notes: rawText(values.observacoes) });
  });
  revisions.forEach((revision) => {
    revision.items.sort((a, b) => a.order - b.order);
    if (!revision.items.length) issue(issues, "WARNING", "REVISOES", undefined, `${revision.revisionCode}: nenhuma linha em ITENS_REVISAO.`);
    const labor = revision.items.filter((item) => item.itemType === "LABOR");
    if (!(revision.laborHours > 0)) revision.laborHours = roundQty(labor.reduce((sum, item) => sum + item.laborHours, 0));
    if (!(revision.laborValue > 0)) revision.laborValue = roundMoney(labor.reduce((sum, item) => sum + item.totalPrice, 0));
    const itemTotal = roundMoney(revision.items.reduce((sum, item) => sum + item.totalPrice, 0));
    if (!(revision.basePrice > 0) && itemTotal > 0) {
      revision.basePrice = itemTotal;
      issue(issues, "WARNING", "REVISOES", undefined, `${revision.revisionCode}: preço preconizado vazio/zero; usado total calculado de ${itemTotal.toFixed(2)}.`);
    }
    if (!(revision.basePrice > 0)) issue(issues, "ERROR", "REVISOES", undefined, `${revision.revisionCode}: informe preco_preconizado ou valores de itens que resultem em total maior que zero.`);
  });

  const packageRows = tableRows(packageSheet, "pacote_codigo");
  const packageByCode = new Map<string, SellingTemplatePackage>();
  packageRows.forEach(({ row, values }) => {
    const importCode = codeKey(values.pacote_codigo);
    const name = rawText(values.nome_pacote);
    const tierRaw = ascii(rawText(values.nivel)).toUpperCase();
    const tier = (["ESSENCIAL", "INTERMEDIARIO", "PREMIUM"] as const).find((value) => value === tierRaw) || null;
    const offerRaw = ascii(rawText(values.tipo_oferta || "REVISION")).toUpperCase();
    const offerType = offerRaw === "OIL_CHANGE" ? "OIL_CHANGE" : offerRaw === "REVISION" ? "REVISION" : null;
    const family = ascii(rawText(values.familia || "FLEX")).toUpperCase();
    const scopeRaw = ascii(rawText(values.escopo || "GLOBAL")).toUpperCase();
    const scope = (["GLOBAL", "GROUP", "COMPANY"] as const).find((value) => value === scopeRaw) || null;
    if (!importCode) issue(issues, "ERROR", "PACOTES", row, "pacote_codigo é obrigatório.");
    if (!name) issue(issues, "ERROR", "PACOTES", row, "nome_pacote é obrigatório.");
    if (!tier) issue(issues, "ERROR", "PACOTES", row, "nivel deve ser ESSENCIAL, INTERMEDIARIO ou PREMIUM.");
    if (!offerType) issue(issues, "ERROR", "PACOTES", row, "tipo_oferta deve ser REVISION ou OIL_CHANGE.");
    if (family !== "FLEX") issue(issues, "ERROR", "PACOTES", row, `família ${family || "vazia"} não é suportada nesta fase; use FLEX.`);
    if (!scope) issue(issues, "ERROR", "PACOTES", row, "escopo deve ser GLOBAL, GROUP ou COMPANY.");
    if (importCode && packageByCode.has(importCode)) issue(issues, "ERROR", "PACOTES", row, `pacote_codigo duplicado: ${importCode}.`);
    if (!importCode || !name || !tier || !offerType || family !== "FLEX" || !scope || packageByCode.has(importCode)) return;
    const groupName = rawText(values.grupo_nome);
    const companyDocument = normalizedDoc(values.empresa_cnpj);
    if (scope === "GROUP" && !groupName) issue(issues, "ERROR", "PACOTES", row, `${importCode}: escopo GROUP exige grupo_nome.`);
    if (scope === "COMPANY" && !companyDocument) issue(issues, "ERROR", "PACOTES", row, `${importCode}: escopo COMPANY exige empresa_cnpj.`);
    const presentationRaw = ascii(rawText(values.modo_apresentacao || "GROUPED")).toUpperCase();
    const presentationMode = presentationRaw === "DETAILED" ? "DETAILED" : "GROUPED";
    const pkg: SellingTemplatePackage = {
      importCode, name, tier, offerType, fuelType: "FLEX", description: rawText(values.descricao), color: validColor(values.cor_hex, tier),
      installments: Math.min(24, Math.max(1, Math.floor(numberValue(values.parcelas_max)) || (tier === "PREMIUM" ? 4 : tier === "INTERMEDIARIO" ? 3 : 2))),
      presentationMode, displayOrder: Math.max(0, Math.floor(numberValue(values.ordem)) || (tier === "PREMIUM" ? 30 : tier === "INTERMEDIARIO" ? 20 : 10)),
      active: boolValue(values.ativo, true), published: boolValue(values.publicado, false), scope, groupName, companyDocument,
      notes: rawText(values.observacoes), applications: [], items: [],
    };
    packages.push(pkg); packageByCode.set(importCode, pkg);
  });

  const applicationRows = tableRows(applicationSheet, "pacote_codigo");
  applicationRows.forEach(({ row, values }) => {
    const packageCode = codeKey(values.pacote_codigo);
    const pkg = packageByCode.get(packageCode);
    const modelRaw = rawText(values.modelo_chave);
    const modelKey = modelRaw === "*" ? "*" : slug(modelRaw || values.modelo_nome);
    const revisionKm = Math.max(0, Math.floor(numberValue(values.revisao_km)));
    if (!packageCode) issue(issues, "ERROR", "APLICACOES", row, "pacote_codigo é obrigatório.");
    else if (!pkg) issue(issues, "ERROR", "APLICACOES", row, `pacote_codigo ${packageCode} não existe na aba PACOTES.`);
    if (!modelKey) issue(issues, "ERROR", "APLICACOES", row, "modelo_chave é obrigatório; use * para todos os modelos.");
    if (numberValue(values.revisao_km) < 0) issue(issues, "ERROR", "APLICACOES", row, "revisao_km deve ser 0 (todas) ou uma quilometragem positiva.");
    if (!pkg || !modelKey || numberValue(values.revisao_km) < 0) return;
    pkg.applications.push({ packageCode, modelKey, modelName: rawText(values.modelo_nome), revisionKm, row });
  });

  const packageItemRows = tableRows(packageItemsSheet, "pacote_codigo");
  packageItemRows.forEach(({ row, values }) => {
    const packageCode = codeKey(values.pacote_codigo);
    const pkg = packageByCode.get(packageCode);
    const rawType = ascii(rawText(values.tipo_item)).toUpperCase();
    const allowed = ["PART", "SERVICE", "LABOR", "CHEMICAL"];
    const description = rawText(values.descricao);
    const quantity = roundQty(numberValue(values.quantidade));
    const unitPrice = roundMoney(numberValue(values.valor_unitario));
    if (!packageCode) issue(issues, "ERROR", "ITENS_PACOTE", row, "pacote_codigo é obrigatório.");
    else if (!pkg) issue(issues, "ERROR", "ITENS_PACOTE", row, `pacote_codigo ${packageCode} não existe na aba PACOTES.`);
    if (!allowed.includes(rawType)) issue(issues, "ERROR", "ITENS_PACOTE", row, "tipo_item deve ser SERVICE, LABOR, PART ou CHEMICAL.");
    if (!description) issue(issues, "ERROR", "ITENS_PACOTE", row, "descricao é obrigatória.");
    if (!(quantity > 0)) issue(issues, "ERROR", "ITENS_PACOTE", row, "quantidade deve ser maior que zero.");
    if (unitPrice < 0) issue(issues, "ERROR", "ITENS_PACOTE", row, "valor_unitario não pode ser negativo.");
    if (!pkg || !allowed.includes(rawType) || !description || !(quantity > 0) || unitPrice < 0) return;
    const categoryName = rawText(values.categoria);
    const visualName = rawText(values.nome_visual) || description;
    const bundleKey = codeKey(values.vinculo_grupo);
    const isTire = boolValue(values.pneu, false);
    pkg.items.push({
      order: Math.max(0, Math.floor(numberValue(values.ordem)) || row), itemType: rawType === "CHEMICAL" ? "PART" : rawType as "PART" | "SERVICE" | "LABOR",
      itemClass: rawType, code: rawText(values.codigo), description, quantity, unitPrice, lineTotal: roundMoney(quantity * unitPrice),
      laborHours: rawType === "LABOR" ? roundQty(numberValue(values.horas_mo) || quantity) : roundQty(numberValue(values.horas_mo)),
      categoryKey: categoryName ? slug(categoryName) : "", categoryName, visualName,
      showIndividual: boolValue(values.exibir_item, true), showPrice: boolValue(values.exibir_valor, false),
      infoTitle: rawText(values.info_titulo) || visualName, infoText: rawText(values.info_texto), infoMediaUrl: rawText(values.midia_url),
      isCourtesy: boolValue(values.permitir_cortesia, false), courtesyLabel: rawText(values.cortesia_label) || "Cortesia", courtesyNote: rawText(values.cortesia_observacao),
      bundleKey, bundleName: bundleKey ? (categoryName || visualName) : "", isTire,
      maxInstallments: isTire ? Math.min(24, Math.max(1, Math.floor(numberValue(values.parcelas_max_pneu)) || 4)) : null,
      notes: rawText(values.observacoes),
    });
  });

  packages.forEach((pkg) => {
    pkg.applications.sort((a, b) => a.row - b.row); pkg.items.sort((a, b) => a.order - b.order);
    if (!pkg.applications.length) issue(issues, "ERROR", "APLICACOES", undefined, `${pkg.importCode}: cadastre ao menos uma aplicação.`);
    if (!pkg.items.length) issue(issues, "WARNING", "ITENS_PACOTE", undefined, `${pkg.importCode}: pacote sem itens adicionais.`);
    const wildcardModel = pkg.applications.some((app) => app.modelKey === "*");
    const wildcardRevision = pkg.applications.some((app) => app.revisionKm === 0);
    if (wildcardModel && pkg.applications.some((app) => app.modelKey !== "*")) issue(issues, "WARNING", "APLICACOES", undefined, `${pkg.importCode}: * já cobre todos os modelos; aplicações específicas serão ignoradas na expansão.`);
    if (wildcardRevision && pkg.applications.some((app) => app.revisionKm > 0)) issue(issues, "WARNING", "APLICACOES", undefined, `${pkg.importCode}: revisão 0 já cobre todas as revisões dos modelos selecionados.`);
    if (!wildcardModel && !wildcardRevision && pkg.offerType === "REVISION") {
      const models = new Set(pkg.applications.map((app) => app.modelKey));
      const kms = new Set(pkg.applications.map((app) => app.revisionKm).filter((km) => km > 0));
      const pairs = new Set(pkg.applications.filter((app) => app.revisionKm > 0).map((app) => `${app.modelKey}:${app.revisionKm}`));
      if (models.size > 1 && kms.size > 1 && pairs.size !== models.size * kms.size) {
        issue(issues, "ERROR", "APLICACOES", undefined, `${pkg.importCode}: as aplicações específicas não formam uma matriz completa modelo × revisão. Separe padrões diferentes em códigos de pacote distintos para evitar combinações não desejadas.`);
      }
    }
  });

  if (!revisions.length && !packages.length) throw new Error("Nenhuma revisão ou pacote preenchido foi encontrado nas abas padrão.");
  return { fileName, revisions, packages, issues };
}
