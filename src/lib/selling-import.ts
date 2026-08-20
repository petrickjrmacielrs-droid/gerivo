import "server-only";
import { readXlsx, type XlsxCell } from "./xlsx-lite";

export type SellingFuelType = "FLEX" | "DIESEL" | "ELECTRIC" | "OTHER";
export type ImportedRevisionItem = {
  itemType: "PART" | "LABOR";
  code: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  laborHours: number;
  displayOrder: number;
  sourceSheet: string;
};
export type ImportedRevision = {
  sourceKey: string;
  modelKey: string;
  modelName: string;
  fuelType: SellingFuelType;
  yearLabel: string;
  revisionKm: number;
  basePrice: number;
  laborHours: number;
  laborValue: number;
  sourceSheet: string;
  sourceFile: string;
  items: ImportedRevisionItem[];
};

function text(value: XlsxCell) { return String(value ?? "").trim(); }
function num(value: XlsxCell) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const normalized = text(value).replace(/\s/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
function norm(value: XlsxCell) {
  return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
}
function key(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function roundMoney(value: number) { return Math.round((value + Number.EPSILON) * 100) / 100; }
function roundQty(value: number) { return Math.round((value + Number.EPSILON) * 1000) / 1000; }

function detectFuel(model: string, itemRows: XlsxCell[][]): SellingFuelType {
  const modelText = model.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  if (modelText.includes("FRONTIER")) return "DIESEL";
  if (modelText.includes("LEAF")) return "ELECTRIC";
  const itemText = itemRows.flat().map(text).join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  if (itemText.includes("OLEO DIESEL") || /\bDIESEL\b/.test(itemText)) return "DIESEL";
  if (itemText.includes("ELETRIC")) return "ELECTRIC";
  // Família comercial da beta: demais aplicações de passeio entram como FLEX.
  // A separação nunca usa textos de rodapé/resumos, evitando contaminação entre blocos.
  return "FLEX";
}

function modelDescriptor(rows: XlsxCell[][], headerIndex: number, descriptionCol: number) {
  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = text(rows[headerIndex - offset]?.[descriptionCol]);
    const normalized = norm(candidate);
    if (!candidate) continue;
    if (normalized.includes("ANO/MODELO") || normalized.includes("TODOS ANOS/MODELO")) return candidate;
  }
  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = text(rows[headerIndex - offset]?.[descriptionCol]);
    if (candidate && !["COM PROTECT", "SEM PROTECT"].includes(norm(candidate))) return candidate;
  }
  return `Modelo ${headerIndex + 1}`;
}

function splitModelDescriptor(value: string) {
  const match = value.match(/^(.*?)(?:\s+Ano\/Modelo\s+|\s+Todos\s+Anos\/Modelo)/i);
  const modelName = (match?.[1] || value).replace(/\s+-\s*$/, "").replace(/\s+Até$/i, "").trim();
  const yearMatch = value.match(/(?:Ano\/Modelo\s+|Todos\s+Anos\/Modelo\s*)(.*)$/i);
  return { modelName, yearLabel: yearMatch?.[1]?.trim() || "" };
}

function headerIndexes(row: XlsxCell[]) {
  const result = { qty: -1, pn: -1, desc: -1, unitPrice: -1, revisionCols: [] as Array<{ index: number; km: number }> };
  row.forEach((value, index) => {
    const normalized = norm(value);
    if (normalized === "QUANT" || normalized === "QTDE" || normalized === "QUANTIDADE") result.qty = index;
    if (normalized === "PN" || normalized.includes("PART NUMBER")) result.pn = index;
    if (normalized.includes("DESCRICAO")) result.desc = index;
    if (normalized.includes("SRP UNITARIO") || normalized === "PRECO UNITARIO") result.unitPrice = index;
    const numeric = num(value);
    if (numeric >= 10000 && numeric <= 300000 && numeric % 1000 === 0) result.revisionCols.push({ index, km: Math.round(numeric) });
  });
  return result;
}

