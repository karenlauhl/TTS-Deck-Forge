import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { AnyTemplate } from '../template/types';
import type { ImportFormat } from './detect';

export interface SampleFile {
  fileName: string;
  mime: string;
  data: string | Uint8Array;
}

/** Formats the template can offer a downloadable example for. */
export function sampleFormats(template: AnyTemplate): ImportFormat[] {
  const s = template.samples;
  const out: ImportFormat[] = [];
  if (template.importers.txt && s.txt) out.push('txt');
  if (template.importers.table && s.table) out.push('csv', 'xlsx');
  if (template.importers.json && s.json !== undefined) out.push('json');
  return out;
}

export function buildSampleFile(template: AnyTemplate, format: ImportFormat): SampleFile {
  const base = `${template.id}-template`;
  const s = template.samples;
  switch (format) {
    case 'txt':
      return { fileName: `${base}.txt`, mime: 'text/plain', data: s.txt ?? '' };
    case 'json':
      return { fileName: `${base}.json`, mime: 'application/json', data: JSON.stringify(s.json, null, 2) + '\n' };
    case 'csv':
    case 'xlsx': {
      const columns = template.importers.table?.columns.map((c) => c.key) ?? [];
      const rows = (s.table ?? []).map((r) => columns.map((c) => r[c] ?? ''));
      if (format === 'csv') {
        return { fileName: `${base}.csv`, mime: 'text/csv', data: Papa.unparse({ fields: columns, data: rows }) + '\n' };
      }
      const ws = XLSX.utils.aoa_to_sheet([columns, ...rows]);
      ws['!cols'] = columns.map((c) => ({ wch: c === 'text' || c === 'body' ? 60 : 12 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Cards');
      const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
      return {
        fileName: `${base}.xlsx`,
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        data: new Uint8Array(out),
      };
    }
  }
}
