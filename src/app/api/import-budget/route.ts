import { NextResponse } from "next/server";
import { inflateSync } from "node:zlib";
import { getSupabaseAdminClient } from "../../../lib/supabase-admin";
import { getEffectiveSubscription } from "../../../lib/effective-subscription";
import { apiErrorMessage } from "../../../lib/api-error";

export const runtime = "nodejs";
export const maxDuration = 60;

type ImportedItem = {
  kind: "SERVICO" | "PECA";
  code: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  total: number;
  confidence: number;
  note: string;
};

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

function safeText(value: unknown, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength);
}

function extractResponseText(payload: any) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();
  if (!Array.isArray(payload?.output)) return "";
  return payload.output
    .flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
    .filter((part: any) => part?.type === "output_text" && typeof part?.text === "string")
    .map((part: any) => part.text)
    .join("\n")
    .trim();
}

function parseJsonPayload(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(cleaned); } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("A leitura retornou um formato inválido. Tente uma imagem mais nítida.");
  }
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  let raw = String(value || "").trim().replace(/R\$\s?/gi, "").replace(/%/g, "").replace(/\s/g, "");
  if (!raw) return 0;

  // Mobato/NBS podem exportar números em pt-BR (1.039,00) ou no padrão
  // utilizado pelo NBS deste cliente (1,039.00). O separador decimal é o
  // último separador quando vírgula e ponto aparecem juntos.
  const comma = raw.lastIndexOf(",");
  const dot = raw.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    if (dot > comma) raw = raw.replace(/,/g, "");
    else raw = raw.replace(/\./g, "").replace(",", ".");
  } else if (comma >= 0) {
    const decimals = raw.length - comma - 1;
    raw = decimals === 3 && /^-?\d{1,3}(?:,\d{3})+$/.test(raw) ? raw.replace(/,/g, "") : raw.replace(",", ".");
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function decodeDataUrl(fileData: string) {
  const comma = fileData.indexOf(",");
  const base64 = comma >= 0 ? fileData.slice(comma + 1) : fileData;
  return Buffer.from(base64, "base64");
}

function compactLine(value: string) {
  return value.replace(/[\u00a0\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

function looksStruckOrCancelled(line: string) {
  const normalized = line.toUpperCase();
  return /-{5,}|_{5,}|═{3,}|─{3,}|TACHAD[OA]|RISCAD[OA]|N[ÃA]O AUTORIZAD[OA]|CANCELAD[OA]/.test(normalized)
    || /^[-–—].+[-–—]$/.test(line.trim());
}

function isHeaderOrSummary(line: string) {
  const value = line.toUpperCase();
  return [
    "SUB TOTAL", "SUBTOTAL", "VALOR TOTAL", "TOTAL ESTIMADO", "DESCONTOS", "IMPOSTOS",
    "CLIENTE", "VEÍCULO", "VEICULO", "PLACA", "CHASSI", "TELEFONE", "EMPRESA", "ORÇAMENTO:",
    "ORCAMENTO:", "OBS:", "OBSERVAÇÃO", "OBSERVACAO", "DIAGNÓSTICO", "DIAGNOSTICO",
    "CÓDIGO DESCRIÇÃO", "CODIGO DESCRICAO", "QTD/TEMPO", "VAL. UNIT", "VALOR FINAL",
  ].some((token) => value.includes(token));
}

function detectSourceFromText(text: string, requestedSource: string) {
  if (requestedSource === "MOBATO" || requestedSource === "NBS") return requestedSource;
  const upper = text.toUpperCase();

  // NBS real: a identificação é feita pela estrutura do documento, e NÃO pela
  // palavra "MOBATO". Alguns relatórios NBS trazem "Observação MOBATO" no
  // rodapé, embora o documento seja do NBS.
  const nbsServiceTable = /IT\s+SERVI[CÇ]O[\s\S]{0,120}DESCRI[CÇ][ÃA]O\s+DO\s+SERVI[CÇ]O[\s\S]{0,80}VALOR\s+FINAL/.test(upper);
  const nbsPartTable = /OR[CÇ]AMENTO\s+ITEM[\s\S]{0,120}DESCRI[CÇ][ÃA]O\s+DO\s+ITEM[\s\S]{0,120}PRE[CÇ]O\s+UNIT[ÁA]RIO[\s\S]{0,60}VALOR\s+FINAL/.test(upper);
  const nbsAdministrative = /N[ºO]\s*CONTR\.\/PACOTE\s+TMAC|N\.\s*PR[ÉE]\s*O\.S\.|TIPO\s+F[ÁA]B\.:/.test(upper);
  if ((nbsServiceTable && nbsPartTable) || (nbsAdministrative && (nbsServiceTable || nbsPartTable))) return "NBS";

  // Mobato/Jasper utilizado pela IESA: uma única tabela com Qtde/Tempo,
  // Valor Unitário, desconto e total. "MOBATO" isolado não é prova de origem.
  const mobatoTable = /OR[CÇ]AMENTO\s+INICIAL/.test(upper)
    && /QTDE\s*\/\s*TEMPO/.test(upper)
    && /VAL\.?\s*UNIT\.?|VALOR\s+UNIT[ÁA]RIO/.test(upper);
  if (mobatoTable) return "MOBATO";

  if (/\bNBS\b/.test(upper) || upper.includes("RECOMENDADOS NBS")) return "NBS";
  return "DESCONHECIDO";
}


type PdfTable = string[][];


type HighlightRect = { x1: number; y1: number; x2: number; y2: number };
type HighlightFragment = { page: number; x: number; y: number; text: string };

function numericWholeCell(value: string) {
  return /^-?(?:R\$\s*)?\d+(?:\.\d{3})*(?:[.,]\d+)?$/.test(value.trim());
}

function annotationRects(annotation: any): HighlightRect[] {
  const rects: HighlightRect[] = [];
  const addRect = (x1: number, y1: number, x2: number, y2: number) => {
    const values = [x1, y1, x2, y2];
    if (!values.every(Number.isFinite)) return;
    rects.push({ x1: Math.min(x1, x2), y1: Math.min(y1, y2), x2: Math.max(x1, x2), y2: Math.max(y1, y2) });
  };
  const quads = annotation?.quadPoints;
  if (quads && !Array.isArray(quads) && typeof quads.length === "number" && quads.length >= 8) {
    const flat = Array.from(quads as ArrayLike<number>).map(Number);
    for (let index = 0; index + 7 < flat.length; index += 8) {
      const xs = [flat[index], flat[index + 2], flat[index + 4], flat[index + 6]];
      const ys = [flat[index + 1], flat[index + 3], flat[index + 5], flat[index + 7]];
      if (xs.every(Number.isFinite) && ys.every(Number.isFinite)) addRect(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));
    }
  }
  if (Array.isArray(quads)) {
    for (const quad of quads) {
      if (Array.isArray(quad) && quad.length >= 4 && typeof quad[0] === "object") {
        const xs = quad.map((point: any) => Number(point?.x)).filter(Number.isFinite);
        const ys = quad.map((point: any) => Number(point?.y)).filter(Number.isFinite);
        if (xs.length && ys.length) addRect(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));
      } else if (Array.isArray(quad) && quad.length >= 8) {
        const xs = [Number(quad[0]), Number(quad[2]), Number(quad[4]), Number(quad[6])];
        const ys = [Number(quad[1]), Number(quad[3]), Number(quad[5]), Number(quad[7])];
        if (xs.every(Number.isFinite) && ys.every(Number.isFinite)) addRect(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));
      }
    }
  }
  if (!rects.length && Array.isArray(annotation?.rect) && annotation.rect.length >= 4) {
    addRect(Number(annotation.rect[0]), Number(annotation.rect[1]), Number(annotation.rect[2]), Number(annotation.rect[3]));
  }
  return rects;
}

function isYellowHighlight(annotation: any) {
  if (String(annotation?.subtype || "").toLowerCase() !== "highlight" && Number(annotation?.annotationType) !== 9) return false;
  const color = annotation?.color;
  if (!color || typeof color.length !== "number" || color.length < 3) return true;
  const raw = [Number(color[0]), Number(color[1]), Number(color[2])];
  const scale = Math.max(...raw) <= 1 ? 255 : 1;
  const [r, g, b] = raw.map((value) => value * scale);
  return r >= 180 && g >= 150 && b <= 130;
}

function intersects(a: HighlightRect, b: HighlightRect, tolerance = 1.5) {
  return a.x1 <= b.x2 + tolerance && a.x2 + tolerance >= b.x1 && a.y1 <= b.y2 + tolerance && a.y2 + tolerance >= b.y1;
}

function yellowPixelRatio(data: Uint8ClampedArray, imageWidth: number, imageHeight: number, x1: number, y1: number, x2: number, y2: number) {
  const left = Math.max(0, Math.floor(Math.min(x1, x2)));
  const right = Math.min(imageWidth - 1, Math.ceil(Math.max(x1, x2)));
  const top = Math.max(0, Math.floor(Math.min(y1, y2)));
  const bottom = Math.min(imageHeight - 1, Math.ceil(Math.max(y1, y2)));
  if (right <= left || bottom <= top) return 0;
  let yellow = 0;
  let sampled = 0;
  for (let y = top; y <= bottom; y += 2) {
    for (let x = left; x <= right; x += 2) {
      const offset = (y * imageWidth + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      sampled += 1;
      if (r >= 190 && g >= 165 && b <= 155 && r >= g - 20) yellow += 1;
    }
  }
  return sampled ? yellow / sampled : 0;
}

function parseHighlightedFragments(fragments: HighlightFragment[], source: string) {
  const groups: HighlightFragment[][] = [];
  const sorted = [...fragments].sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);
  for (const fragment of sorted) {
    const current = groups[groups.length - 1];
    if (!current || current[0].page !== fragment.page || Math.abs(current[0].y - fragment.y) > 4.2) groups.push([fragment]);
    else current.push(fragment);
  }

  const items: ImportedItem[] = [];
  for (const group of groups) {
    const rawParts = group.sort((a, b) => a.x - b.x).map((item) => compactLine(item.text)).filter(Boolean);
    const parts = rawParts.flatMap((part) => {
      const tokens = part.split(/\s+/).filter(Boolean);
      return tokens.length > 1 && tokens.every(numericWholeCell) ? tokens : [part];
    });
    const numeric = parts.filter(numericWholeCell);
    const words = parts.filter((part) => !numericWholeCell(part));
    if (numeric.length < 2 || !words.length) continue;
    const name = compactLine(words.join(" "));
    if (!name || isHeaderOrSummary(name)) continue;
    const quantity = normalizeNumber(numeric[0]);
    const highlightedValue = normalizeNumber(numeric[1]);
    if (!(quantity > 0) || highlightedValue < 0) continue;
    const kind = inferItemKind("", name, null);
    let unitPrice = highlightedValue;
    let total = quantity * unitPrice;
    if (source === "MOBATO" && kind === "SERVICO") {
      total = highlightedValue;
      unitPrice = quantity > 0 ? total / quantity : 0;
    }
    addUniqueItem(items, createLocalItem(kind, "", name, quantity, unitPrice, total, 0.99, "Item grifado no PDF. Revise descrição, quantidade e valor antes de adicionar."));
  }
  return items;
}

async function extractHighlightedPdfItems(fileData: string, requestedSource: string) {
  const bytes = new Uint8Array(decodeDataUrl(fileData));
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({ data: bytes, useSystemFonts: true });
  const document = await loadingTask.promise;
  const fragments: HighlightFragment[] = [];
  let fullText = "";
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const [annotations, textContent] = await Promise.all([page.getAnnotations({ intent: "display" }), page.getTextContent()]);
      const highlights = (Array.isArray(annotations) ? annotations : []).filter(isYellowHighlight).flatMap(annotationRects);
      const textItems = Array.isArray(textContent?.items) ? textContent.items : [];
      fullText += "\n" + textItems.map((item: any) => typeof item?.str === "string" ? item.str : "").join(" " );

      const pageFragments: HighlightFragment[] = [];
      for (const item of textItems) {
        if (!item || typeof item.str !== "string" || !item.str.trim() || !Array.isArray(item.transform)) continue;
        const x = Number(item.transform[4]);
        const y = Number(item.transform[5]);
        const height = Math.max(5, Math.abs(Number(item.height) || Number(item.transform[3]) || 0));
        const width = Math.max(1, Math.abs(Number(item.width) || 0));
        const box: HighlightRect = { x1: x, y1: y - height * 0.35, x2: x + width, y2: y + height * 0.95 };
        if (highlights.some((highlight) => intersects(highlight, box))) pageFragments.push({ page: pageNumber, x, y, text: item.str });
      }

      // Alguns PDFs do Mobato/NBS gravam o marca-texto amarelo diretamente no desenho da página,
      // sem criar uma anotação PDF. Neste caso renderizamos a página e cruzamos os pixels amarelos
      // com as coordenadas da camada de texto, mantendo a leitura local e sem IA.
      if (!pageFragments.length) {
        try {
          const canvasModule: any = await import("@napi-rs/canvas");
          const scale = 1.6;
          const viewport = page.getViewport({ scale });
          const canvas = canvasModule.createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
          const context2d = canvas.getContext("2d");
          const renderTask = page.render({ canvas, canvasContext: context2d, viewport });
          await renderTask.promise;
          const image = context2d.getImageData(0, 0, canvas.width, canvas.height);
          for (const item of textItems) {
            if (!item || typeof item.str !== "string" || !item.str.trim() || !Array.isArray(item.transform)) continue;
            const transformed = pdfjs.Util.transform(viewport.transform, item.transform);
            const screenX = Number(transformed[4]);
            const baselineY = Number(transformed[5]);
            const screenHeight = Math.max(7, Math.hypot(Number(transformed[2]) || 0, Number(transformed[3]) || 0));
            const screenWidth = Math.max(3, Math.abs(Number(item.width) || 0) * scale);
            const ratio = yellowPixelRatio(image.data, canvas.width, canvas.height, screenX - 2, baselineY - screenHeight * 1.15, screenX + screenWidth + 2, baselineY + screenHeight * 0.28);
            if (ratio >= 0.055) pageFragments.push({ page: pageNumber, x: Number(item.transform[4]), y: Number(item.transform[5]), text: item.str });
          }
        } catch (renderError) {
          console.error("Gerivo rendered highlight detection:", renderError);
        }
      }

      fragments.push(...pageFragments);
    }
  } finally {
    await loadingTask.destroy().catch(() => undefined);
  }
  const source = detectSourceFromText(fullText, requestedSource);
  return { source, items: parseHighlightedFragments(fragments, source), highlightedFragments: fragments.length };
}

