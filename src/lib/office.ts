/**
 * Извлечение текста из .docx и .xlsx без внешних зависимостей.
 *
 * Оба формата — обычные ZIP-архивы с XML внутри (OOXML), а распаковать deflate
 * умеет встроенный zlib. Поэтому вместо mammoth/xlsx (десятки мегабайт в
 * серверлесс-бандле ради «достать строки») читаем архив сами: нам нужен не
 * рендер документа, а плоский текст для индекса и модели.
 *
 * Осознанные упрощения: формулы не вычисляются (берётся закэшированное
 * значение), форматирование, картинки и подписи отбрасываются, из книги Excel
 * читаются все листы подряд.
 */

import { inflateRawSync } from "node:zlib";

/* ---- минимальный ZIP-ридер --------------------------------------------- */

/** Смещение и размер одного файла внутри архива. */
interface ZipEntry {
  name: string;
  offset: number;
  compressed: number;
  size: number;
  method: number;
}

const EOCD_SIG = 0x06054b50;
const CEN_SIG = 0x02014b50;

/**
 * Читаем central directory с конца файла. Комментарий архива может быть до 64K,
 * поэтому сигнатуру ищем в хвосте, а не по фиксированному смещению.
 */
function readCentralDirectory(buf: Buffer): ZipEntry[] {
  const maxComment = Math.min(buf.length, 0xffff + 22);
  let eocd = -1;
  for (let i = buf.length - 22; i >= buf.length - maxComment; i--) {
    if (i >= 0 && buf.readUInt32LE(i) === EOCD_SIG) { eocd = i; break; }
  }
  if (eocd === -1) throw new Error("не ZIP-архив");

  const count = buf.readUInt16LE(eocd + 10);
  let ptr = buf.readUInt32LE(eocd + 16);
  const entries: ZipEntry[] = [];

  for (let i = 0; i < count && ptr + 46 <= buf.length; i++) {
    if (buf.readUInt32LE(ptr) !== CEN_SIG) break;
    const method = buf.readUInt16LE(ptr + 10);
    const compressed = buf.readUInt32LE(ptr + 20);
    const size = buf.readUInt32LE(ptr + 24);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localOffset = buf.readUInt32LE(ptr + 42);
    const name = buf.toString("utf8", ptr + 46, ptr + 46 + nameLen);
    entries.push({ name, offset: localOffset, compressed, size, method });
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/** Распаковать одну запись. Локальный заголовок несёт свои длины полей. */
function readEntry(buf: Buffer, entry: ZipEntry): string {
  const nameLen = buf.readUInt16LE(entry.offset + 26);
  const extraLen = buf.readUInt16LE(entry.offset + 28);
  const start = entry.offset + 30 + nameLen + extraLen;
  const raw = buf.subarray(start, start + entry.compressed);
  // 0 — stored, 8 — deflate. Другого в OOXML не встречается.
  if (entry.method === 0) return raw.toString("utf8");
  if (entry.method === 8) return inflateRawSync(raw).toString("utf8");
  throw new Error(`неподдерживаемый метод сжатия ${entry.method}`);
}

function entryText(buf: Buffer, entries: ZipEntry[], name: string): string {
  const found = entries.find((e) => e.name === name);
  return found ? readEntry(buf, found) : "";
}

/* ---- XML → текст -------------------------------------------------------- */

const XML_ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'",
};

function decodeXml(s: string): string {
  return s
    .replace(/&(amp|lt|gt|quot|apos);/g, (m) => XML_ENTITIES[m])
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/** Все <t>…</t> подряд — базовый носитель текста и в Word, и в Excel. */
function collectTags(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "g");
  const out: string[] = [];
  for (let m = re.exec(xml); m; m = re.exec(xml)) out.push(decodeXml(m[1]));
  return out;
}

/* ---- .docx -------------------------------------------------------------- */

export function docxToText(buf: Buffer): string {
  const entries = readCentralDirectory(buf);
  const xml = entryText(buf, entries, "word/document.xml");
  if (!xml) return "";

  return (
    xml
      // Границы абзацев и переносы должны пережить вырезание тегов.
      .replace(/<\/w:p>/g, "\n")
      .replace(/<w:br\s*\/?>/g, "\n")
      .replace(/<w:tab\s*\/?>/g, "\t")
      // Ячейки таблиц разделяем табом, строки — переводом строки.
      .replace(/<\/w:tc>/g, "\t")
      .replace(/<\/w:tr>/g, "\n")
      .replace(/<[^>]+>/g, "")
      // Внутри ячейки лежит свой <w:p>, поэтому перед табом остаётся перевод
      // строки — иначе таблица развалилась бы по строкам на каждую ячейку.
      .replace(/\n+\t/g, "\t")
      .split("\n")
      // Схлопываем только пробелы: табы несут структуру таблицы.
      .map((l) => decodeXml(l).replace(/ {2,}/g, " ").replace(/\t+$/, "").trim())
      .filter(Boolean)
      .join("\n")
  );
}

/* ---- .xlsx -------------------------------------------------------------- */

/** Строки в xlsx вынесены в общую таблицу, ячейка ссылается на индекс. */
function sharedStrings(buf: Buffer, entries: ZipEntry[]): string[] {
  const xml = entryText(buf, entries, "xl/sharedStrings.xml");
  if (!xml) return [];
  // Одна <si> может содержать несколько <t> (форматированные куски) — склеиваем.
  return collectTags(xml, "si").map((si) =>
    /<t[\s>]/.test(si) ? collectTags(si, "t").join("") : decodeXml(si.replace(/<[^>]+>/g, "")),
  );
}

function sheetToText(xml: string, strings: string[], maxRows: number): string {
  const rows: string[] = [];
  for (const row of collectTags(xml, "row")) {
    if (rows.length >= maxRows) break;
    const cells: string[] = [];
    const cellRe = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
    for (let m = cellRe.exec(row); m; m = cellRe.exec(row)) {
      const attrs = m[1];
      const body = m[2];
      const value = collectTags(body, "v")[0] ?? "";
      if (/t="s"/.test(attrs)) {
        // Ссылка на общую таблицу строк.
        cells.push(strings[Number(value)] ?? "");
      } else if (/t="inlineStr"/.test(attrs)) {
        cells.push(collectTags(body, "t").join(""));
      } else {
        cells.push(value);
      }
    }
    const line = cells.join("\t").trim();
    if (line) rows.push(line);
  }
  return rows.join("\n");
}

export function xlsxToText(buf: Buffer, maxRowsPerSheet = 200): string {
  const entries = readCentralDirectory(buf);
  const strings = sharedStrings(buf, entries);
  const sheets = entries
    .filter((e) => /^xl\/worksheets\/sheet\d*\.xml$/.test(e.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  const parts: string[] = [];
  for (const sheet of sheets) {
    const text = sheetToText(readEntry(buf, sheet), strings, maxRowsPerSheet);
    if (text) parts.push(sheets.length > 1 ? `# ${sheet.name.replace(/^xl\/worksheets\//, "")}\n${text}` : text);
  }
  return parts.join("\n\n");
}

/* ---- .pdf --------------------------------------------------------------- */

/**
 * PDF, в отличие от OOXML, вручную не разобрать: текст лежит в потоках со
 * своими шрифтовыми кодировками. Поэтому единственная внешняя зависимость —
 * `unpdf` (сборка pdf.js под серверлесс, без canvas и нативных модулей).
 *
 * Сканы-картинки текста не содержат вовсе — вернётся пустая строка, и файл
 * останется в индексе только с метаданными. OCR тут не делаем.
 */
export async function pdfToText(buf: Buffer, maxPages = 50): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text.slice(0, maxPages) : [String(text)];
  return pages
    .map((p) => p.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

/* ---- диспетчер ---------------------------------------------------------- */

export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const PDF_MIME = "application/pdf";
/** Старые бинарные .doc/.xls — другой формат (OLE), не читаем. */
export const BINARY_DOC_MIMES = ["application/msword", "application/vnd.ms-excel"];

export function isDocumentMime(mime: string): boolean {
  return mime === DOCX_MIME || mime === XLSX_MIME || mime === PDF_MIME;
}

/** Текст из бинарного документа; при повреждённом файле — пустая строка. */
export async function documentToText(mime: string, buf: Buffer): Promise<string> {
  try {
    if (mime === DOCX_MIME) return docxToText(buf);
    if (mime === XLSX_MIME) return xlsxToText(buf);
    if (mime === PDF_MIME) return await pdfToText(buf);
  } catch { /* битый файл — пусть будет без текста, чем падение синка */ }
  return "";
}