function extractSheet(sheetName: string, rows: XlsxCell[][], sourceFile: string): ImportedRevision[] {
  const revisions: ImportedRevision[] = [];
  const headers = rows.map((row, index) => ({ row, index, meta: headerIndexes(row) }))
    .filter((entry) => entry.meta.qty >= 0 && entry.meta.pn >= 0 && entry.meta.desc >= 0 && entry.meta.revisionCols.length >= 2);

  headers.forEach((entry, blockIndex) => {
    const start = entry.index;
    const end = headers[blockIndex + 1]?.index ?? rows.length;
    const meta = entry.meta;
    const descriptor = modelDescriptor(rows, start, meta.desc);
    const { modelName, yearLabel } = splitModelDescriptor(descriptor);
    const modelKey = key(modelName);
    if (!modelKey) return;
    const itemRowsForFuel: XlsxCell[][] = [];
    for (let fuelRow = start + 1; fuelRow < end; fuelRow += 1) {
      const candidate = rows[fuelRow] || [];
      if (norm(candidate[meta.desc]) === "MAO DE OBRA") break;
      itemRowsForFuel.push([candidate[meta.pn], candidate[meta.desc]]);
    }
    const fuelType = detectFuel(descriptor, itemRowsForFuel);

    const mandatoryByKm = new Map<number, ImportedRevisionItem[]>();
    const laborValueByKm = new Map<number, number>();
    const laborHoursByKm = new Map<number, number>();
    const basePriceByKm = new Map<number, number>();
    const calculatedPriceByKm = new Map<number, number>();
    meta.revisionCols.forEach(({ km }) => mandatoryByKm.set(km, []));

    let itemOrder = 0;
    for (let rowIndex = start + 1; rowIndex < end; rowIndex += 1) {
      const row = rows[rowIndex] || [];
      const description = text(row[meta.desc]);
      const descriptionNorm = norm(description);
      if (!description) continue;

      if (descriptionNorm === "MAO DE OBRA") {
        meta.revisionCols.forEach(({ index, km }) => laborValueByKm.set(km, roundMoney(num(row[index]))));
        continue;
      }
      if (descriptionNorm === "TMO") {
        meta.revisionCols.forEach(({ index, km }) => laborHoursByKm.set(km, roundQty(num(row[index]))));
        continue;
      }
      if (descriptionNorm.includes("VALOR DIVULGADO DAS REVISOES")) {
        meta.revisionCols.forEach(({ index, km }) => basePriceByKm.set(km, roundMoney(num(row[index]))));
        continue;
      }
      if (descriptionNorm.includes("VALOR REVISOES (CALCULADO)")) {
        meta.revisionCols.forEach(({ index, km }) => calculatedPriceByKm.set(km, roundMoney(num(row[index]))));
        continue;
      }
      if (["PREMIO VAREJO", "MAO DE OBRA COM PROTECT", "% REEMBOLSO PROTECT"].includes(descriptionNorm) || descriptionNorm.includes("REEMBOLSO") || descriptionNorm.includes("SUBSIDIO") || descriptionNorm.includes("PRECO CONCORRENTE")) continue;

      const quantity = roundQty(num(row[meta.qty]));
      const code = text(row[meta.pn]);
      if (!(quantity > 0) || !code) continue;
      let unitPrice = meta.unitPrice >= 0 ? num(row[meta.unitPrice]) : 0;
      if (!(unitPrice > 0)) {
        // Fallback para tabelas antigas: busca um valor monetário entre PN/descrição e as colunas de revisão.
        const firstRevision = Math.min(...meta.revisionCols.map((item) => item.index));
        for (let col = meta.desc + 1; col < firstRevision; col += 1) {
          const candidate = num(row[col]);
          if (candidate > 0) unitPrice = candidate;
        }
      }
      unitPrice = roundMoney(unitPrice);
      if (!(unitPrice >= 0)) continue;

      meta.revisionCols.forEach(({ index, km }) => {
        const marker = norm(row[index]);
        if (marker !== "X") return;
        itemOrder += 1;
        mandatoryByKm.get(km)?.push({
          itemType: "PART",
          code,
          description,
          quantity,
          unitPrice,
          totalPrice: roundMoney(quantity * unitPrice),
          laborHours: 0,
          displayOrder: itemOrder,
          sourceSheet: sheetName,
        });
      });
    }

    meta.revisionCols.forEach(({ km }) => {
      const partItems = mandatoryByKm.get(km) || [];
      const laborHours = laborHoursByKm.get(km) || 0;
      const laborValue = laborValueByKm.get(km) || 0;
      const basePrice = basePriceByKm.get(km) || calculatedPriceByKm.get(km) || roundMoney(partItems.reduce((sum, item) => sum + item.totalPrice, 0) + laborValue);
      if (!partItems.length && laborValue <= 0 && basePrice <= 0) return;
      const items = [...partItems];
      if (laborValue > 0 || laborHours > 0) {
        items.push({
          itemType: "LABOR",
          code: "MO-REVISAO",
          description: "Mão de obra da revisão",
          quantity: laborHours > 0 ? laborHours : 1,
          unitPrice: laborHours > 0 ? roundMoney(laborValue / laborHours) : laborValue,
          totalPrice: laborValue,
          laborHours,
          displayOrder: 900,
          sourceSheet: sheetName,
        });
      }
      revisions.push({
        sourceKey: `${key(sheetName)}:${modelKey}:${km}`,
        modelKey,
        modelName,
        fuelType,
        yearLabel,
        revisionKm: km,
        basePrice: roundMoney(basePrice),
        laborHours,
        laborValue,
        sourceSheet: sheetName,
        sourceFile,
        items,
      });
    });
  });
  return revisions;
}

export function parseSellingWorkbook(buffer: Buffer, fileName: string) {
  const workbook = readXlsx(buffer);
  const selected = workbook.filter((sheet) => ["MODELOS ATUAIS", "MODELOS ANTIGOS"].includes(norm(sheet.name)));
  if (!selected.length) throw new Error("A planilha não possui as abas 'Modelos Atuais' ou 'Modelos Antigos'.");
  const revisions = selected.flatMap((sheet) => extractSheet(sheet.name, sheet.rows, fileName));
  const dedup = new Map<string, ImportedRevision>();
  revisions.forEach((revision) => dedup.set(revision.sourceKey, revision));
  const result = Array.from(dedup.values()).sort((a, b) => a.modelName.localeCompare(b.modelName) || a.revisionKm - b.revisionKm);
  if (!result.length) throw new Error("Nenhuma revisão válida foi encontrada na estrutura da planilha.");
  return result;
}
