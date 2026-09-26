import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { importFile, type ImportOutcome } from '../../core/import/importFile';
import { buildSampleFile } from '../../core/import/samples';
import type { ParseResult } from '../../core/template/types';
import type { FibCard } from './model';
import { fibDataTemplate as T } from './testTemplate';

const enc = (s: string) => new TextEncoder().encode(s);
const cardsOf = (o: ImportOutcome) => {
  if (o.type !== 'cards') throw new Error('expected cards');
  return o.result as ParseResult<FibCard>;
};
const xlsx = (rows: unknown[][], extraSheet = false) => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Cards');
  if (extraSheet) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['x']]), 'Notes');
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
};

describe('TXT import', () => {
  it('reads # BLACK / # WHITE sections, skips blank lines, infers pick', () => {
    const r = cardsOf(importFile(T, 'd.txt', enc('# BLACK\n\n  Why ___?  \n___ and ___.\n# white\nBees.\n\nA llama.\n')));
    expect(r.issues).toEqual([]);
    expect(r.cards.map((c) => [c.kind, c.data, c.origin])).toEqual([
      ['black', { text: 'Why _____?', pick: 1 }, { type: 'file', file: 'd.txt', line: 3 }],
      ['black', { text: '_____ and _____.', pick: 2 }, { type: 'file', file: 'd.txt', line: 4 }],
      ['white', { text: 'Bees.' }, { type: 'file', file: 'd.txt', line: 6 }],
      ['white', { text: 'A llama.' }, { type: 'file', file: 'd.txt', line: 8 }],
    ]);
  });

  it('accepts header variants and CRLF', () => {
    const r = cardsOf(importFile(T, 'd.txt', enc('#Prompts\r\nQ?\r\n# ANSWER CARDS:\r\nA.\r\n')));
    expect(r.cards.map((c) => c.kind)).toEqual(['black', 'white']);
  });

  it('flags lines before any section and mistyped headers with line numbers', () => {
    const r = cardsOf(importFile(T, 'd.txt', enc('orphan\norphan 2\n# BLAK\n# WHITE\nok\n#hashtag card\n')));
    expect(r.cards.map((c) => c.data.text)).toEqual(['ok', '#hashtag card']);
    expect(r.issues.map((i) => i.message)).toEqual([
      'd.txt: lines 1–2 come before any "# BLACK" or "# WHITE" header and were skipped',
      'd.txt line 3: "# BLAK" isn\'t a known section; use "# BLACK" or "# WHITE"',
    ]);
  });

  it('reports empty files', () => {
    expect(cardsOf(importFile(T, 'e.txt', enc('  \n\n'))).issues[0].code).toBe('empty-file');
    expect(cardsOf(importFile(T, 'e.txt', enc('# BLACK\n'))).issues[0].message).toBe('e.txt: no cards found');
  });
});

describe('CSV import', () => {
  it('maps columns case-insensitively with row numbers and optional pick/count', () => {
    const csv = '﻿Type,Text,Pick,Copies\nblack,"Hello, ___",,\nwhite,  Bees.  ,,3\n,,,\nBLACK,___ ___,1,\n';
    const r = cardsOf(importFile(T, 'c.csv', enc(csv)));
    expect(r.cards.map((c) => [c.kind, c.data, c.count, c.origin.type === 'file' && c.origin.row])).toEqual([
      ['black', { text: 'Hello, _____', pick: 1 }, undefined, 2],
      ['white', { text: 'Bees.' }, 3, 3],
      ['black', { text: '_____ _____', pick: 1 }, undefined, 5],
    ]);
    expect(r.issues).toEqual([]);
  });

  it('skips bad rows with clear errors and keeps good ones', () => {
    const csv = 'type,text,pick,notes\npurple,x,,\nblack,,,\nwhite,A,2,\nblack,Q ___,9,\n';
    const r = cardsOf(importFile(T, 'c.csv', enc(csv)));
    expect(r.cards.map((c) => c.data)).toEqual([{ text: 'A' }, { text: 'Q _____', pick: 1 }]);
    expect(r.issues.map((i) => `${i.severity}: ${i.message}`)).toEqual([
      'warning: c.csv row 1: column "notes" is not used and was ignored',
      'error: c.csv row 2: type "purple" must be "black" or "white"',
      'error: c.csv row 3: card text is empty; row skipped',
      'warning: c.csv row 4: pick only applies to black cards; ignored',
      'warning: c.csv row 5: pick "9" must be 1, 2 or 3; working it out from the blanks instead',
    ]);
  });

  it('rejects files missing required columns', () => {
    const r = cardsOf(importFile(T, 'c.csv', enc('card\nhello\n')));
    expect(r.cards).toEqual([]);
    expect(r.issues[0].message).toMatch(/missing required column "type"/);
  });

  it('supports semicolon-delimited CSV (European Excel)', () => {
    const r = cardsOf(importFile(T, 'c.csv', enc('type;text\nwhite;Bees, obviously.\nwhite;Llamas.\n')));
    expect(r.cards.map((c) => c.data.text)).toEqual(['Bees, obviously.', 'Llamas.']);
  });
});

