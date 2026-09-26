import { describe, expect, it } from 'vitest';
import { countBlanks, inferPick, normalizeCard, normalizeText, parsePick, validateCard } from './model';

describe('blank normalisation', () => {
  it('turns any run of 3+ underscores into one canonical blank', () => {
    expect(normalizeText('I love ___ and ________!')).toBe('I love _____ and _____!');
    expect(normalizeText('snake_case and __init__ stay')).toBe('snake_case and __init__ stay');
  });
  it('trims and collapses whitespace', () => {
    expect(normalizeText('  a \t b\n c  ')).toBe('a b c');
  });
  it('counts blanks and infers pick (min 1)', () => {
    expect(countBlanks('___ and ______')).toBe(2);
    expect(inferPick('No blanks here?')).toBe(1);
    expect(inferPick('___ ___ ___')).toBe(3);
  });
});

describe('pick', () => {
  it('parses valid values and rejects others', () => {
    expect(parsePick('2')).toEqual({ value: 2 });
    expect(parsePick(3)).toEqual({ value: 3 });
    expect(parsePick('')).toEqual({});
    expect(parsePick('4').problem).toMatch(/1, 2 or 3/);
    expect(parsePick('1.5').problem).toBeDefined();
  });
  it('normalizeCard infers a missing pick and drops pick from white cards', () => {
    expect(normalizeCard('black', { text: '__ ___ and ___' })).toEqual({ text: '__ _____ and _____', pick: 2 });
    expect(normalizeCard('white', { text: ' Bees ', pick: 2 })).toEqual({ text: 'Bees' });
  });
  it('warns when pick disagrees with the number of blanks', () => {
    const card = { id: 'c', kind: 'black', count: 1, origin: { type: 'manual' as const }, data: { text: '_____ and _____', pick: 1 } };
    expect(validateCard(card).map((i) => i.code)).toEqual(['pick-mismatch']);
    expect(validateCard({ ...card, data: { text: 'Why?', pick: 2 } })).toEqual([]);
  });
});