function isNumericCell(value: string) {
  return /^-?(?:R\$\s*)?\d+(?:\.\d{3})*(?:,\d+)?$/.test(value.trim())
    || /^-?\d+(?:\.\d+)?$/.test(value.trim());
}

function looksLikeCode(value: string) {
  const clean = value.trim().toUpperCase();
  if (!clean || clean.length < 2 || clean.length > 50 || /\s/.test(clean)) return false;
  if (!/^[A-Z0-9./_-]+$/.test(clean)) return false;
  // Mobato/NBS usam tanto códigos alfanuméricos quanto códigos totalmente numéricos.
  // Índices simples de linha (1, 2, 3...) ficam de fora pelo tamanho.
  return /[A-Z]/.test(clean) || /^\d{3,}$/.test(clean);
}

function inferItemKind(code: string, name: string, forced: "SERVICO" | "PECA" | null) {
  if (forced) return forced;
  const normalizedCode = code.toUpperCase();
  const normalizedName = name.toUpperCase();
  if (/^(REV|PCT|MO|SERV|99LAV|LAVCAR)/.test(normalizedCode)) return "SERVICO";
  if (/\b(REVIS[ÃA]O|HIGIENIZA[CÇ][ÃA]O|LAVAGEM|M[ÃA]O DE OBRA|SERVI[CÇ]O|SUBST(?:ITUI[CÇ][ÃA]O)?|SUBS\.?|TROCA|ALINHAMENTO|BALANCEAMENTO|MONTAGEM|DESMONTAGEM|REPARO|DIAGN[ÓO]STICO|REGULAGEM|LIMPEZA|INSTALA[CÇ][ÃA]O|VERIFICA[CÇ][ÃA]O)\b/.test(normalizedName)) return "SERVICO";
  return "PECA";
}

function createLocalItem(kind: "SERVICO" | "PECA", code: string, name: string, quantityValue: unknown, unitPriceValue: unknown, totalValue: unknown, confidence: number, note: string): ImportedItem | null {
  const quantity = Math.max(0, normalizeNumber(quantityValue));
  let unitPrice = Math.max(0, normalizeNumber(unitPriceValue));
  let total = Math.max(0, normalizeNumber(totalValue));
  if (!quantity || !name.trim() || isHeaderOrSummary(name)) return null;
  if (!unitPrice && total > 0) unitPrice = total / quantity;
  if (!total && unitPrice > 0) total = unitPrice * quantity;
  return {
    kind,
    code: safeText(code, 80),
    name: safeText(name, 240),
    category: kind === "SERVICO" ? "Mão de obra" : "Peças",
    quantity: Number(quantity.toFixed(2)),
    unitPrice: Number(unitPrice.toFixed(2)),
    total: Number(total.toFixed(2)),
    confidence,
    note,
  };
}

function addUniqueItem(items: ImportedItem[], candidate: ImportedItem | null) {
  if (!candidate) return;
  const key = `${candidate.kind}|${candidate.code}|${candidate.name}|${candidate.quantity}|${candidate.total}`.toUpperCase();
  const duplicate = items.some((item) => `${item.kind}|${item.code}|${item.name}|${item.quantity}|${item.total}`.toUpperCase() === key);
  if (!duplicate) items.push(candidate);
}

