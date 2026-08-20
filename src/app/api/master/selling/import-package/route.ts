import { inflateSync } from "node:zlib";
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../../lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RawFragment = { text: string; x: number; y: number; bold: boolean };
type ImportedPackageItem = {
  id: string;
  itemType: "PART" | "LABOR";
  code: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  laborHours: number;
  source: string;
};

async function requireMaster(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) throw new Error("Sessão inválida. Entre novamente no Gerivo.");
  const admin = getSupabaseAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) throw new Error("Sessão expirada. Entre novamente no Gerivo.");
  const { data: profile, error: profileError } = await admin.from("profiles").select("platform_role,active").eq("id", authData.user.id).maybeSingle();
  if (profileError) throw profileError;
  if (profile?.platform_role !== "MASTER" || !profile.active) throw new Error("Somente o MASTER Gerivo pode importar pacotes Selling.");
  return { admin, userId: authData.user.id };
}

function compactLine(value: string) {
  return String(value || "").replace(/\u0000/g, "").replace(/\s+/g, " ").trim();
}

function normalizeNumber(value: string) {
  let text = compactLine(value).replace(/R\$/gi, "").replace(/\s/g, "");
  if (!text) return 0;
  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");
  if (comma > dot) text = text.replace(/\./g, "").replace(",", ".");
  else if (dot > comma && comma >= 0) text = text.replace(/,/g, "");
  else if (comma >= 0) text = text.replace(",", ".");
  else if ((text.match(/\./g) || []).length > 1) {
    const parts = text.split(".");
    const decimal = parts.pop();
    text = `${parts.join("")}.${decimal}`;
  }
  const number = Number(text.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function decodePdfLiteral(raw: string) {
  const bytes: number[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    const code = raw.charCodeAt(index);
    if (code !== 0x5c) { bytes.push(code & 0xff); continue; }
    index += 1;
    if (index >= raw.length) break;
    const escaped = raw[index];
    if (escaped === "\r") { if (raw[index + 1] === "\n") index += 1; continue; }
    if (escaped === "\n") continue;
    const simple: Record<string, number> = { n: 10, r: 13, t: 9, b: 8, f: 12, "(": 40, ")": 41, "\\": 92 };
    if (Object.prototype.hasOwnProperty.call(simple, escaped)) { bytes.push(simple[escaped]); continue; }
    if (/[0-7]/.test(escaped)) {
      let octal = escaped;
      while (octal.length < 3 && index + 1 < raw.length && /[0-7]/.test(raw[index + 1])) { index += 1; octal += raw[index]; }
      bytes.push(Number.parseInt(octal, 8) & 0xff);
      continue;
    }
    bytes.push(escaped.charCodeAt(0) & 0xff);
  }
  try { return new TextDecoder("windows-1252").decode(Uint8Array.from(bytes)); }
  catch { return Buffer.from(bytes).toString("latin1"); }
}

function fontMap(binary: string) {
  const objects = new Map<string, string>();
  for (const match of binary.matchAll(/(\d+)\s+0\s+obj\b([\s\S]*?)endobj/g)) {
    const baseFont = match[2].match(/\/BaseFont\s*\/([^\s/<>\[\]()]+)/i)?.[1] || "";
    if (baseFont) objects.set(match[1], baseFont);
  }
  const resources = new Map<string, string>();
  for (const match of binary.matchAll(/\/([A-Za-z][A-Za-z0-9_.-]*)\s+(\d+)\s+0\s+R/g)) {
    const name = objects.get(match[2]);
    if (name) resources.set(match[1], name);
  }
  return resources;
}

function flateTextStreams(buffer: Buffer) {
  const binary = buffer.toString("latin1");
  const streams: string[] = [];
  for (const match of binary.matchAll(/<<([\s\S]*?)>>\s*stream(?:\r\n|\n|\r)/g)) {
    if (!/\/FlateDecode\b/.test(match[1])) continue;
    const start = (match.index || 0) + match[0].length;
    const end = binary.indexOf("endstream", start);
    if (end < 0) continue;
    let raw = buffer.subarray(start, end);
    while (raw.length && (raw[raw.length - 1] === 10 || raw[raw.length - 1] === 13)) raw = raw.subarray(0, raw.length - 1);
    try {
      const decoded = inflateSync(raw).toString("latin1");
      if (/\bBT\b/.test(decoded) && (/\bTj\b/.test(decoded) || /\bTJ\b/.test(decoded))) streams.push(decoded);
    } catch { /* imagem ou stream não textual */ }
  }
  return { binary, streams };
}

function textFragments(buffer: Buffer) {
  const { binary, streams } = flateTextStreams(buffer);
  const fonts = fontMap(binary);
  const fragments: RawFragment[] = [];
  for (const stream of streams) {
    for (const blockMatch of stream.matchAll(/\bBT\b([\s\S]*?)\bET\b/g)) {
      const block = blockMatch[1];
      const fontMatches = [...block.matchAll(/\/([A-Za-z][A-Za-z0-9_.-]*)\s+[-+]?\d+(?:\.\d+)?\s+Tf\b/g)];
      const fontKey = fontMatches.at(-1)?.[1] || "";
      const fontName = fonts.get(fontKey) || fontKey;
      const bold = /(BOLD|BLACK|HEAVY|SEMIBOLD|SEMI-BOLD|DEMI)/i.test(fontName);
      const matrixMatches = [...block.matchAll(/[-+]?\d+(?:\.\d+)?\s+[-+]?\d+(?:\.\d+)?\s+[-+]?\d+(?:\.\d+)?\s+[-+]?\d+(?:\.\d+)?\s+([-+]?\d+(?:\.\d+)?)\s+([-+]?\d+(?:\.\d+)?)\s+Tm\b/g)];
      const matrix = matrixMatches.at(-1);
      if (!matrix) continue;
      const x = Number(matrix[1]); const y = Number(matrix[2]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      const texts: string[] = [];
      for (const literal of block.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj\b/g)) {
        const decoded = compactLine(decodePdfLiteral(literal[1])); if (decoded) texts.push(decoded);
      }
      if (!texts.length) {
        const arrayMatch = block.match(/\[((?:.|\r|\n)*?)\]\s*TJ\b/);
        if (arrayMatch) for (const literal of arrayMatch[1].matchAll(/\(((?:\\.|[^\\)])*)\)/g)) {
          const decoded = compactLine(decodePdfLiteral(literal[1])); if (decoded) texts.push(decoded);
        }
      }
      const text = compactLine(texts.join(" "));
      if (text) fragments.push({ text, x, y, bold });
    }
  }
  return fragments;
}

function pageWidth(buffer: Buffer) {
  const match = buffer.toString("latin1").match(/\/MediaBox\s*\[\s*[-+]?\d+(?:\.\d+)?\s+[-+]?\d+(?:\.\d+)?\s+([-+]?\d+(?:\.\d+)?)\s+([-+]?\d+(?:\.\d+)?)\s*\]/);
  const width = Number(match?.[1]);
  return Number.isFinite(width) && width > 100 ? width : 595;
}

function looksLikeCode(value: string) {
  const text = compactLine(value);
  return text.length >= 2 && text.length <= 32 && /^[A-Z0-9À-Ú*./_-]+(?:\s+[A-Z0-9À-Ú*./_-]+){0,2}$/i.test(text);
}

function parseRecommended(buffer: Buffer) {
  const width = pageWidth(buffer);
  const fragments = textFragments(buffer);
  const rows: RawFragment[][] = [];
  for (const fragment of [...fragments].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const row = rows.find((candidate) => Math.abs(candidate[0].y - fragment.y) <= 2.8);
    if (row) row.push(fragment); else rows.push([fragment]);
  }
  let sawRecommended = false;
  let inTable = false;
  let ignored = 0;
  const items: ImportedPackageItem[] = [];

  for (const row of rows.sort((a, b) => b[0].y - a[0].y)) {
    const ordered = [...row].sort((a, b) => a.x - b.x);
    const joined = compactLine(ordered.map((item) => item.text).join(" "));
    const upper = joined.toUpperCase();
    if (/\bRECOMENDADOS\b/.test(upper)) { sawRecommended = true; inTable = false; continue; }
    if (!sawRecommended) continue;
    const isHeader = /C[ÓO]DIGO/.test(upper) && /DESCRI[CÇ][ÃA]O/.test(upper) && /QTDE\s*\/\s*TEMPO/.test(upper) && /\bTOTAL\b/.test(upper);
    if (isHeader) { inTable = true; continue; }
    if (!inTable) continue;
    if (/SUB\.?\s*GERAL|VALOR\s+TOTAL\s+ESTIMADO|OBSERVA[CÇ][ÕO]ES|ASSINATURA/.test(upper)) break;
    if (/RISCO\s+TRACEJADO|N[ÃA]O\s+AUTORIZADOS/.test(upper)) { ignored += 1; continue; }

    const textIn = (min: number, max: number) => compactLine(ordered.filter((item) => item.x >= width * min && item.x < width * max).map((item) => item.text).join(" "));
    const code = textIn(0, 0.15);
    const description = textIn(0.15, 0.55);
    const quantityText = textIn(0.55, 0.64);
    const unitText = textIn(0.64, 0.73);
    const totalText = textIn(0.89, 1.01);
    if (!looksLikeCode(code) || !description || !quantityText) continue;
    const quantity = normalizeNumber(quantityText);
    const unitPrice = normalizeNumber(unitText);
    const lineTotal = normalizeNumber(totalText);
    if (!(quantity > 0) || (!(unitPrice > 0) && !(lineTotal > 0))) continue;
    const commercial = ordered.filter((item) => item.x < width * 0.89);
    const bold = commercial.some((item) => item.bold);
    items.push({
      id: `pdf-${items.length + 1}-${Date.now().toString(36)}`,
      itemType: bold ? "LABOR" : "PART",
      code,
      description,
      quantity,
      unitPrice,
      lineTotal,
      laborHours: bold ? quantity : 0,
      source: "MOBATO_RECOMENDADOS",
    });
  }
  return { items, ignored, sawRecommended };
}

export async function POST(request: Request) {
  try {
    const { admin, userId } = await requireMaster(request);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Selecione um PDF Mobato." }, { status: 400 });
    if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "PDF acima de 8 MB." }, { status: 400 });
    if (!/pdf/i.test(file.type) && !file.name.toLowerCase().endsWith(".pdf")) return NextResponse.json({ error: "O importador de pacote aceita PDF." }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseRecommended(buffer);
    if (!parsed.sawRecommended) return NextResponse.json({ error: "A seção RECOMENDADOS não foi encontrada neste PDF." }, { status: 422 });
    if (!parsed.items.length) return NextResponse.json({ error: "Nenhum item válido foi encontrado dentro de RECOMENDADOS." }, { status: 422 });

    await admin.from("audit_logs").insert({
      user_id: userId,
      action: "SELLING_PACKAGE_PDF_PARSED",
      entity: "selling_package_import",
      new_value: { file: file.name, itemCount: parsed.items.length, ignored: parsed.ignored },
    });

    return NextResponse.json({
      success: true,
      fileName: file.name,
      count: parsed.items.length,
      laborCount: parsed.items.filter((item) => item.itemType === "LABOR").length,
      partCount: parsed.items.filter((item) => item.itemType === "PART").length,
      total: parsed.items.reduce((sum, item) => sum + item.lineTotal, 0),
      items: parsed.items,
      rule: "RECOMENDADOS: negrito = mão de obra; normal = peça",
    });
  } catch (error) {
    console.error("Gerivo MASTER Selling import-package:", error);
    const message = error instanceof Error ? error.message : "Não foi possível importar o pacote.";
    return NextResponse.json({ error: message }, { status: message.includes("Sessão") ? 401 : message.includes("MASTER") ? 403 : 500 });
  }
}
