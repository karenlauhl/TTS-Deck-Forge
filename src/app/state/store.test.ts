import { describe, expect, it } from 'vitest';
import { initialWorkspace, reducer } from './store';

describe('workspace reducer', () => {
  it('applies concurrent style value updates without losing either', () => {
    let ws = initialWorkspace();
    ws = reducer(ws, { type: 'setStyleMode', mode: 'custom' });
    ws = reducer(ws, { type: 'setStyleValue', key: 'footer.logo', value: 'a_logo' });
    ws = reducer(ws, { type: 'setStyleValue', key: 'backs.white', value: 'a_back' });
    const v = ws.deck.style.values as { footer: { logo: string; show: boolean }; backs: { white: string; black: null } };
    expect(v.footer.logo).toBe('a_logo');
    expect(v.footer.show).toBe(false);
    expect(v.backs).toEqual({ black: null, white: 'a_back' });
    // toggling mode keeps the values
    ws = reducer(ws, { type: 'setStyleMode', mode: 'default' });
    expect((ws.deck.style.values as typeof v).backs.white).toBe('a_back');
  });

  it('normalises card data only on commit, so typing spaces works', () => {
    let ws = initialWorkspace();
    ws = reducer(ws, { type: 'addCards', cards: [{ id: 'c', kind: 'white', count: 1, data: { text: '' }, origin: { type: 'manual' } }] });
    ws = reducer(ws, { type: 'updateCard', id: 'c', patch: { data: { text: 'Bees ___ ' } } });
    expect(ws.deck.cards[0].data).toEqual({ text: 'Bees ___ ' });
    ws = reducer(ws, { type: 'normalizeCard', id: 'c' });
    expect(ws.deck.cards[0].data).toEqual({ text: 'Bees _____' });
  });

  it('adopts an imported deck name only for a fresh deck', () => {
    let ws = initialWorkspace();
    ws = reducer(ws, { type: 'addCards', cards: [], deckName: 'Imported' });
    expect(ws.deck.name).toBe('Imported');
    ws = reducer(ws, { type: 'addCards', cards: [], deckName: 'Other' });
    expect(ws.deck.name).toBe('Imported');
  });
});