function flexibleBudgetLine(line: string, section: "SERVICO" | "PECA" | null, source: string) {
  const prepared = compactLine(line.replace(/R\$\s+/gi, "R$"));
  if (!prepared || isHeaderOrSummary(prepared) || looksStruckOrCancelled(prepared)) return null;
  const tokens = prepared.split(/\s+/).filter(Boolean);
  if (tokens.length < 4) return null;

  const numberToken = (value: string) => /^(?:R\$)?-?\d+(?:\.\d{3})*(?:[.,]\d+)?%?$/.test(value);
  const numericTail: string[] = [];
  while (tokens.length && numberToken(tokens[tokens.length - 1])) numericTail.unshift((tokens.pop() || "").replace(/%$/, ""));
  if (numericTail.length < 2 || tokens.length < 1) return null;

  // Remove número sequencial do item apenas quando há outro candidato claro a código/descrição.
  if (/^\d{1,2}$/.test(tokens[0]) && tokens.length >= 2) tokens.shift();

  let code = "";
  if (tokens.length >= 2 && looksLikeCode(tokens[0])) code = tokens.shift() || "";
  const unitIndex = tokens.findIndex((token) => /^(UN|UND|PC|PÇ|PCA|DL|LT|L|H|HR|HS|SV|MO|M[0-9A-Z]?|D[0-9A-Z]?|Z[0-9A-Z]?)$/i.test(token));
  if (unitIndex >= 0 && unitIndex >= tokens.length - 2) tokens.splice(unitIndex, 1);

  const name = compactLine(tokens.join(" "));
  if (!name || name.length < 3 || !/[A-ZÀ-Ú]/i.test(name)) return null;
  if (!section && !code) return null;

  const numbers = numericTail.map(normalizeNumber);
  const quantity = numbers[0];
  const total = numbers[numbers.length - 1];
  let unitPrice = numbers.length >= 3 ? numbers[1] : 0;
  if (!(quantity > 0) || quantity > 100000 || total < 0) return null;
  if (!unitPrice && quantity > 0 && total > 0) unitPrice = total / quantity;
  const kind = inferItemKind(code, name, section);
  return createLocalItem(kind, code, name, quantity, unitPrice, total, section ? 0.79 : 0.68, `Leitura flexível ${source === "DESCONHECIDO" ? "do PDF" : source}. Confirme quantidade e valor na prévia.`);
}

function detectTableKind(rows: string[][]) {
  const header = rows.slice(0, 4).flat().join(" ").toUpperCase();
  if (/DESCRI[CÇ][ÃA]O DO SERVI[CÇ]O|M[ÃA]O DE OBRA/.test(header) || (/\bSERVI[CÇ]O\b/.test(header) && /T\s*P|VALOR FINAL/.test(header))) return "SERVICO" as const;
  if (/OR[CÇ]AMENTO ITEM|DESCRI[CÇ][ÃA]O DO ITEM|DESCRI[CÇ][ÃA]O DA PE[CÇ]A|PRE[CÇ]O UNIT[ÁA]RIO|\bPE[CÇ]AS\b/.test(header)) return "PECA" as const;
  return null;
}

function parseLocalPdfTables(tables: PdfTable[], text: string, requestedSource: string) {
  const source = detectSourceFromText(text, requestedSource);
  const items: ImportedItem[] = [];
  let ignoredCount = 0;

  for (const rawRows of tables) {
    const rows = rawRows
      .map((row) => row.map((cell) => compactLine(String(cell ?? ""))).filter(Boolean))
      .filter((row) => row.length > 0);
    if (!rows.length) continue;
    const tableKind = detectTableKind(rows);

    for (const cells of rows) {
      const joined = cells.join(" ");
      if (looksStruckOrCancelled(joined)) { ignoredCount += 1; continue; }
      if (isHeaderOrSummary(joined)) continue;
      const upper = joined.toUpperCase();
      if (/^(IT|ITEM|C[ÓO]DIGO|SERVI[CÇ]O|OR[CÇ]AMENTO ITEM)\b/.test(upper) && /DESCRI[CÇ][ÃA]O|QTD|TEMPO|VALOR|PRE[CÇ]O/.test(upper)) continue;

      // Mobato serviços: [item, código, descrição, tempo, valor final]
      if (cells.length >= 5 && /^\d{1,3}$/.test(cells[0]) && looksLikeCode(cells[1]) && isNumericCell(cells[cells.length - 2]) && isNumericCell(cells[cells.length - 1])) {
        const code = cells[1];
        const name = cells.slice(2, cells.length - 2).join(" ");
        const quantity = cells[cells.length - 2];
        const total = cells[cells.length - 1];
        addUniqueItem(items, createLocalItem("SERVICO", code, name, quantity, 0, total, 0.92, "Leitura estrutural da tabela do PDF."));
        continue;
      }

      if (!looksLikeCode(cells[0])) continue;
      const code = cells[0];

      // NBS: [código, descrição, qtd/tempo, valor unit., desconto, %, total]
      if (cells.length >= 7 && isNumericCell(cells[cells.length - 5]) && isNumericCell(cells[cells.length - 4]) && isNumericCell(cells[cells.length - 1])) {
        const qtyIndex = cells.length - 5;
        const name = cells.slice(1, qtyIndex).join(" ");
        const kind = inferItemKind(code, name, tableKind);
        addUniqueItem(items, createLocalItem(kind, code, name, cells[qtyIndex], cells[qtyIndex + 1], cells[cells.length - 1], 0.93, "Leitura estrutural da tabela do PDF."));
        continue;
      }

      // Mobato peças: [código, descrição, UN, LD, quantidade, preço unitário, valor final]
      if (cells.length >= 6 && isNumericCell(cells[cells.length - 3]) && isNumericCell(cells[cells.length - 2]) && isNumericCell(cells[cells.length - 1])) {
        const qtyIndex = cells.length - 3;
        const middle = cells.slice(1, qtyIndex);
        const unitMarkerIndex = middle.findIndex((cell) => /^(UN|PC|DL|LT|L|H|HR|SV|M[0-9A-Z]?|D[0-9A-Z]?|Z[0-9A-Z]?)$/i.test(cell));
        const name = (unitMarkerIndex >= 0 ? middle.slice(0, unitMarkerIndex) : middle).join(" ");
        const kind = inferItemKind(code, name, tableKind);
        addUniqueItem(items, createLocalItem(kind, code, name, cells[qtyIndex], cells[qtyIndex + 1], cells[qtyIndex + 2], 0.91, "Leitura estrutural da tabela do PDF."));
        continue;
      }

      // Tabela simples: [código, descrição, qtd/tempo, total]
      if (cells.length >= 4 && isNumericCell(cells[cells.length - 2]) && isNumericCell(cells[cells.length - 1])) {
        const name = cells.slice(1, cells.length - 2).join(" ");
        const kind = inferItemKind(code, name, tableKind);
        addUniqueItem(items, createLocalItem(kind, code, name, cells[cells.length - 2], 0, cells[cells.length - 1], 0.78, "Leitura local da tabela. Confirme os valores na prévia."));
      }
    }
  }

  return { source, ignoredCount, items };
}


function parseNbsRealText(text: string, requestedSource: string) {
  const detected = detectSourceFromText(text, requestedSource);
  if (requestedSource !== "NBS" && detected !== "NBS") {
    return { source: detected, ignoredCount: 0, items: [] as ImportedItem[] };
  }

  const lines = text.split(/\r?\n/).map(compactLine).filter(Boolean);
  const items: ImportedItem[] = [];
  let ignoredCount = 0;
  let section: "SERVICO" | "PECA" | null = null;

  for (const line of lines) {
    const upper = line.toUpperCase();

    if (/^IT\s+SERVI[CÇ]O\b/.test(upper) && /DESCRI[CÇ][ÃA]O\s+DO\s+SERVI[CÇ]O/.test(upper) && /VALOR\s+FINAL/.test(upper)) {
      section = "SERVICO";
      continue;
    }
    if (/^OR[CÇ]AMENTO\s+ITEM\b/.test(upper) && /DESCRI[CÇ][ÃA]O\s+DO\s+ITEM/.test(upper) && /PRE[CÇ]O\s+UNIT[ÁA]RIO/.test(upper)) {
      section = "PECA";
      continue;
    }
    if (/^FECHAMENTO\b|^OBSERVA[CÇ][ÃA]O\b|^DIAGN[ÓO]STICO\b/.test(upper)) {
      section = null;
      continue;
    }
    if (!section) continue;
    if (looksStruckOrCancelled(line)) {
      ignoredCount += 1;
      continue;
    }

    if (section === "SERVICO") {
      // Ex.: 01 MA43A1 SUBS.BALANCA - DOIS LADOS 2,20 987,80
      const match = line.match(/^\d{1,3}\s+([A-Z0-9][A-Z0-9./_-]{1,39})\s+(.+?)\s+(-?\d+(?:[.,]\d+)?)\s+(-?\d+(?:[.,]\d+)?)$/i);
      if (!match) continue;
      const quantity = normalizeNumber(match[3]);
      const total = normalizeNumber(match[4]);
      if (!(quantity > 0) || !(total > 0)) continue;
      addUniqueItem(items, createLocalItem(
        "SERVICO",
        match[1],
        match[2],
        quantity,
        total / quantity,
        total,
        0.999,
        "NBS: linha da tabela de serviços; tempo e valor final lidos diretamente do documento.",
      ));
      continue;
    }

    // NBS peças:
    // BRPNEU0331 PNEU ... UN D3 2 1039,000000 2078,00
    const part = line.match(/^([A-Z0-9][A-Z0-9./_-]{1,39})\s+(.+?)\s+(UN|UND|PC|P[CÇ]A?|PÇ|JG|KIT|LT|L)\s+([A-Z0-9./_-]+)\s+(-?\d+(?:[.,]\d+)?)\s+(-?\d+(?:[.,]\d+)?)\s+(-?\d+(?:[.,]\d+)?)$/i);
    if (!part) continue;
    const quantity = normalizeNumber(part[5]);
    const unitPrice = normalizeNumber(part[6]);
    const total = normalizeNumber(part[7]);
    if (!(quantity > 0) || (!(unitPrice > 0) && !(total > 0))) continue;
    addUniqueItem(items, createLocalItem(
      "PECA",
      part[1],
      part[2],
      quantity,
      unitPrice,
      total,
      0.999,
      "NBS: linha da tabela de itens; quantidade, preço unitário e valor final lidos diretamente do documento.",
    ));
  }

  return { source: "NBS", ignoredCount, items };
}

