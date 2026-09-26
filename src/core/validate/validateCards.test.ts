import { describe, expect, it } from 'vitest';
import { toCardRecords } from '../import/cards';
import { fibDataTemplate as T } from '../../templates/fill-in-the-blank/testTemplate';
import { validateCards } from './validateCards';

describe('validateCards', () => {
  const cards = toCardRecords(T, [
    { kind: 'white', data: { text: 'Bees.' }, origin: { type: 'file', file: 'a.csv', row: 2 } },
    { kind: 'white', data: { text: '  bees. ' }, origin: { type: 'file', file: 'b.txt', line: 7 } },
    { kind: 'black', data: { text: 'Bees.' }, origin: { type: 'manual' } },
    { kind: 'white', data: { text: 'A very long card' }, origin: { type: 'manual' } },
  ]);

  it('flags duplicates within a kind (case/whitespace-insensitive) pointing at the first', () => {
    const issues = validateCards(T, cards);
    expect(issues.map((i) => i.message)).toEqual(['b.txt line 7: duplicate of "Bees." (a.csv row 2)']);
    expect(issues[0].cardId).toBe(cards[1].id);
  });

  it('flags overflow via the injected fit check', () => {
    const issues = validateCards(T, cards, { fits: (c) => (c.data as { text: string }).text.length < 10 });
    expect(issues.filter((i) => i.code === 'overflow').map((i) => i.cardId)).toEqual([cards[3].id]);
  });

  it('assigns ids and defaults count to 1', () => {
    expect(new Set(cards.map((c) => c.id)).size).toBe(4);
    expect(cards.every((c) => c.count === 1)).toBe(true);
  });
});
