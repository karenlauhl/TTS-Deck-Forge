import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { importFile, type ImportOutcome } from '../../core/import/importFile';
import { buildSampleFile } from '../../core/import/samples';
import { planSheets } from '../../core/export/sheetPlan';
import type { ParseResult } from '../../core/template/types';
import { fakeMeasure } from '../../test/fakeMeasure';
import { template as T } from './index';
import type { SimpleCard } from './model';
import { simpleCardSize } from './style';

const enc = (s: string) => new TextEncoder().encode(s);
const cardsOf = (o: ImportOutcome) => {
  if (o.type !== 'cards') throw new Error('expected cards');
  return o.result as ParseResult<SimpleCard>;
};

describe('simple card TXT', () => {
  it('reads "title | body" lines with optional image and \\n breaks', () => {
    const r = cardsOf(importFile(T, 's.txt', enc('Potion | Heal 3.\\nDiscard.\n\nLantern|Peek  at a card | art/lantern.png\nJust a title\n')));
    expect(r.issues).toEqual([]);
    expect(r.cards.map((c) => [c.data, c.origin])).toEqual([
      [{ title: 'Potion', body: 'Heal 3.\nDiscard.', image: null }, { type: 'file', file: 's.txt', line: 1 }],
      [{ title: 'Lantern', body: 'Peek at a card', image: { type: 'unresolved', fileName: 'art/lantern.png' } }, { type: 'file', file: 's.txt', line: 3 }],
      [{ title: 'Just a title', body: '', image: null }, { type: 'file', file: 's.txt', line: 4 }],
    ]);
  });
  it('skips empty cards with line numbers', () => {
    const r = cardsOf(importFile(T, 's.txt', enc(' | \nok|x\n')));
    expect(r.issues.map((i) => i.message)).toEqual(['s.txt line 1: title and body are both empty; skipped']);
  });
});

describe('simple card CSV/XLSX', () => {
  it('maps title/body/image/count with aliases and keeps line breaks', () => {
    const csv = 'Name,Text,Art,Qty\n"Potion","Heal 3.\nDiscard.",https://x.test/p.png,2\nLantern,,,\n';
    const r = cardsOf(importFile(T, 's.csv', enc(csv)));
    expect(r.issues).toEqual([]);
    expect(r.cards.map((c) => [c.data, c.count])).toEqual([
      [{ title: 'Potion', body: 'Heal 3.\nDiscard.', image: { type: 'url', url: 'https://x.test/p.png' } }, 2],
      [{ title: 'Lantern', body: '', image: null }, undefined],
    ]);
  });
  it('reads XLSX', () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['title', 'body', 'image'], ['A', 'b', 'a.png']]), 'Cards');
    const r = cardsOf(importFile(T, 's.xlsx', new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }))));
    expect(r.cards[0].data).toEqual({ title: 'A', body: 'b', image: { type: 'unresolved', fileName: 'a.png' } });
    expect(r.cards[0].origin).toMatchObject({ row: 2, sheet: 'Cards' });
  });
});

describe('simple card JSON', () => {
  it('accepts an array or { name, cards } with per-item errors', () => {
    const r = cardsOf(importFile(T, 's.json', enc(JSON.stringify({ name: 'Adventure', cards: [{ title: 'A', body: 'b', count: 3 }, 'nope', { title: '', body: '' }, { title: 'C', count: 0 }] }))));
    expect(r.deckName).toBe('Adventure');
    expect(r.cards.map((c) => [c.data.title, c.count])).toEqual([
      ['A', 3],
      ['C', undefined],
    ]);
    expect(r.issues.map((i) => i.message)).toEqual([
      's.json [1]: expected an object with "title" and "body"',
      's.json [2]: title and body are both empty; skipped',
      's.json [3]: count "0" must be a whole number from 1 to 999; using 1',
    ]);
    expect(cardsOf(importFile(T, 's.json', enc('{"x":1}'))).issues[0].code).toBe('parse-error');
  });
});

describe('simple card templates files', () => {
  it('every sample file imports back to the same cards', () => {
    const results = (['txt', 'csv', 'xlsx', 'json'] as const).map((f) => {
      const s = buildSampleFile(T, f);
      const r = cardsOf(importFile(T, s.fileName, typeof s.data === 'string' ? enc(s.data) : s.data));
      expect(r.issues, f).toEqual([]);
      return r.cards.map((c) => c.data);
    });
    for (const r of results.slice(1)) expect(r).toEqual(results[0]);
  });
});

describe('simple card size + layout', () => {
  const style = (size: object, mode: 'default' | 'custom' = 'default') => ({ mode, values: { ...T.defaultStyle, size: { ...T.defaultStyle.size, ...size } } });
  it('defaults to poker ratio and supports presets and custom sizes (in both modes)', () => {
    expect(simpleCardSize(style({}))).toEqual({ width: 750, height: 1050 });
    expect(simpleCardSize(style({ preset: 'square' }))).toEqual({ width: 750, height: 750 });
    expect(simpleCardSize(style({ preset: 'tarot' }))).toEqual({ width: 750, height: 1295 });
    expect(simpleCardSize(style({ preset: 'custom', widthIn: 3, heightIn: 2 }))).toEqual({ width: 750, height: 500 });
    expect(simpleCardSize(style({ preset: 'custom', widthIn: 0, heightIn: 99 }))).toEqual({ width: 750, height: 4500 });
  });

  it('keeps sheets within 4096 px for tall custom cards', () => {
    const deck = { name: 'x', templateId: T.id, cards: [], style: style({ preset: 'tarot' }) };
    const plan = planSheets(T, deck);
    expect(plan.sheet.height).toBeLessThanOrEqual(4096);
    expect(plan.sheet.width).toBeLessThanOrEqual(4096);
  });

  it('flags overflowing body text', () => {
    const env = { measure: fakeMeasure, fontFamily: () => 'X', deckName: 'D' };
    const card = (body: string) => ({ id: 'c', kind: 'card', count: 1, origin: { type: 'manual' as const }, data: { title: 'T', body, image: null } });
    expect(T.layout(card('Short.'), style({}), env).fits).toBe(true);
    expect(T.layout(card('word '.repeat(600)), style({}), env).fits).toBe(false);
  });

  it('warns about unresolved images and uses the body as TTS description', () => {
    const c = { id: 'c', kind: 'card', count: 1, origin: { type: 'manual' as const }, data: { title: 'T', body: 'B', image: { type: 'unresolved' as const, fileName: 'x.png' } } };
    expect(T.validate(c).map((i) => i.code)).toEqual(['image-unresolved']);
    expect(T.ttsDescription!(c)).toBe('B');
    expect(T.label(c)).toBe('T');
  });
});