function parseLocalPdfText(text: string, requestedSource: string) {
  const rawLines = text.split(/\r?\n/).map(compactLine).filter(Boolean);
  const source = detectSourceFromText(text, requestedSource);
  const items: ImportedItem[] = [];
  let ignoredCount = 0;
  let section: "SERVICO" | "PECA" | null = null;
  let pending = "";

  const tryParse = (originalLine: string) => {
    const upper = originalLine.toUpperCase();
    if (looksStruckOrCancelled(originalLine)) { ignoredCount += 1; return true; }
    if (/SERVI[CÇ]O|M[ÃA]O DE OBRA/.test(upper) && /DESCRI[CÇ][ÃA]O|C[ÓO]DIGO|QTD|TEMPO|VALOR/.test(upper)) { section = "SERVICO"; return true; }
    if (/OR[CÇ]AMENTO ITEM|ITENS|PE[CÇ]AS|DESCRI[CÇ][ÃA]O DA PE[CÇ]A/.test(upper) && /C[ÓO]DIGO|PRE[CÇ]O|QTD|ITEM|VALOR/.test(upper)) { section = "PECA"; return true; }
    if (isHeaderOrSummary(originalLine)) return true;

    const indexedService = originalLine.match(/^\d{1,3}\s+([A-Z0-9][A-Z0-9./_-]{1,39})\s+(.+?)\s+(-?\d+(?:[.,]\d+)?)\s+(-?\d+(?:[.,]\d+)?)$/i);
    if (indexedService) {
      addUniqueItem(items, createLocalItem("SERVICO", indexedService[1], indexedService[2], indexedService[3], 0, indexedService[4], 0.82, "Leitura local do PDF. Revise antes de adicionar."));
      return true;
    }

    const nbs = originalLine.match(/^([A-Z0-9][A-Z0-9./_-]{1,39})\s+(.+?)\s+(-?\d+(?:[.,]\d+)?)\s+(-?\d+(?:[.,]\d+)?)\s+(-?\d+(?:[.,]\d+)?)\s+(-?\d+(?:[.,]\d+)?)\s+(-?\d+(?:[.,]\d+)?)$/i);
    if (nbs) {
      const kind = inferItemKind(nbs[1], nbs[2], section);
      addUniqueItem(items, createLocalItem(kind, nbs[1], nbs[2], nbs[3], nbs[4], nbs[7], 0.84, "Leitura local do PDF. Revise antes de adicionar."));
      return true;
    }

    const mobato = originalLine.match(/^([A-Z0-9][A-Z0-9./_-]{1,39})\s+(.+?)\s+(?:UN|PC|DL|LT|L|H|HR|SV|M[0-9A-Z]?|D[0-9A-Z]?|Z[0-9A-Z]?)\s+(?:[A-Z0-9/.-]+\s+)?(-?\d+(?:[.,]\d+)?)\s+(-?\d+(?:[.,]\d+)?)\s+(-?\d+(?:[.,]\d+)?)$/i);
    if (mobato) {
      const kind = inferItemKind(mobato[1], mobato[2], section);
      addUniqueItem(items, createLocalItem(kind, mobato[1], mobato[2], mobato[3], mobato[4], mobato[5], 0.8, "Leitura local do PDF. Revise antes de adicionar."));
      return true;
    }

    const simple = originalLine.match(/^([A-Z0-9][A-Z0-9./_-]{1,39})\s+(.+?)\s+(-?\d+(?:[.,]\d+)?)\s+(-?\d+(?:[.,]\d+)?)\s+(-?\d+(?:[.,]\d+)?)$/i);
    if (simple && (section || /^(REV|PCT|BRPRT)/i.test(simple[1]))) {
      const kind = inferItemKind(simple[1], simple[2], section);
      addUniqueItem(items, createLocalItem(kind, simple[1], simple[2], simple[3], simple[4], simple[5], 0.7, "Leitura local do PDF. Confirme descrição e valores."));
      return true;
    }

    const flexible = flexibleBudgetLine(originalLine, section, source);
    if (flexible) {
      addUniqueItem(items, flexible);
      return true;
    }
    return false;
  };

  for (const line of rawLines) {
    if (tryParse(line)) {
      pending = "";
      continue;
    }
    const combined = pending ? `${pending} ${line}` : line;
    if (tryParse(combined)) {
      pending = "";
      continue;
    }
    pending = combined.length <= 700 ? combined : line;
  }

  return { source, ignoredCount, items };
}



type RawPdfTextFragment = {
  text: string;
  x: number;
  y: number;
  fontKey: string;
  bold: boolean;
};

function decodePdfLiteral(raw: string) {
  const bytes: number[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    const code = raw.charCodeAt(index);
    if (code !== 0x5c) {
      bytes.push(code & 0xff);
      continue;
    }

    index += 1;
    if (index >= raw.length) break;
    const escaped = raw[index];

    if (escaped === "\r") {
      if (raw[index + 1] === "\n") index += 1;
      continue;
    }
    if (escaped === "\n") continue;

    const simple: Record<string, number> = {
      n: 0x0a,
      r: 0x0d,
      t: 0x09,
      b: 0x08,
      f: 0x0c,
      "(": 0x28,
      ")": 0x29,
      "\\": 0x5c,
    };
    if (Object.prototype.hasOwnProperty.call(simple, escaped)) {
      bytes.push(simple[escaped]);
      continue;
    }

    if (/[0-7]/.test(escaped)) {
      let octal = escaped;
      while (octal.length < 3 && index + 1 < raw.length && /[0-7]/.test(raw[index + 1])) {
        index += 1;
        octal += raw[index];
      }
      bytes.push(Number.parseInt(octal, 8) & 0xff);
      continue;
    }

    bytes.push(escaped.charCodeAt(0) & 0xff);
  }

  try {
    return new TextDecoder("windows-1252").decode(Uint8Array.from(bytes));
  } catch {
    return Buffer.from(bytes).toString("latin1");
  }
}

function rawPdfFontMap(pdfBinary: string) {
  const objectFonts = new Map<string, string>();
  const objectPattern = /(\d+)\s+0\s+obj\b([\s\S]*?)endobj/g;
  for (const match of pdfBinary.matchAll(objectPattern)) {
    const objectId = match[1];
    const body = match[2];
    const baseFont = body.match(/\/BaseFont\s*\/([^\s/<>\[\]()]+)/i)?.[1] || "";
    if (baseFont) objectFonts.set(objectId, baseFont);
  }

  const resources = new Map<string, string>();
  const referencePattern = /\/([A-Za-z][A-Za-z0-9_.-]*)\s+(\d+)\s+0\s+R/g;
  for (const match of pdfBinary.matchAll(referencePattern)) {
    const fontName = objectFonts.get(match[2]);
    if (fontName) resources.set(match[1], fontName);
  }
  return resources;
}

function rawPdfFlateStreams(buffer: Buffer) {
  const binary = buffer.toString("latin1");
  const streams: string[] = [];
  const streamPattern = /<<([\s\S]*?)>>\s*stream(?:\r\n|\n|\r)/g;

  for (const match of binary.matchAll(streamPattern)) {
    const dictionary = match[1];
    if (!/\/FlateDecode\b/.test(dictionary)) continue;

    const streamStart = (match.index || 0) + match[0].length;
    const streamEnd = binary.indexOf("endstream", streamStart);
    if (streamEnd < 0) continue;

    let raw = buffer.subarray(streamStart, streamEnd);
    while (raw.length && (raw[raw.length - 1] === 0x0a || raw[raw.length - 1] === 0x0d)) {
      raw = raw.subarray(0, raw.length - 1);
    }

    try {
      const decoded = inflateSync(raw).toString("latin1");
      if (/\bBT\b/.test(decoded) && (/\bTj\b/.test(decoded) || /\bTJ\b/.test(decoded))) streams.push(decoded);
    } catch {
      // Imagens e outros streams podem usar filtros/estruturas diferentes.
    }
  }

  return { binary, streams };
}

