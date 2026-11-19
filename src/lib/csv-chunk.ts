/**
 * Client-side CSV helpers for the admin alumni import.
 *
 * The server importer receives one self-contained CSV per request (header +
 * at most 25 data rows). Keeping the parser here mirrors the server's
 * RFC-4180-style parser so row counts and chunk boundaries stay accurate,
 * including quoted fields that contain commas, quotes, or newlines.
 */

export type CsvChunk = { csv: string; rows: number };

export const CSV_IMPORT_LIMITS = {
  minRows: 1,
  maxRows: 1_000,
  rowsPerChunk: 25,
} as const;

function detectDelimiter(firstLine: string): string {
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = 0;
  for (const candidate of candidates) {
    const count = firstLine.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

/** RFC-4180 style parser (BOM, quoted fields, escaped quotes, CRLF). */
function parseCsv(text: string): { rows: string[][]; delimiter: string } {
  const clean = text.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(clean.split(/\r?\n/, 1)[0] ?? "");

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];
    if (inQuotes) {
      if (char === '"') {
        if (clean[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      pushField();
    } else if (char === "\r") {
      if (clean[index + 1] === "\n") index += 1;
      pushRow();
    } else if (char === "\n") {
      pushRow();
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) pushRow();

  return {
    rows: rows.filter((candidate) => candidate.some((cell) => cell.trim() !== "")),
    delimiter,
  };
}

function serializeRow(row: string[], delimiter: string): string {
  return row
    .map((value) => {
      const text = value ?? "";
      return /[",\r\n]/.test(text) || text.includes(delimiter)
        ? `"${text.replace(/"/g, '""')}"`
        : text;
    })
    .join(delimiter);
}

/**
 * Split a CSV file into header-prefixed chunks small enough for a single
 * serverless invocation. Returns an empty chunk list for a header-only file.
 */
export function splitCsvIntoChunks(text: string): {
  chunks: CsvChunk[];
  totalRows: number;
} {
  const { rows, delimiter } = parseCsv(text);
  if (rows.length === 0) return { chunks: [], totalRows: 0 };

  const header = serializeRow(rows[0] ?? [], delimiter);
  const dataRows = rows.slice(1);
  const chunks: CsvChunk[] = [];

  for (let index = 0; index < dataRows.length; index += CSV_IMPORT_LIMITS.rowsPerChunk) {
    const slice = dataRows.slice(index, index + CSV_IMPORT_LIMITS.rowsPerChunk);
    chunks.push({
      csv: [header, ...slice.map((row) => serializeRow(row, delimiter))].join("\r\n") + "\r\n",
      rows: slice.length,
    });
  }

  return { chunks, totalRows: dataRows.length };
}
