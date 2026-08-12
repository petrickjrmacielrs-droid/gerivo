import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../lib/supabase-admin";
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
  let raw = String(value || "").trim().replace(/R\$\s?/gi, "").replace(/\s/g, "");
  if (!raw) return 0;
  if (/^-?\d{1,3}(?:\.\d{3})*,\d+$/.test(raw)) raw = raw.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d+,\d+$/.test(raw)) raw = raw.replace(",", ".");
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
  if (upper.includes("ORÇAMENTO INTERNO") || upper.includes("ORCAMENTO INTERNO") || upper.includes("MOBATO")) return "MOBATO";
  if (upper.includes("ORÇAMENTO:") || upper.includes("ORCAMENTO:") || upper.includes("RECOMENDADOS")) return "NBS";
  return "DESCONHECIDO";
}


type PdfTable = string[][];

function isNumericCell(value: string) {
  return /^-?(?:R\$\s*)?\d+(?:\.\d{3})*(?:,\d+)?$/.test(value.trim())
    || /^-?\d+(?:\.\d+)?$/.test(value.trim());
}

function looksLikeCode(value: string) {
  const clean = value.trim().toUpperCase();
  if (!clean || clean.length < 2 || clean.length > 50 || /\s/.test(clean)) return false;
  return /[A-Z]/.test(clean) && /^[A-Z0-9./_-]+$/.test(clean);
}

function inferItemKind(code: string, name: string, forced: "SERVICO" | "PECA" | null) {
  if (forced) return forced;
  const normalizedCode = code.toUpperCase();
  const normalizedName = name.toUpperCase();
  if (/^(REV|PCT|MO|SERV|99LAV|LAVCAR)/.test(normalizedCode)) return "SERVICO";
  if (/\b(REVIS[ÃA]O|HIGIENIZA[CÇ][ÃA]O|LAVAGEM|M[ÃA]O DE OBRA|SERVI[CÇ]O)\b/.test(normalizedName)) return "SERVICO";
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
  const [{ data: profile }, { data: company }, { data: store }, { data: companyMember }, { data: storeMember }, { data: subscription }] = await Promise.all([
    admin.from("profiles").select("platform_role, active").eq("id", userId).maybeSingle(),
    admin.from("companies").select("id, name, active, status").eq("id", companyId).maybeSingle(),
    admin.from("stores").select("id, name, company_id, active").eq("id", storeId).eq("company_id", companyId).maybeSingle(),
    admin.from("company_members").select("active, role").eq("company_id", companyId).eq("user_id", userId).maybeSingle(),
    admin.from("store_members").select("active, role").eq("company_id", companyId).eq("store_id", storeId).eq("user_id", userId).maybeSingle(),
    admin.from("company_subscriptions").select("id, status, modules").eq("company_id", companyId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
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
    "NÃO extraia cliente, veículo, placa, endereço, pagamentos, subtotais, totais gerais, descontos, impostos, cabeçalhos, observações ou diagnósticos.",
    "IGNORE completamente linhas riscadas, tachadas, canceladas, com traço atravessando o texto ou marcadas como não autorizadas.",
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
      try {
        const pdfDocument = await extractPdfDocument(fileData);
        if (pdfDocument.tables.length > 0) {
          const tableResult = parseLocalPdfTables(pdfDocument.tables, pdfDocument.text, requestedSource);
          if (tableResult.items.length > 0) {
            result = tableResult;
            engine = "local-pdf-table";
          }
        }
        if (!result && pdfDocument.text.length >= 40) {
          const localResult = parseLocalPdfText(pdfDocument.text, requestedSource);
          if (localResult.items.length > 0) {
            result = localResult;
            engine = "local-pdf-text";
          }
        }
      } catch (localError) {
        console.error("Gerivo local PDF import:", localError);
      }
    }

    if (!result && apiKey) {
      result = await recognizeWithVision(apiKey, model, fileData, filename, mimeType, requestedSource);
      engine = model;
    }

    if (!result) {
      const error = mimeType === "application/pdf"
        ? "Não foi possível identificar as linhas deste PDF automaticamente. Tente o PDF original exportado pelo Mobato/NBS. Documentos digitalizados precisam do reconhecimento visual configurado pela empresa."
        : "Esta imagem precisa do reconhecimento visual configurado pela empresa. Envie um PDF original do Mobato/NBS ou solicite a ativação do reconhecimento visual.";
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