function rawPdfTextFragments(buffer: Buffer) {
  const { binary, streams } = rawPdfFlateStreams(buffer);
  const fontMap = rawPdfFontMap(binary);
  const fragments: RawPdfTextFragment[] = [];

  for (const stream of streams) {
    const textBlockPattern = /\bBT\b([\s\S]*?)\bET\b/g;
    for (const blockMatch of stream.matchAll(textBlockPattern)) {
      const block = blockMatch[1];

      const fontMatches = [...block.matchAll(/\/([A-Za-z][A-Za-z0-9_.-]*)\s+[-+]?\d+(?:\.\d+)?\s+Tf\b/g)];
      const fontKey = fontMatches.at(-1)?.[1] || "";
      const fontName = fontMap.get(fontKey) || fontKey;
      const bold = /(BOLD|BLACK|HEAVY|SEMIBOLD|SEMI-BOLD|DEMI)/i.test(fontName);

      const matrixMatches = [...block.matchAll(
        /[-+]?\d+(?:\.\d+)?\s+[-+]?\d+(?:\.\d+)?\s+[-+]?\d+(?:\.\d+)?\s+[-+]?\d+(?:\.\d+)?\s+([-+]?\d+(?:\.\d+)?)\s+([-+]?\d+(?:\.\d+)?)\s+Tm\b/g,
      )];
      // Jasper/NBS costuma posicionar texto com Td, enquanto o Mobato usado
      // anteriormente gravava Tm. Suportar ambos mantém o parser RAW sem pdfjs.
      const tdMatches = [...block.matchAll(/([-+]?\d+(?:\.\d+)?)\s+([-+]?\d+(?:\.\d+)?)\s+Td\b/g)];
      const position = matrixMatches.at(-1) || tdMatches.at(-1);
      if (!position) continue;
      const x = Number(position[1]);
      const y = Number(position[2]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

      const textParts: string[] = [];
      const literalPattern = /\(((?:\\.|[^\\)])*)\)\s*Tj\b/g;
      for (const literal of block.matchAll(literalPattern)) {
        const decoded = compactLine(decodePdfLiteral(literal[1]));
        if (decoded) textParts.push(decoded);
      }

      if (!textParts.length) {
        const arrayMatch = block.match(/\[((?:.|\r|\n)*?)\]\s*TJ\b/);
        if (arrayMatch) {
          for (const literal of arrayMatch[1].matchAll(/\(((?:\\.|[^\\)])*)\)/g)) {
            const decoded = compactLine(decodePdfLiteral(literal[1]));
            if (decoded) textParts.push(decoded);
          }
        }
      }

      const text = compactLine(textParts.join(" "));
      if (!text) continue;
      fragments.push({ text, x, y, fontKey, bold });
    }
  }

  return fragments;
}

function rawPdfPageWidth(buffer: Buffer) {
  const binary = buffer.toString("latin1");
  const match = binary.match(/\/MediaBox\s*\[\s*[-+]?\d+(?:\.\d+)?\s+[-+]?\d+(?:\.\d+)?\s+([-+]?\d+(?:\.\d+)?)\s+([-+]?\d+(?:\.\d+)?)\s*\]/);
  const width = Number(match?.[1]);
  return Number.isFinite(width) && width > 100 ? width : 595;
}


async function extractNbsRawTable(fileData: string, requestedSource: string) {
  if (requestedSource === "MOBATO") {
    return { source: "MOBATO", ignoredCount: 0, items: [] as ImportedItem[] };
  }

  const buffer = decodeDataUrl(fileData);
  const pageWidth = rawPdfPageWidth(buffer);
  const fragments = rawPdfTextFragments(buffer);
  const items: ImportedItem[] = [];
  let ignoredCount = 0;
  let serviceHeaderFound = false;
  let partHeaderFound = false;
  let section: "SERVICO" | "PECA" | null = null;

  const rows: RawPdfTextFragment[][] = [];
  for (const fragment of [...fragments].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const row = rows.find((candidate) => Math.abs(candidate[0].y - fragment.y) <= 2.2);
    if (row) row.push(fragment);
    else rows.push([fragment]);
  }

  for (const row of rows.sort((a, b) => b[0].y - a[0].y)) {
    const ordered = [...row].sort((a, b) => a.x - b.x);
    const joined = compactLine(ordered.map((item) => item.text).join(" "));
    const upper = joined.toUpperCase();

    if (/\bSERVI[CÇ]O\b/.test(upper) && /DESCRI[CÇ][ÃA]O\s+DO\s+SERVI[CÇ]O/.test(upper) && /VALOR\s+FINAL/.test(upper)) {
      section = "SERVICO";
      serviceHeaderFound = true;
      continue;
    }
    if (/OR[CÇ]AMENTO\s+ITEM/.test(upper) && /DESCRI[CÇ][ÃA]O\s+DO\s+ITEM/.test(upper) && /PRE[CÇ]O\s+UNIT[ÁA]RIO/.test(upper) && /VALOR\s+FINAL/.test(upper)) {
      section = "PECA";
      partHeaderFound = true;
      continue;
    }
    if (/^FECHAMENTO\b|^OBSERVA[CÇ][ÃA]O\b|^DIAGN[ÓO]STICO\b/.test(upper)) {
      section = null;
      continue;
    }
    if (!section) continue;
    if (looksStruckOrCancelled(joined)) {
      ignoredCount += 1;
      continue;
    }

    const inRange = (minRatio: number, maxRatio: number) => compactLine(
      ordered.filter((item) => item.x >= pageWidth * minRatio && item.x < pageWidth * maxRatio).map((item) => item.text).join(" "),
    );

    if (section === "SERVICO") {
      // Layout NBS validado no relatório real:
      // It | Serviço | Descrição do Serviço | TP | Valor Final
      const code = inRange(0.065, 0.24);
      const name = inRange(0.24, 0.82);
      const quantityText = inRange(0.82, 0.90);
      const totalText = inRange(0.90, 1.01);
      if (!looksLikeCode(code) || !name) continue;
      const quantity = normalizeNumber(quantityText);
      const total = normalizeNumber(totalText);
      if (!(quantity > 0) || !(total > 0)) continue;
      addUniqueItem(items, createLocalItem(
        "SERVICO",
        code,
        name,
        quantity,
        total / quantity,
        total,
        0.999,
        "NBS RAW: serviço lido diretamente da tabela Serviço/Descrição/TP/Valor Final.",
      ));
      continue;
    }

    // Layout NBS peças:
    // Orçamento Item | Descrição do Item | UN | LD | Qtde | Preço Unitário | Valor Final
    const code = inRange(0.045, 0.24);
    const name = inRange(0.24, 0.54);
    const quantityText = inRange(0.60, 0.72);
    const unitPriceText = inRange(0.72, 0.88);
    const totalText = inRange(0.88, 1.01);
    if (!looksLikeCode(code) || !name) continue;
    const quantity = normalizeNumber(quantityText);
    const unitPrice = normalizeNumber(unitPriceText);
    const total = normalizeNumber(totalText);
    if (!(quantity > 0) || (!(unitPrice > 0) && !(total > 0))) continue;
    addUniqueItem(items, createLocalItem(
      "PECA",
      code,
      name,
      quantity,
      unitPrice,
      total,
      0.999,
      "NBS RAW: peça lida diretamente da tabela Item/Descrição/Qtde/Preço Unitário/Valor Final.",
    ));
  }

  const confirmed = serviceHeaderFound && partHeaderFound && items.length > 0;
  if (!confirmed && requestedSource !== "NBS") {
    return { source: "DESCONHECIDO", ignoredCount, items: [] as ImportedItem[] };
  }
  return { source: "NBS", ignoredCount, items };
}

async function extractMobatoRawTable(fileData: string, requestedSource: string) {
  if (requestedSource === "NBS") {
    return { source: "NBS", ignoredCount: 0, items: [] as ImportedItem[], boldRows: 0, regularRows: 0 };
  }

  const buffer = decodeDataUrl(fileData);
  const pageWidth = rawPdfPageWidth(buffer);
  const fragments = rawPdfTextFragments(buffer);
  const items: ImportedItem[] = [];
  let ignoredCount = 0;
  let boldRows = 0;
  let regularRows = 0;
  let tableDetected = false;

  const rows: RawPdfTextFragment[][] = [];
  for (const fragment of [...fragments].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const row = rows.find((candidate) => Math.abs(candidate[0].y - fragment.y) <= 2.8);
    if (row) row.push(fragment);
    else rows.push([fragment]);
  }

  let inBudgetTable = false;
  for (const row of rows.sort((a, b) => b[0].y - a[0].y)) {
    const ordered = [...row].sort((a, b) => a.x - b.x);
    const joined = compactLine(ordered.map((item) => item.text).join(" "));
    const upper = joined.toUpperCase();

    const hasCodeHeader = /C[ÓO]DIGO/.test(upper);
    const hasDescriptionHeader = /DESCRI[CÇ][ÃA]O/.test(upper);
    const hasQuantityHeader = /QTDE\s*\/\s*TEMPO|QTD(?:E)?\.?\s*\/\s*TEMPO/.test(upper);
    const hasTotalHeader = /\bTOTAL\b/.test(upper);
    if (hasCodeHeader && hasDescriptionHeader && hasQuantityHeader && hasTotalHeader) {
      inBudgetTable = true;
      tableDetected = true;
      continue;
    }

    if (!inBudgetTable) continue;
    if (/SUB\.?\s*GERAL|VALOR\s+TOTAL\s+ESTIMADO|^OBS[:.]|OBSERVA[CÇ][ÕO]ES/.test(upper)) {
      inBudgetTable = false;
      continue;
    }
    if (looksStruckOrCancelled(joined)) {
      ignoredCount += 1;
      continue;
    }

    const textInRange = (minRatio: number, maxRatio: number) => compactLine(
      ordered
        .filter((item) => item.x >= pageWidth * minRatio && item.x < pageWidth * maxRatio)
        .map((item) => item.text)
        .join(" "),
    );

    const code = textInRange(0, 0.15);
    const name = textInRange(0.15, 0.55);
    const quantityText = textInRange(0.55, 0.64);
    const unitPriceText = textInRange(0.64, 0.73);
    const totalText = textInRange(0.89, 1.01);

    if (!looksLikeCode(code) || !name || !quantityText || !totalText) continue;

    const quantity = normalizeNumber(quantityText);
    let unitPrice = normalizeNumber(unitPriceText);
    const total = normalizeNumber(totalText);
    if (!(quantity > 0)) continue;
    if (!(unitPrice > 0) && !(total > 0)) continue;
    if (total > 0 && Math.abs(quantity * unitPrice - total) > 0.02) {
      unitPrice = total / quantity;
    }

    const commercialFragments = ordered.filter((item) => item.x < pageWidth * 0.89);
    const rowIsBold = commercialFragments.some((item) => item.bold);
    const kind: "SERVICO" | "PECA" = rowIsBold ? "SERVICO" : "PECA";

    if (rowIsBold) boldRows += 1;
    else regularRows += 1;

    addUniqueItem(items, createLocalItem(
      kind,
      code,
      name,
      quantity,
      unitPrice,
      total,
      0.999,
      rowIsBold
        ? "Mobato: fonte negrito identificada diretamente no stream PDF = mão de obra."
        : "Mobato: fonte normal identificada diretamente no stream PDF = peça.",
    ));
  }

  const confirmedMobato = requestedSource === "MOBATO" || (tableDetected && items.length > 0);
  if (!confirmedMobato) {
    return { source: "DESCONHECIDO", ignoredCount, items: [] as ImportedItem[], boldRows, regularRows };
  }

  return { source: "MOBATO", ignoredCount, items, boldRows, regularRows };
}