describe('XLSX import', () => {
  it('reads the first sheet with spreadsheet row numbers', () => {
    const bytes = xlsx([['type', 'text', 'pick'], ['black', 'Why ___?', 1], [], ['white', 'Bees.', '']], true);
    const r = cardsOf(importFile(T, 'x.xlsx', bytes));
    expect(r.cards.map((c) => [c.kind, c.data.text, c.origin.type === 'file' && c.origin.row])).toEqual([
      ['black', 'Why _____?', 2],
      ['white', 'Bees.', 4],
    ]);
    expect(r.issues.map((i) => i.code)).toEqual(['extra-sheets']);
  });

  it('reports a corrupt workbook instead of throwing', () => {
    const r = cardsOf(importFile(T, 'x.xlsx', enc('not a zip')));
    expect(r.cards).toEqual([]);
    expect(r.issues[0].severity).toBe('error');
  });
});

describe('JSON import', () => {
  it('reads name, black objects/strings and white strings/objects', () => {
    const json = { name: ' Office ', black: [{ text: 'Why ___?', pick: 1 }, 'A ___ and ___'], white: ['Bees.', { text: 'Llama.' }] };
    const r = cardsOf(importFile(T, 'j.json', enc(JSON.stringify(json))));
    expect(r.deckName).toBe('Office');
    expect(r.cards.map((c) => [c.kind, c.data, c.origin])).toEqual([
      ['black', { text: 'Why _____?', pick: 1 }, { type: 'file', file: 'j.json', path: 'black[0]' }],
      ['black', { text: 'A _____ and _____', pick: 2 }, { type: 'file', file: 'j.json', path: 'black[1]' }],
      ['white', { text: 'Bees.' }, { type: 'file', file: 'j.json', path: 'white[0]' }],
      ['white', { text: 'Llama.' }, { type: 'file', file: 'j.json', path: 'white[1]' }],
    ]);
  });

  it('reports bad JSON, wrong shapes and bad items with paths', () => {
    expect(cardsOf(importFile(T, 'j.json', enc('{nope'))).issues[0].message).toMatch(/^j\.json: not valid JSON/);
    expect(cardsOf(importFile(T, 'j.json', enc('[1,2]'))).issues[0].message).toMatch(/expected an object/);
    const r = cardsOf(importFile(T, 'j.json', enc(JSON.stringify({ black: 'x', white: [1, '  '] }))));
    expect(r.issues.map((i) => i.message)).toEqual([
      'j.json: "black" must be an array',
      'j.json white[0]: expected a string',
      'j.json white[1]: card text is empty; row skipped',
    ]);
  });

  it('hands deck files back to the caller', () => {
    const o = importFile(T, 'deck.json', enc(JSON.stringify({ format: 'tts-deck-forge/deck', cards: [] })));
    expect(o.type).toBe('deck');
  });
});

describe('unsupported files', () => {
  it('rejects unknown extensions', () => {
    expect(cardsOf(importFile(T, 'cards.docx', enc('x'))).issues[0].code).toBe('unsupported-format');
  });
});

describe('downloadable template files', () => {
  it('every sample file imports back cleanly to the same cards', () => {
    const results = (['txt', 'csv', 'xlsx', 'json'] as const).map((f) => {
      const s = buildSampleFile(T, f);
      const bytes = typeof s.data === 'string' ? enc(s.data) : s.data;
      const r = cardsOf(importFile(T, s.fileName, bytes));
      expect(r.issues, f).toEqual([]);
      return r.cards.map((c) => [c.kind, c.data]);
    });
    expect(results[0].length).toBe(16);
    for (const r of results.slice(1)) expect(r).toEqual(results[0]);
  });
});
