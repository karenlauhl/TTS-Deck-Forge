import { DECK_FILE_FORMAT } from '../model/deckFormat';
import { error, warning, type Issue } from '../model/issues';
import type { AnyTemplate, ParseResult } from '../template/types';
import { decodeText, detectFormat } from './detect';
import { mapTable, readCsv, readXlsx } from './table';

export type ImportOutcome =
  | { type: 'cards'; result: ParseResult<unknown> }
  /** A full TTS Deck Forge deck file; the caller loads it via core/deckfile. */
  | { type: 'deck'; value: unknown };

const fail = (file: string, code: Issue['code'], msg: string): ImportOutcome => ({
  type: 'cards',
  result: { cards: [], issues: [error(code, msg, { origin: { type: 'file', file } })] },
});

/** Parse one uploaded file with the current template's importers. Never throws. */
export function importFile(template: AnyTemplate, name: string, bytes: ArrayBuffer | Uint8Array): ImportOutcome {
  const format = detectFormat(name);
  if (!format) return fail(name, 'unsupported-format', 'unsupported file type; use .txt, .csv, .xlsx or .json');

  try {
    if (format === 'xlsx') {
      if (!template.importers.table) return fail(name, 'unsupported-format', `${template.name} cards can't be imported from spreadsheets`);
      const { table, issues, extraSheets } = readXlsx(bytes);
      if (!table) return fail(name, 'empty-file', 'the spreadsheet is empty');
      const result = mapTable(name, table, template.importers.table);
      if (extraSheets.length > 0) {
        result.issues.unshift(
          warning('extra-sheets', `only the first sheet ("${table.sheet}") was read; ignored: ${extraSheets.join(', ')}`, {
            origin: { type: 'file', file: name },
          }),
        );
      }
      result.issues.unshift(...issues);
      return { type: 'cards', result: finish(name, result) };
    }

    const text = decodeText(bytes);
    if (text.trim() === '') return fail(name, 'empty-file', 'the file is empty');

    if (format === 'csv') {
      if (!template.importers.table) return fail(name, 'unsupported-format', `${template.name} cards can't be imported from CSV`);
      const { table, issues } = readCsv(text, name);
      if (!table) return fail(name, 'empty-file', 'the file is empty');
      const result = mapTable(name, table, template.importers.table);
      result.issues.unshift(...issues);
      return { type: 'cards', result: finish(name, result) };
    }

    if (format === 'json') {
      let value: unknown;
      try {
        value = JSON.parse(text);
      } catch (e) {
        return fail(name, 'parse-error', `not valid JSON (${(e as Error).message})`);
      }
      if (value && typeof value === 'object' && (value as { format?: unknown }).format === DECK_FILE_FORMAT) {
        return { type: 'deck', value };
      }
      if (!template.importers.json) return fail(name, 'unsupported-format', `${template.name} cards can't be imported from JSON`);
      return { type: 'cards', result: finish(name, template.importers.json(value, name)) };
    }

    if (!template.importers.txt) return fail(name, 'unsupported-format', `${template.name} cards can't be imported from text files`);
    return { type: 'cards', result: finish(name, template.importers.txt(text, name)) };
  } catch (e) {
    return fail(name, 'parse-error', `could not read the file (${(e as Error).message})`);
  }
}

function finish<T>(file: string, result: ParseResult<T>): ParseResult<T> {
  if (result.cards.length === 0 && !result.issues.some((i) => i.severity === 'error')) {
    result.issues.push(warning('empty-file', 'no cards found', { origin: { type: 'file', file } }));
  }
  return result;
}
