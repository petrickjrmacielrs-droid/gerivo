import "server-only";
import { inflateRawSync } from "node:zlib";

export type XlsxCell = string | number | boolean | null;
export type XlsxSheet = { name: string; rows: XlsxCell[][] };

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function columnIndex(ref: string) {
  const letters = (ref.match(/[A-Z]+/i)?.[0] || "A").toUpperCase();
  let value = 0;
  for (const char of letters) value = value * 26 + char.charCodeAt(0) - 64;
  return Math.max(0, value - 1);
}

function readZipEntries(buffer: Buffer) {
  const eocdSignature = 0x06054b50;
  let eocd = -1;
  const min = Math.max(0, buffer.length - 65557);
  for (let offset = buffer.length - 22; offset >= min; offset -= 1) {
    if (buffer.readUInt32LE(offset) === eocdSignature) { eocd = offset; break; }
  }
  if (eocd < 0) throw new Error("Arquivo XLSX inválido: diretório ZIP não encontrado.");

  const entryCount = buffer.readUInt16LE(eocd + 10);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  const entries = new Map<string, Buffer>();
  let offset = centralOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + fileNameLength).toString("utf8");

    if (buffer.readUInt32LE(localOffset) === 0x04034b50) {
      const localNameLength = buffer.readUInt16LE(localOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
      const data = method === 0 ? Buffer.from(compressed) : method === 8 ? inflateRawSync(compressed) : null;
      if (data) entries.set(name.replace(/^\//, ""), data);
    }
    offset += 46 + fileNameLength + extraLength + commentLength;
  }
  return entries;
}

function parseSharedStrings(xml: string) {
  const result: string[] = [];
  for (const match of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    const pieces = Array.from(match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)).map((part) => decodeXml(part[1]));
    result.push(pieces.join(""));
  }
  return result;
}

function parseSheet(xml: string, shared: string[]) {
  const rows = new Map<number, XlsxCell[]>();
  const cellPattern = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  for (const match of xml.matchAll(cellPattern)) {
    const attrs = match[1];
    const body = match[2] || "";
    const ref = attrs.match(/\br="([A-Z]+\d+)"/i)?.[1];
    if (!ref) continue;
    const rowIndex = Math.max(0, Number(ref.match(/\d+/)?.[0] || "1") - 1);
    const colIndex = columnIndex(ref);
    const type = attrs.match(/\bt="([^"]+)"/)?.[1] || "n";
    let value: XlsxCell = null;

    if (type === "inlineStr") {
      const text = Array.from(body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)).map((part) => decodeXml(part[1])).join("");
      value = text;
    } else {
      const raw = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1];
      if (raw == null) continue;
      if (type === "s") value = shared[Number(raw)] ?? "";
      else if (type === "b") value = raw === "1";
      else if (type === "str") value = decodeXml(raw);
      else {
        const numeric = Number(raw);
        value = Number.isFinite(numeric) ? numeric : decodeXml(raw);
      }
    }

    const row = rows.get(rowIndex) || [];
    while (row.length <= colIndex) row.push(null);
    row[colIndex] = value;
    rows.set(rowIndex, row);
  }
  const maxRow = Math.max(-1, ...rows.keys());
  return Array.from({ length: maxRow + 1 }, (_, index) => rows.get(index) || []);
}

export function readXlsx(buffer: Buffer): XlsxSheet[] {
  const entries = readZipEntries(buffer);
  const workbookXml = entries.get("xl/workbook.xml")?.toString("utf8");
  const relsXml = entries.get("xl/_rels/workbook.xml.rels")?.toString("utf8");
  if (!workbookXml || !relsXml) throw new Error("Arquivo XLSX inválido: estrutura do workbook não encontrada.");

  const sharedXml = entries.get("xl/sharedStrings.xml")?.toString("utf8") || "";
  const shared = parseSharedStrings(sharedXml);
  const relMap = new Map<string, string>();
  for (const match of relsXml.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)) {
    const attrs = match[1];
    const id = attrs.match(/\bId="([^"]+)"/)?.[1];
    const target = attrs.match(/\bTarget="([^"]+)"/)?.[1];
    if (id && target) relMap.set(id, target.replace(/^\//, ""));
  }

  const sheets: XlsxSheet[] = [];
  for (const match of workbookXml.matchAll(/<sheet\b([^>]*)\/?\s*>/g)) {
    const attrs = match[1];
    const name = decodeXml(attrs.match(/\bname="([^"]+)"/)?.[1] || "Planilha");
    const rid = attrs.match(/\br:id="([^"]+)"/)?.[1];
    if (!rid) continue;
    const target = relMap.get(rid);
    if (!target) continue;
    const path = target.startsWith("xl/") ? target : `xl/${target}`;
    const xml = entries.get(path)?.toString("utf8");
    if (!xml) continue;
    sheets.push({ name, rows: parseSheet(xml, shared) });
  }
  return sheets;
}
