/* ---------------------------------------------------------------------------
 * Minimal RFC-4180 CSV parser / serialiser.
 * Handles quoted fields, escaped quotes, embedded commas and newlines, and
 * both LF and CRLF line endings — enough for real spreadsheet exports.
 * ------------------------------------------------------------------------- */

export function parseCSV(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const text = input.replace(/^\uFEFF/, ''); // strip BOM from Excel exports

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') { inQuotes = true; continue; }
    if (ch === ',') { row.push(field); field = ''; continue; }
    if (ch === '\r') continue;
    if (ch === '\n') {
      row.push(field);
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
      field = '';
      continue;
    }
    field += ch;
  }

  row.push(field);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

/** Converts a CSV string into objects keyed by the header row. */
export function csvToObjects(input: string): Record<string, string>[] {
  const rows = parseCSV(input);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (r[i] ?? '').trim(); });
    return obj;
  });
}

const escapeCell = (value: string): string =>
  /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

export function toCSV(headers: string[], rows: (string | number)[][]): string {
  return [
    headers.map((h) => escapeCell(h)).join(','),
    ...rows.map((r) => r.map((c) => escapeCell(String(c))).join(',')),
  ].join('\n');
}

/** Triggers a browser download for generated text content. */
export function downloadFile(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
