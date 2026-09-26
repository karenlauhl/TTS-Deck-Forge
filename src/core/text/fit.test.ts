import { describe, expect, it } from 'vitest';
import { fakeMeasure } from '../../test/fakeMeasure';
import { fitText, lineText, tokenize, wrap } from './fit';

const font = { family: 'X', weight: 400 };
const blank = { pattern: /_{3,}/, widthEm: 3 };

describe('tokenize', () => {
  it('splits words and paragraphs, turning blanks into inline boxes glued to punctuation', () => {
    const p = tokenize('Hi _____. ok\nnext', blank);
    expect(p).toHaveLength(2);
    expect(p[0][1].pieces).toEqual([{ type: 'box', widthEm: 3 }, { type: 'text', text: '.' }]);
    expect(p[1]).toEqual([{ pieces: [{ type: 'text', text: 'next' }] }]);
  });
});

describe('wrap', () => {
  // size 10 → 5 units per char, space = 5
  const f = { ...font, sizePx: 10 };
  it('wraps greedily at the max width', () => {
    const { lines } = wrap(tokenize('aaa bbb ccc'), f, 40, fakeMeasure); // "aaa bbb" = 35
    expect(lines.map((l) => lineText(l))).toEqual(['aaa bbb', 'ccc']);
    expect(lines[0].width).toBe(35);
  });
  it('breaks words longer than a line', () => {
    const { lines } = wrap(tokenize('abcdefghij'), f, 20, fakeMeasure);
    expect(lines.map((l) => lineText(l))).toEqual(['abcd', 'efgh', 'ij']);
  });
  it('measures blanks as em boxes and never splits a blank from its punctuation', () => {
    const { lines } = wrap(tokenize('ab _____.', blank), f, 40, fakeMeasure); // ab=10, space=5, box=30+5 → 50
    expect(lines.map((l) => lineText(l))).toEqual(['ab', '___.']);
  });
  it('keeps hard line breaks and empty paragraphs', () => {
    const r = wrap(tokenize('a\n\nb'), f, 100, fakeMeasure);
    expect(r.lines).toHaveLength(3);
    expect(r.paragraphStarts).toEqual([0, 1, 2]);
  });
});

describe('fitText', () => {
  const base = { font, maxWidth: 100, maxHeight: 40, maxSize: 20, minSize: 8, lineHeight: 1 };

  it('keeps the max size when text fits', () => {
    const r = fitText(tokenize('hello'), base, fakeMeasure);
    expect(r).toMatchObject({ fits: true, fontSize: 20 });
  });

  it('wraps first, then shrinks until it fits', () => {
    // box height 30. At 20 (10/char) it wraps to 2 lines × 20 = 40 > 30, so it must shrink.
    // At 15 (7.5/char) it's still 2 lines, now × 15 = 30, which fits. 16 gives 32, which doesn't.
    const r = fitText(tokenize('aaaa bbbb cccc dddd'), { ...base, maxHeight: 30 }, fakeMeasure);
    expect(r).toMatchObject({ fits: true, fontSize: 15, height: 30 });
    expect(r.lines.map((l) => lineText(l))).toEqual(['aaaa bbbb', 'cccc dddd']);
  });

  it('reports overflow at the minimum size', () => {
    const r = fitText(tokenize('word '.repeat(200)), base, fakeMeasure);
    expect(r).toMatchObject({ fits: false, fontSize: 8 });
  });

  it('counts paragraph gaps in the height', () => {
    const r = fitText(tokenize('a\nb'), { ...base, maxHeight: 100, paragraphGap: 0.5 }, fakeMeasure);
    expect(r.height).toBe(20 * 2 + 10);
  });
});
