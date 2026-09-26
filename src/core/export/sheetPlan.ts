import type { CardRecord, Deck } from '../model/deck';
import { slugify } from '../model/names';
import type { AnyTemplate, Size } from '../template/types';

export const SHEET_COLUMNS = 10;
export const SHEET_ROWS = 7;
/** The 70th slot is TTS's "hidden card" slot, so each sheet holds at most 69 cards. */
export const CARDS_PER_SHEET = SHEET_COLUMNS * SHEET_ROWS - 1;
export const HIDDEN_SLOT = SHEET_COLUMNS * SHEET_ROWS - 1;
export const MAX_SHEET_PX = 4096;

export interface PlannedSheet {
  /** 1-based within its deck. */
  number: number;
  fileName: string;
  /** Cards in slot order; copies are expanded, so one record may appear several times. */
  cards: CardRecord[];
}

export interface PlannedDeck {
  kind: string;
  label: string;
  backFileName: string;
  sheets: PlannedSheet[];
  /** Total cards including copies. */
  cardCount: number;
}

export interface SheetPlan {
  deckName: string;
  baseName: string;
  cell: Size;
  sheet: Size;
  decks: PlannedDeck[];
}

/** Largest cell that keeps a 10×7 sheet within MAX_SHEET_PX in both directions. */
export function cellSize(card: Size, maxPx = MAX_SHEET_PX): Size {
  const scale = Math.min(maxPx / (SHEET_COLUMNS * card.width), maxPx / (SHEET_ROWS * card.height));
  return { width: Math.floor(card.width * scale), height: Math.floor(card.height * scale) };
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Split the deck into TTS decks (one per card kind) and sheets of up to 69 cards.
 * Pure and deterministic: the same deck always yields the same sheets, so URLs hosted
 * after an export can be matched up again later from the deck JSON.
 */
export function planSheets(template: AnyTemplate, deck: Deck): SheetPlan {
  const baseName = slugify(deck.name);
  const cell = cellSize(template.cardSize(deck.style));
  const decks: PlannedDeck[] = [];
  const singleKind = template.kinds.length === 1;

  for (const kind of template.kinds) {
    const expanded = deck.cards.filter((c) => c.kind === kind.id).flatMap((c) => Array<CardRecord>(Math.max(1, c.count)).fill(c));
    if (expanded.length === 0) continue;
    const prefix = singleKind ? baseName : `${baseName}-${slugify(kind.id)}`;
    decks.push({
      kind: kind.id,
      label: kind.label,
      backFileName: `${prefix}-back.png`,
      cardCount: expanded.length,
      sheets: chunk(expanded, CARDS_PER_SHEET).map((cards, i) => ({ number: i + 1, fileName: `${prefix}-sheet-${i + 1}.png`, cards })),
    });
  }

  return {
    deckName: deck.name.trim() || 'Deck',
    baseName,
    cell,
    sheet: { width: cell.width * SHEET_COLUMNS, height: cell.height * SHEET_ROWS },
    decks,
  };
}

/** Top-left pixel of a slot (0-based, row-major from the top-left, as TTS reads it). */
export function slotPosition(slot: number, cell: Size): { x: number; y: number } {
  return { x: (slot % SHEET_COLUMNS) * cell.width, y: Math.floor(slot / SHEET_COLUMNS) * cell.height };
}

export function withExtension(fileName: string, format: 'png' | 'jpeg'): string {
  return format === 'png' ? fileName : fileName.replace(/\.png$/, '.jpg');
}
