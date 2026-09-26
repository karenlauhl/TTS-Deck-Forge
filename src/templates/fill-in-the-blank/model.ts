import type { CardRecord } from '../../core/model/deck';
import { error, warning, type Issue } from '../../core/model/issues';

export type FibKind = 'black' | 'white';
export const FIB_KINDS = [
  { id: 'black', label: 'Black (prompt)' },
  { id: 'white', label: 'White (answer)' },
] as const;

export interface FibCard {
  text: string;
  /** Black cards only: how many white cards to play. */
  pick?: number;
}

export const BLANK = '_____';
export const MAX_PICK = 3;

/** Trim, collapse whitespace, and turn every run of 3+ underscores into one canonical blank. */
export function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/_{3,}/g, BLANK).trim();
}

export function countBlanks(text: string): number {
  return (normalizeText(text).match(/_{3,}/g) ?? []).length;
}

/** Pick when none was given: one per blank, minimum 1. */
export const inferPick = (text: string): number => Math.max(1, countBlanks(text));

export function isFibKind(v: string): v is FibKind {
  return v === 'black' || v === 'white';
}

const KIND_ALIASES: Record<string, FibKind> = {
  black: 'black',
  b: 'black',
  prompt: 'black',
  question: 'black',
  white: 'white',
  w: 'white',
  answer: 'white',
  response: 'white',
};

export function parseKind(raw: string): FibKind | null {
  return KIND_ALIASES[raw.trim().toLowerCase()] ?? null;
}

/** Parse an explicit pick value. undefined/'' = not given. */
export function parsePick(raw: unknown): { value?: number; problem?: string } {
  if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) return {};
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isInteger(n) || n < 1 || n > MAX_PICK) {
    return { problem: `pick "${String(raw)}" must be 1, 2 or 3; working it out from the blanks instead` };
  }
  return { value: n };
}

export function createCard(kind: string): FibCard {
  return kind === 'black' ? { text: '', pick: 1 } : { text: '' };
}

export function normalizeCard(kind: string, data: FibCard): FibCard {
  const text = normalizeText(String(data.text ?? ''));
  if (kind !== 'black') return { text };
  const pick = Number.isInteger(data.pick) && data.pick! >= 1 ? Math.min(data.pick!, MAX_PICK) : inferPick(text);
  return { text, pick };
}

export function validateCard(card: CardRecord<FibCard>): Issue[] {
  const issues: Issue[] = [];
  const at = { origin: card.origin, cardId: card.id };
  if (!card.data.text) issues.push(error('missing-field', 'card text is empty', { ...at, field: 'text' }));
  if (card.kind === 'black') {
    const blanks = countBlanks(card.data.text);
    const pick = card.data.pick ?? 1;
    if (blanks > 0 && blanks !== pick) {
      issues.push(
        warning('pick-mismatch', `card has ${blanks} blank${blanks > 1 ? 's' : ''} but says PICK ${pick}`, {
          ...at,
          field: 'pick',
        }),
      );
    }
  }
  return issues;
}

export function duplicateKey(card: CardRecord<FibCard>): string | null {
  if (!card.data.text) return null;
  return `${card.kind}:${normalizeText(card.data.text).toLowerCase()}`;
}
