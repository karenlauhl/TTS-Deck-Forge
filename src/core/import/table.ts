import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { CardOrigin } from '../model/deck';
import { error, warning, type Issue } from '../model/issues';
import type { ParseResult, TableColumn, TableMapping } from '../template/types';

/** A raw table: first row is the header. `rowNumbers[i]` is the 1-based spreadsheet row of `rows[i]`. */
export interface RawTable {
  header: string[];
  rows: string[][];
  rowNumbers: number[];
  sheet?: string;
}

export function readCsv(text: string, file: string): { table?: RawTable; issues: Issue[] } {
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false, delimiter: guessDelimiter(text) });
  const issues: Issue[] = [];
  for (const e of parsed.errors) {
    // Papa reports "UndetectableDelimiter" for single-column files; that's fine.
    if (e.code === 'UndetectableDelimiter') continue;
    issues.push(
      error('parse-error', `CSV problem: ${e.message}`, {
        origin: e.row !== undefined ? { type: 'file', file, row: e.row + 1 } : { type: 'file', file },
      }),
    );
  }
  const all = parsed.data;
  if (all.length === 0) return { issues };
  return {
    table: {
      header: all[0].map(String),
      rows: all.slice(1).map((r) => r.map((v) => String(v ?? ''))),
      rowNumbers: all.slice(1).map((_, i) => i + 2),
    },
    issues,
  };
}

/**
 * Guess the delimiter from the header row only. Card text often contains commas,
 * which fools whole-file detection on semicolon-separated (European Excel) files.
 */
export function guessDelimiter(text: string): string {
  const header = text.split(/\r\n|\r|\n/, 1)[0] ?? '';
  const counts = [',', ';', '\t'].map((d) => [d, header.split(d).length - 1] as const);
  const best = counts.reduce((a, b) => (b[1] > a[1] ? b : a));
  return best[1] > 0 ? best[0] : ',';
}

export function isZip(bytes: ArrayBuffer | Uint8Array): boolean {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return b.length > 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
}

export function readXlsx(bytes: ArrayBuffer | Uint8Array): { table?: RawTable; issues: Issue[]; extraSheets: string[] } {
  if (!isZip(bytes)) throw new Error('not a valid .xlsx workbook; re-save it as .xlsx or CSV');
  const wb = XLSX.read(bytes, { type: 'array' });
  const name = wb.SheetNames[0];
  if (!name) return { issues: [], extraSheets: [] };
  const ws = wb.Sheets[name];
  const startRow = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']).s.r + 1 : 1;
  const all = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '', raw: false, blankrows: true });
  const extraSheets = wb.SheetNames.slice(1);
  if (all.length === 0) return { issues: [], extraSheets };
  return {
    table: {
      header: all[0].map((v) => String(v ?? '')),
      rows: all.slice(1).map((r) => r.map((v) => String(v ?? ''))),
      rowNumbers: all.slice(1).map((_, i) => startRow + i + 1),
      sheet: name,
    },
    issues: [],
    extraSheets,
  };
}

/** Column understood for every template: number of copies of the card. */
export const COUNT_COLUMN: TableColumn = {
  key: 'count',
  required: false,
  aliases: ['copies', 'qty', 'quantity'],
  description: 'Number of copies of this card (default 1).',
};

export const MAX_COUNT = 999;

const normHeader = (h: string) => h.trim().toLowerCase().replace(/[\s_-]+/g, '');

/** Parse a copies value. Returns undefined when empty. */
export function parseCount(raw: string | number | undefined | null): { value?: number; problem?: string } {
  if (raw === undefined || raw === null || String(raw).trim() === '') return {};
  const n = Number(String(raw).trim());
  if (!Number.isInteger(n) || n < 1 || n > MAX_COUNT) {
    return { problem: `count "${raw}" must be a whole number from 1 to ${MAX_COUNT}; using 1` };
  }
  return { value: n };
}

/** Map a raw table through a template's column mapping. */
export function mapTable<TData>(file: string, table: RawTable, mapping: TableMapping<TData>): ParseResult<TData> {
  const issues: Issue[] = [];
  const cards: ParseResult<TData>['cards'] = [];
  const columns = mapping.columns.some((c) => c.key === 'count') ? mapping.columns : [...mapping.columns, COUNT_COLUMN];
  const fileOrigin: CardOrigin = { type: 'file', file, row: table.rowNumbers[0] ? table.rowNumbers[0] - 1 : 1, sheet: table.sheet };

  // header → column key
  const colIndex = new Map<string, number>();
  table.header.forEach((h, i) => {
    const n = normHeader(h);
    if (!n) return;
    const col = columns.find((c) => normHeader(c.key) === n || c.aliases?.some((a) => normHeader(a) === n));
    if (!col) {
      issues.push(warning('unknown-column', `column "${h.trim()}" is not used and was ignored`, { origin: fileOrigin }));
    } else if (colIndex.has(col.key)) {
      issues.push(warning('unknown-column', `column "${h.trim()}" duplicates "${col.key}" and was ignored`, { origin: fileOrigin }));
    } else {
      colIndex.set(col.key, i);
    }
  });

  const missing = columns.filter((c) => c.required && !colIndex.has(c.key));
  if (missing.length > 0) {
    const expected = columns.map((c) => c.key).join(', ');
    issues.push(
      error(
        'missing-column',
        `missing required column${missing.length > 1 ? 's' : ''} ${missing.map((c) => `"${c.key}"`).join(', ')}. ` +
          `The first row must be a header row with: ${expected}`,
        { origin: fileOrigin },
      ),
    );
    return { cards, issues };
  }

  table.rows.forEach((raw, i) => {
    const origin: CardOrigin = { type: 'file', file, row: table.rowNumbers[i], sheet: table.sheet };
    const row: Record<string, string> = {};
    for (const c of columns) {
      const idx = colIndex.get(c.key);
      row[c.key] = idx === undefined ? '' : (raw[idx] ?? '').trim();
    }
    if (Object.values(row).every((v) => v === '')) return; // blank row

    const count = parseCount(row.count);
    if (count.problem) issues.push(warning('invalid-value', count.problem, { origin, field: 'count' }));

    const res = mapping.fromRow(row, origin);
    issues.push(...res.issues);
    if (res.card) {
      cards.push({ ...res.card, count: res.card.count ?? count.value, origin });
    }
  });

  return { cards, issues };
}