async function extractMobatoFontTable(fileData: string, requestedSource: string) {
  // Regra do PDF original do Mobato:
  //   - linha em NEGRITO = mão de obra / serviço
  //   - linha em fonte normal = peça
  //
  // O pdfjs preserva a fonte utilizada em cada fragmento. Após carregar o
  // operator list, page.commonObjs expõe o objeto da fonte e informa `bold`.
  // Dessa forma não precisamos adivinhar pelo código ou pela descrição.
  if (requestedSource === "NBS") {
    return { source: "NBS", ignoredCount: 0, items: [] as ImportedItem[], boldRows: 0, regularRows: 0 };
  }

  const bytes = new Uint8Array(decodeDataUrl(fileData));
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({ data: bytes, useSystemFonts: true });
  const document = await loadingTask.promise;
  const items: ImportedItem[] = [];
  let ignoredCount = 0;
  let boldRows = 0;
  let regularRows = 0;
  let tableDetected = false;

  type PositionedItem = {
    text: string;
    x: number;
    y: number;
    width: number;
    fontName: string;
    bold: boolean;
  };

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const pageWidth = Math.max(1, Number(viewport.width) || 595);
      const textContent = await page.getTextContent();

      try {
        await page.getOperatorList();
      } catch (operatorError) {
        console.error("Gerivo Mobato font metadata:", operatorError);
      }

      const fontIsBold = (fontName: string) => {
        try {
          const font = page.commonObjs?.get?.(fontName);
          if (typeof font?.bold === "boolean") return font.bold;
          const name = `${font?.name || ""} ${font?.loadedName || ""} ${font?.fallbackName || ""}`;
          return /\b(BOLD|BLACK|HEAVY|SEMIBOLD|SEMI-BOLD|DEMI)\b/i.test(name);
        } catch {
          return false;
        }
      };

      const positioned: PositionedItem[] = (Array.isArray(textContent?.items) ? textContent.items : [])
        .filter((item: any) => item && typeof item.str === "string" && item.str.trim() && Array.isArray(item.transform))
        .map((item: any): PositionedItem => ({
          text: compactLine(item.str),
          x: Number(item.transform[4]) || 0,
          y: Number(item.transform[5]) || 0,
          width: Math.max(1, Number(item.width) || 1),
          fontName: String(item.fontName || ""),
          bold: fontIsBold(String(item.fontName || "")),
        }));

      const rows: PositionedItem[][] = [];
      for (const item of [...positioned].sort((a, b) => b.y - a.y || a.x - b.x)) {
        const row = rows.find((candidate) => Math.abs(candidate[0].y - item.y) <= 2.8);
        if (row) row.push(item);
        else rows.push([item]);
      }

      let inBudgetTable = false;
      for (const row of rows.sort((a, b) => b[0].y - a[0].y)) {
        const ordered = [...row].sort((a, b) => a.x - b.x);
        const joined = compactLine(ordered.map((item) => item.text).join(" "));
        const upper = joined.toUpperCase();

        const hasCodeHeader = /C[ÓO]DIGO/.test(upper);
        const hasDescriptionHeader = /DESCRI[CÇ][ÃA]O/.test(upper);
        const hasQuantityHeader = /QTDE\s*\/\s*TEMPO|QTD(?:E)?\.?\s*\/\s*TEMPO/.test(upper);
        const hasTotalHeader = /\bTOTAL\b/.test(upper);
        if (hasCodeHeader && hasDescriptionHeader && hasQuantityHeader && hasTotalHeader) {
          inBudgetTable = true;
          tableDetected = true;
          continue;
        }

        if (!inBudgetTable) continue;
        if (/SUB\.?\s*GERAL|VALOR\s+TOTAL\s+ESTIMADO|^OBS[:.]|OBSERVA[CÇ][ÕO]ES/.test(upper)) {
          inBudgetTable = false;
          continue;
        }
        if (looksStruckOrCancelled(joined)) {
          ignoredCount += 1;
          continue;
        }

        const textInRange = (minRatio: number, maxRatio: number) => compactLine(
          ordered
            .filter((item) => item.x >= pageWidth * minRatio && item.x < pageWidth * maxRatio)
            .map((item) => item.text)
            .join(" "),
        );

        const code = textInRange(0, 0.15);
        const name = textInRange(0.15, 0.55);
        const quantityText = textInRange(0.55, 0.64);
        const unitPriceText = textInRange(0.64, 0.73);
        const totalText = textInRange(0.89, 1.01);

        if (!looksLikeCode(code) || !name || !quantityText || !totalText) continue;

        const quantity = normalizeNumber(quantityText);
        let unitPrice = normalizeNumber(unitPriceText);
        const total = normalizeNumber(totalText);
        if (!(quantity > 0)) continue;

        // Linhas administrativas do Mobato, como "REQ - REQUISICAO PECAS
        // MECANICA", podem aparecer em negrito mas com valor zero. Não entram
        // no orçamento comercial.
        if (!(unitPrice > 0) && !(total > 0)) continue;
        if (total > 0 && Math.abs(quantity * unitPrice - total) > 0.02) {
          unitPrice = total / quantity;
        }

        const commercialFragments = ordered.filter((item) => item.x < pageWidth * 0.89);
        const boldVotes = commercialFragments.filter((item) => item.bold).length;
        const rowIsBold = commercialFragments.length > 0 && boldVotes >= Math.ceil(commercialFragments.length / 2);
        const kind: "SERVICO" | "PECA" = rowIsBold ? "SERVICO" : "PECA";

        if (rowIsBold) boldRows += 1;
        else regularRows += 1;

        addUniqueItem(items, createLocalItem(
          kind,
          code,
          name,
          quantity,
          unitPrice,
          total,
          0.995,
          rowIsBold
            ? "Mobato: linha em negrito identificada como mão de obra."
            : "Mobato: linha em fonte normal identificada como peça.",
        ));
      }
    }
  } finally {
    await loadingTask.destroy().catch(() => undefined);
  }

  const confirmedMobato = requestedSource === "MOBATO" || (tableDetected && boldRows > 0);
  if (!confirmedMobato) {
    return { source: "DESCONHECIDO", ignoredCount, items: [] as ImportedItem[], boldRows, regularRows };
  }

  return { source: "MOBATO", ignoredCount, items, boldRows, regularRows };
}


