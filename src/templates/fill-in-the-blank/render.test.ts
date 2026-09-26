import { describe, expect, it } from 'vitest';
import { lineText } from '../../core/text/fit';
import { fakeMeasure } from '../../test/fakeMeasure';
import { template } from './index';
import { TEXT_MAX, TEXT_MIN } from './render';

const env = { measure: fakeMeasure, fontFamily: () => 'Inter', deckName: 'Test' };
const style = { mode: 'default' as const, values: template.defaultStyle };
const card = (text: string) => ({ id: 'c', kind: 'black', count: 1, origin: { type: 'manual' as const }, data: { text, pick: 1 } });

describe('fill-in-the-blank layout', () => {
  it('uses the max size for short text', () => {
    expect(template.layout(card('Why?'), style, env)).toMatchObject({ fits: true, fontSize: TEXT_MAX });
  });
  it('shrinks long text and keeps blanks as boxes', () => {
    const l = template.layout(card('A '.repeat(150) + '_____.'), style, env);
    expect(l.fits).toBe(true);
    expect(l.fontSize).toBeLessThan(TEXT_MAX);
    expect(lineText(l.lines.at(-1)!)).toMatch(/___\.$/);
  });
  it('flags text that cannot fit at the minimum size', () => {
    const l = template.layout(card('overflowing '.repeat(120)), style, env);
    expect(l).toMatchObject({ fits: false, fontSize: TEXT_MIN });
  });
});
