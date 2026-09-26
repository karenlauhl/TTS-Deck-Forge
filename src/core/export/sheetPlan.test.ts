import { describe, expect, it } from 'vitest';
import type { CardRecord, Deck } from '../model/deck';
import { template } from '../../templates/fill-in-the-blank';
import { CARDS_PER_SHEET, cellSize, chunk, HIDDEN_SLOT, planSheets, slotPosition } from './sheetPlan';

const card = (kind: string, i: number, count = 1): CardRecord => ({
  id: `${kind}${i}`,
  kind,
  count,
  data: kind === 'black' ? { text: `B${i}`, pick: 1 } : { text: `W${i}` },
  origin: { type: 'manual' },
});
const deck = (cards: CardRecord[], name = 'Office Party!'): Deck => ({
  name,
  templateId: template.id,
  cards,
  style: { mode: 'default', values: template.defaultStyle },
});

describe('cellSize', () => {
  it('keeps poker-size sheets within 4096 px', () => {
    expect(cellSize({ width: 750, height: 1050 })).toEqual({ width: 409, height: 573 });
  });
  it('limits by height for tall cards and by width for wide cards', () => {
    const tall = cellSize({ width: 750, height: 1295 }); // tarot
    expect(tall.height * 7).toBeLessThanOrEqual(4096);
    expect(tall.width * 10).toBeLessThanOrEqual(4096);
    const wide = cellSize({ width: 750, height: 500 });
    expect(wide.width * 10).toBeLessThanOrEqual(4096);
    expect(wide.width).toBe(409);
  });
});

describe('planSheets', () => {
  it('splits at 69 cards per sheet and keeps black and white decks separate', () => {
    const cards = [
      ...Array.from({ length: 150 }, (_, i) => card('black', i)),
      ...Array.from({ length: 69 }, (_, i) => card('white', i)),
    ];
    const plan = planSheets(template, deck(cards));
    expect(plan.baseName).toBe('office-party');
    expect(plan.sheet).toEqual({ width: 4090, height: 4011 });
    expect(plan.decks.map((d) => [d.kind, d.cardCount, d.sheets.map((s) => s.cards.length)])).toEqual([
      ['black', 150, [69, 69, 12]],
      ['white', 69, [69]],
    ]);
    expect(plan.decks[0].sheets.map((s) => s.fileName)).toEqual([
      'office-party-black-sheet-1.png',
      'office-party-black-sheet-2.png',
      'office-party-black-sheet-3.png',
    ]);
    expect(plan.decks[0].backFileName).toBe('office-party-black-back.png');
    // order is preserved across sheets
    expect(plan.decks[0].sheets[1].cards[0].id).toBe('black69');
  });

  it('expands copies into separate slots', () => {
    const plan = planSheets(template, deck([card('white', 0, 3), card('white', 1, 68)]));
    expect(plan.decks).toHaveLength(1);
    expect(plan.decks[0].cardCount).toBe(71);
    expect(plan.decks[0].sheets.map((s) => s.cards.length)).toEqual([69, 2]);
    expect(plan.decks[0].sheets[0].cards.slice(0, 4).map((c) => c.id)).toEqual(['white0', 'white0', 'white0', 'white1']);
  });

  it('omits kinds with no cards and handles an empty deck', () => {
    expect(planSheets(template, deck([])).decks).toEqual([]);
  });

  it('is deterministic', () => {
    const cards = Array.from({ length: 100 }, (_, i) => card(i % 2 ? 'white' : 'black', i));
    expect(planSheets(template, deck(cards))).toEqual(planSheets(template, deck(cards)));
  });
});

describe('slots', () => {
  it('positions slots row-major and reserves slot 70', () => {
    const cell = { width: 10, height: 20 };
    expect(slotPosition(0, cell)).toEqual({ x: 0, y: 0 });
    expect(slotPosition(9, cell)).toEqual({ x: 90, y: 0 });
    expect(slotPosition(10, cell)).toEqual({ x: 0, y: 20 });
    expect(HIDDEN_SLOT).toBe(69);
    expect(slotPosition(HIDDEN_SLOT, cell)).toEqual({ x: 90, y: 120 });
    expect(CARDS_PER_SHEET).toBe(69);
  });
  it('chunks', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});