async function extractNbsCoordinateTable(fileData: string, requestedSource: string) {
  const bytes = new Uint8Array(decodeDataUrl(fileData));
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({ data: bytes, useSystemFonts: true });
  const document = await loadingTask.promise;
  const items: ImportedItem[] = [];
  let fullText = "";
  let ignoredCount = 0;

  type PositionedItem = { text: string; x: number; y: number; width: number };

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const pageWidth = Math.max(1, Number(viewport.width) || 595);
      const textContent = await page.getTextContent();
      const positioned: PositionedItem[] = (Array.isArray(textContent?.items) ? textContent.items : [])
        .filter((item: any) => item && typeof item.str === "string" && item.str.trim() && Array.isArray(item.transform))
        .map((item: any): PositionedItem => ({
          text: compactLine(item.str),
          x: Number(item.transform[4]) || 0,
          y: Number(item.transform[5]) || 0,
          width: Math.max(1, Number(item.width) || 1),
        }));

      fullText += `\n${positioned.map((item) => item.text).join(" ")}`;

      const rows: PositionedItem[][] = [];
      for (const item of [...positioned].sort((a, b) => b.y - a.y || a.x - b.x)) {
        const row = rows.find((candidate) => Math.abs(candidate[0].y - item.y) <= 2.8);
        if (row) row.push(item);
        else rows.push([item]);
      }

      let inBudgetTable = false;
      for (const row of rows.sort((a, b) => b[0].y - a[0].y)) {
        const ordered = [...row].sort((a, b) => a.x - b.x);
        const joined = compactLine(ordered.map((item) => item.text).join(" "));
        const upper = joined.toUpperCase();

        // O NBS grava uma camada de texto excelente, mas os extratores genéricos
        // frequentemente devolvem cada coluna em bloco. Aqui reconstruímos a linha
        // pela posição X real das células da tabela.
        const hasCodeHeader = /C[ÓO]DIGO/.test(upper);
        const hasDescriptionHeader = /DESCRI[CÇ][ÃA]O/.test(upper);
        const hasQuantityHeader = /QTDE\s*\/\s*TEMPO|QTD(?:E)?\.?\s*\/\s*TEMPO/.test(upper);
        const hasTotalHeader = /\bTOTAL\b/.test(upper);
        if (hasCodeHeader && hasDescriptionHeader && hasQuantityHeader && hasTotalHeader) {
          inBudgetTable = true;
          continue;
        }
        if (!inBudgetTable) continue;
        if (/SUB\.?\s*GERAL|VALOR\s+TOTAL\s+ESTIMADO|^OBS[:.]|OBSERVA[CÇ][ÕO]ES/.test(upper)) {
          inBudgetTable = false;
          continue;
        }

        const textInRange = (minRatio: number, maxRatio: number) => compactLine(ordered
          .filter((item) => item.x >= pageWidth * minRatio && item.x < pageWidth * maxRatio)
          .map((item) => item.text)
          .join(" "));
        const code = textInRange(0, 0.15);
        const name = textInRange(0.15, 0.55);
        const quantityText = textInRange(0.55, 0.64);
        const unitPriceText = textInRange(0.64, 0.73);
        const totalText = textInRange(0.89, 1.01);

        if (!looksLikeCode(code) || !name || !quantityText || !totalText) continue;
        const quantity = normalizeNumber(quantityText);
        let unitPrice = normalizeNumber(unitPriceText);
        const total = normalizeNumber(totalText);
        if (!(quantity > 0)) continue;

        // Linhas administrativas do NBS (ex.: REQ) podem vir com quantidade 1,
        // porém sem preço e total. Elas não são peça nem mão de obra comercial.
        if (!(unitPrice > 0) && !(total > 0)) continue;
        if (total > 0 && Math.abs(quantity * unitPrice - total) > 0.02) unitPrice = total / quantity;

        const kind = inferItemKind(code, name, null);
        addUniqueItem(items, createLocalItem(
          kind,
          code,
          name,
          quantity,
          unitPrice,
          total,
          0.98,
          "Leitura estrutural NBS pela posição das colunas do PDF.",
        ));
      }
    }
  } finally {
    await loadingTask.destroy().catch(() => undefined);
  }

  const source = detectSourceFromText(fullText, requestedSource);
  // Esta rotina é específica da tabela NBS. Se a origem automática não confirmar
  // NBS, não intercepta o restante da cadeia de reconhecimento.
  if (requestedSource !== "NBS" && source !== "NBS") return { source, ignoredCount: 0, items: [] as ImportedItem[] };
  return { source: "NBS", ignoredCount, items };
}

async function extractPdfCoordinateText(fileData: string) {
  const bytes = new Uint8Array(decodeDataUrl(fileData));
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({ data: bytes, useSystemFonts: true });
  const document = await loadingTask.promise;
  const lines: string[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      type CoordinateItem = { text: string; x: number; y: number; width: number; transform: number[] };
      const items: CoordinateItem[] = (Array.isArray(textContent?.items) ? textContent.items : [])
        .filter((item: any) => item && typeof item.str === "string" && item.str.trim() && Array.isArray(item.transform))
        .map((item: any): CoordinateItem => ({
          text: compactLine(item.str),
          x: Number(item.transform[4]) || 0,
          y: Number(item.transform[5]) || 0,
          width: Math.max(1, Number(item.width) || 1),
          transform: item.transform.map((value: unknown) => Number(value) || 0),
        }));
      const groups: CoordinateItem[][] = [];
      for (const item of [...items].sort((a: CoordinateItem, b: CoordinateItem) => b.y - a.y || a.x - b.x)) {
        const group = groups.find((row: CoordinateItem[]) => Math.abs(row[0].y - item.y) <= 2.8);
        if (group) group.push(item);
        else groups.push([item]);
      }

      let rendered: { data: Uint8ClampedArray; width: number; height: number; viewport: any } | null = null;
      try {
        const canvasModule: any = await import("@napi-rs/canvas");
        const viewport = page.getViewport({ scale: 1.55 });
        const canvas = canvasModule.createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        const context2d = canvas.getContext("2d");
        await page.render({ canvas, canvasContext: context2d, viewport }).promise;
        const image = context2d.getImageData(0, 0, canvas.width, canvas.height);
        rendered = { data: image.data, width: canvas.width, height: canvas.height, viewport };
      } catch (renderError) {
        console.error("Gerivo PDF strike detection render:", renderError);
      }

      const rowHasStrike = (group: CoordinateItem[]) => {
        if (!rendered || !group.length) return false;
        const screen = group.map((item: CoordinateItem) => {
          const transformed = pdfjs.Util.transform(rendered!.viewport.transform, item.transform);
          const height = Math.max(7, Math.hypot(Number(transformed[2]) || 0, Number(transformed[3]) || 0));
          return { x: Number(transformed[4]), baselineY: Number(transformed[5]), width: Math.max(2, item.width * 1.55), height };
        });
        const left = Math.max(0, Math.floor(Math.min(...screen.map((item: { x: number }) => item.x)) - 3));
        const right = Math.min(rendered.width - 1, Math.ceil(Math.max(...screen.map((item: { x: number; width: number }) => item.x + item.width)) + 3));
        const centerY = Math.round(screen.reduce((sum: number, item: { baselineY: number; height: number }) => sum + (item.baselineY - item.height * 0.48), 0) / screen.length);
        if (right - left < 45 || centerY < 2 || centerY >= rendered.height - 2) return false;
        let hitColumns = 0;
        let sampled = 0;
        for (let x = left; x <= right; x += 2) {
          sampled += 1;
          let dark = false;
          for (let y = centerY - 2; y <= centerY + 2; y += 1) {
            const offset = (y * rendered.width + x) * 4;
            const r = rendered.data[offset];
            const g = rendered.data[offset + 1];
            const b = rendered.data[offset + 2];
            if (r < 115 && g < 115 && b < 115) { dark = true; break; }
          }
          if (dark) hitColumns += 1;
        }
        return sampled > 0 && hitColumns / sampled >= 0.38;
      };

      for (const group of groups.sort((a: CoordinateItem[], b: CoordinateItem[]) => b[0].y - a[0].y)) {
        const line = compactLine(group.sort((a: CoordinateItem, b: CoordinateItem) => a.x - b.x).map((item: CoordinateItem) => item.text).join(" "));
        if (line) lines.push(rowHasStrike(group) ? `RISCADO ${line}` : line);
      }
    }
  } finally {
    await loadingTask.destroy().catch(() => undefined);
  }
  return lines.join("\n");
}

async function extractPdfDocument(fileData: string) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(decodeDataUrl(fileData)) });
  try {
    const textResult = await parser.getText();
    const text = String(textResult.text || "").trim();
    const tables: PdfTable[] = [];
    try {
      const tableResult: any = await parser.getTable();
      for (const page of Array.isArray(tableResult?.pages) ? tableResult.pages : []) {
        for (const table of Array.isArray(page?.tables) ? page.tables : []) {
          if (Array.isArray(table)) tables.push(table as PdfTable);
        }
      }
    } catch (tableError) {
      console.error("Gerivo PDF table extraction:", tableError);
    }
    return { text, tables };
  } finally {
    await parser.destroy();
  }
}

async function authorize(request: Request, companyId: string, storeId: string) {
  const token = bearerToken(request);
  if (!token) throw new Error("Sessão inválida. Entre novamente no Gerivo.");
  const admin = getSupabaseAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) throw new Error("Sessão expirada. Entre novamente no Gerivo.");
  const userId = authData.user.id;
  const [{ data: profile }, { data: company }, { data: store }, { data: companyMember }, { data: storeMember }] = await Promise.all([
    admin.from("profiles").select("platform_role, active").eq("id", userId).maybeSingle(),
    admin.from("companies").select("id, name, active, status").eq("id", companyId).maybeSingle(),
    admin.from("stores").select("id, name, company_id, active").eq("id", storeId).eq("company_id", companyId).maybeSingle(),
    admin.from("company_members").select("active, role").eq("company_id", companyId).eq("user_id", userId).maybeSingle(),
    admin.from("store_members").select("active, role").eq("company_id", companyId).eq("store_id", storeId).eq("user_id", userId).maybeSingle(),
  ]);
  const { subscription } = await getEffectiveSubscription(admin, companyId);
  if (!profile?.active) throw new Error("Seu usuário está inativo.");
  const platformMaster = profile.platform_role === "MASTER";
  if (!company || !store) throw new Error("Empresa ou unidade não encontrada.");
  if (!platformMaster && (!companyMember?.active || !storeMember?.active)) throw new Error("Você não possui acesso a esta empresa e unidade.");
  if (!platformMaster && (!company.active || !store.active)) throw new Error("A empresa ou unidade está suspensa.");
  if (!platformMaster && subscription && !Boolean(subscription.modules?.QUOTES)) throw new Error("O módulo de Orçamentos não está contratado.");
  if (!platformMaster && !Boolean(subscription?.modules?.BUDGET_IMPORT)) throw new Error("O Importador Mobato / NBS é um recurso adicional não contratado para esta empresa.");
  return { admin, userId };
}

async function recognizeWithVision(apiKey: string, model: string, fileData: string, filename: string, mimeType: string, requestedSource: string) {
  const instructions = [
    "Analise o orçamento automotivo anexado, normalmente emitido pelo Mobato ou NBS.",
    `Origem informada pelo usuário: ${requestedSource}.`,
    "Extraia EXCLUSIVAMENTE peças/produtos e serviços/mão de obra.",
    "O documento pode ou não conter marca-texto/grifo. NÃO use cor ou destaque como critério de seleção.",
    "Importe todas as linhas ativas de peças/produtos e serviços/mão de obra. Priorize descrição, quantidade/tempo e valor. Código é opcional.",
    "NÃO extraia cliente, veículo, placa, endereço, pagamentos, subtotais, totais gerais, descontos, impostos, cabeçalhos, observações ou diagnósticos.",
    "IGNORE completamente linhas riscadas, tachadas, canceladas, com traço atravessando o texto ou marcadas como não autorizadas, mesmo que estejam próximas de linhas grifadas.",
    "Preserve quantidades e tempos decimais, por exemplo 0,5; 0,8; 1,1; 1,6; 4,3.",
    "Não duplique uma peça ou serviço repetido em seções de resumo.",
    "Retorne SOMENTE JSON válido no formato:",
    '{"source":"MOBATO|NBS|DESCONHECIDO","ignoredCount":0,"items":[{"kind":"SERVICO|PECA","code":"","name":"","category":"","quantity":1.0,"unitPrice":0.0,"total":0.0,"confidence":0.0,"note":""}]}',
  ].join("\n");

  const content: any[] = [{ type: "input_text", text: instructions }];
  if (mimeType.startsWith("image/")) content.push({ type: "input_image", image_url: fileData, detail: "high" });
  else content.push({ type: "input_file", filename, file_data: decodeDataUrl(fileData).toString("base64") });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, input: [{ role: "user", content }], store: false, max_output_tokens: 4000 }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || "Falha ao reconhecer o documento.");
  const parsed = parseJsonPayload(extractResponseText(payload));
  const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];
  const items: ImportedItem[] = rawItems.map((item: any) => {
    const kind = String(item.kind || "").toUpperCase() === "SERVICO" ? "SERVICO" : "PECA";
    const quantity = Math.max(0, normalizeNumber(item.quantity));
    const total = Math.max(0, normalizeNumber(item.total));
    let unitPrice = Math.max(0, normalizeNumber(item.unitPrice));
    if (!unitPrice && quantity > 0 && total > 0) unitPrice = total / quantity;
    return {
      kind,
      code: safeText(item.code, 80),
      name: safeText(item.name || item.description, 240),
      category: safeText(item.category, 100) || (kind === "SERVICO" ? "Mão de obra" : "Peças"),
      quantity: Number(quantity.toFixed(2)),
      unitPrice: Number(unitPrice.toFixed(2)),
      total: Number((total || quantity * unitPrice).toFixed(2)),
      confidence: Math.max(0, Math.min(1, normalizeNumber(item.confidence))),
      note: safeText(item.note, 240),
    };
  }).filter((item: ImportedItem) => item.name && item.quantity > 0);
  return { source: safeText(parsed?.source, 30) || "DESCONHECIDO", ignoredCount: Math.max(0, Number(parsed?.ignoredCount) || 0), items };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const companyId = safeText(body.companyId, 80);
    const storeId = safeText(body.storeId, 80);
    const filename = safeText(body.filename, 180) || "orcamento";
    const mimeType = safeText(body.mimeType, 80);
    const fileData = safeText(body.fileData, 8_000_000);
    const requestedSource = ["MOBATO", "NBS"].includes(String(body.source)) ? String(body.source) : "AUTO";
    if (!companyId || !storeId || !fileData) return NextResponse.json({ error: "Arquivo, empresa e unidade são obrigatórios." }, { status: 400 });
    if (!mimeType.startsWith("image/") && mimeType !== "application/pdf") return NextResponse.json({ error: "Envie um PDF, PNG, JPG ou WEBP." }, { status: 400 });

    const context = await authorize(request, companyId, storeId);
    const apiKey = process.env.OPENAI_API_KEY?.trim() || "";
    const model = process.env.OPENAI_IMPORT_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";

    let result: { source: string; ignoredCount: number; items: ImportedItem[] } | null = null;
    let engine = "";

    if (mimeType === "application/pdf") {
      // Cada mecanismo é isolado. Um parser opcional falhar NÃO pode mais
      // impedir os próximos (foi isso que fazia o NBS nunca ser alcançado).

      // NBS RAW primeiro: lê diretamente os streams Flate/Td do Jasper/NBS,
      // sem pdfjs, canvas, OCR ou IA.
      if (!result) {
        try {
          const nbsRawResult = await extractNbsRawTable(fileData, requestedSource);
          if (nbsRawResult.items.length > 0) {
            result = nbsRawResult;
            engine = "local-nbs-raw-stream";
          }
        } catch (nbsRawError) {
          console.error("Gerivo NBS RAW parser:", nbsRawError);
        }
      }

      if (!result) {
        try {
          const mobatoRawResult = await extractMobatoRawTable(fileData, requestedSource);
          if (mobatoRawResult.items.length > 0) {
            result = mobatoRawResult;
            engine = "local-mobato-raw-stream";
          }
        } catch (mobatoRawError) {
          console.error("Gerivo Mobato RAW parser:", mobatoRawError);
        }
      }

      if (!result) {
        try {
          const mobatoFontResult = await extractMobatoFontTable(fileData, requestedSource);
          if (mobatoFontResult.items.length > 0) {
            result = mobatoFontResult;
            engine = "local-mobato-font-table";
          }
        } catch (mobatoFontError) {
          console.error("Gerivo Mobato font parser:", mobatoFontError);
        }
      }

      let pdfDocument: { text: string; tables: PdfTable[] } | null = null;
      if (!result) {
        try {
          pdfDocument = await extractPdfDocument(fileData);
          const nbsTextResult = parseNbsRealText(pdfDocument.text, requestedSource);
          if (nbsTextResult.items.length > 0) {
            result = nbsTextResult;
            engine = "local-nbs-real-text";
          }
        } catch (pdfTextError) {
          console.error("Gerivo PDF/NBS text extraction:", pdfTextError);
        }
      }

      if (!result) {
        try {
          const nbsCoordinateResult = await extractNbsCoordinateTable(fileData, requestedSource);
          if (nbsCoordinateResult.items.length > 0) {
            result = nbsCoordinateResult;
            engine = "local-nbs-coordinate-table";
          }
        } catch (nbsCoordinateError) {
          console.error("Gerivo NBS coordinate parser:", nbsCoordinateError);
        }
      }

      if (!result && pdfDocument) {
        try {
          if (pdfDocument.tables.length > 0) {
            const tableResult = parseLocalPdfTables(pdfDocument.tables, pdfDocument.text, requestedSource);
            if (tableResult.items.length > 0) {
              result = tableResult;
              engine = "local-pdf-table";
            }
          }
        } catch (tableError) {
          console.error("Gerivo generic PDF table parser:", tableError);
        }

        if (!result) {
          try {
            const coordinateText = await extractPdfCoordinateText(fileData);
            if (coordinateText.length >= 40) {
              const coordinateResult = parseLocalPdfText(coordinateText, requestedSource);
              if (coordinateResult.items.length > 0) {
                result = coordinateResult;
                engine = "local-pdf-coordinate-lines";
              }
            }
          } catch (coordinateError) {
            console.error("Gerivo PDF coordinate extraction:", coordinateError);
          }
        }

        if (!result && pdfDocument.text.length >= 40) {
          try {
            const localResult = parseLocalPdfText(pdfDocument.text, requestedSource);
            if (localResult.items.length > 0) {
              result = localResult;
              engine = "local-pdf-text";
            }
          } catch (localTextError) {
            console.error("Gerivo generic PDF text parser:", localTextError);
          }
        }
      }
    }

    if (!result && apiKey) {
      result = await recognizeWithVision(apiKey, model, fileData, filename, mimeType, requestedSource);
      engine = model;
    }

    if (!result) {
      const error = mimeType === "application/pdf"
        ? "Não foi possível identificar automaticamente as linhas comerciais deste PDF. No Mobato o Gerivo usa a formatação original da tabela (negrito = mão de obra; normal = peça); no NBS usa a estrutura das colunas. Confirme a origem selecionada e use o PDF original exportado pelo sistema."
        : "Esta imagem precisa do reconhecimento visual configurado pela empresa. O reconhecimento considera as linhas ativas e ignora itens riscados; grifos não são obrigatórios.";
      return NextResponse.json({ error }, { status: 422 });
    }

    await context.admin.from("audit_logs").insert({
      company_id: companyId,
      store_id: storeId,
      user_id: context.userId,
      action: "BUDGET_DOCUMENT_IMPORTED",
      entity: "quote_import",
      entity_id: null,
      new_value: { source: result.source, filename, item_count: result.items.length, ignored_count: result.ignoredCount, engine },
    });

    return NextResponse.json({ ...result, engine });
  } catch (error) {
    const message = apiErrorMessage(error, "Não foi possível importar o orçamento.");
    console.error("Gerivo budget import:", error);
    const status = message.includes("Sessão") ? 401 : message.includes("acesso") || message.includes("contrat") || message.includes("inativo") || message.includes("suspens") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
