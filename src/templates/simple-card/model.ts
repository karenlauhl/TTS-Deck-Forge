import type { CardRecord } from '../../core/model/deck';
import { isImageRef, parseImageRef, type ImageRef } from '../../core/model/imageRef';
import { error, warning, type Issue } from '../../core/model/issues';

export interface SimpleCard {
  title: string;
  body: string;
  image: ImageRef | null;
}

export const SIMPLE_KINDS = [{ id: 'card', label: 'Card' }] as const;

export const createCard = (): SimpleCard => ({ title: '', body: '', image: null });

const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Trim each line, collapse runs of spaces, allow at most one empty line between paragraphs. */
export function normalizeBody(s: string): string {
  return s
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function normalizeCard(_kind: string, d: SimpleCard): SimpleCard {
  const raw = (d ?? {}) as Partial<SimpleCard> & { image?: unknown };
  let image: ImageRef | null = null;
  if (isImageRef(raw.image)) image = raw.image;
  else if (typeof raw.image === 'string') image = parseImageRef(raw.image);
  return { title: oneLine(String(raw.title ?? '')), body: normalizeBody(String(raw.body ?? '')), image };
}

export function validateCard(card: CardRecord<SimpleCard>): Issue[] {
  const at = { origin: card.origin, cardId: card.id };
  const issues: Issue[] = [];
  if (!card.data.title && !card.data.body && !card.data.image) issues.push(error('missing-field', 'card is empty', { ...at, field: 'title' }));
  if (card.data.image?.type === 'unresolved') {
    issues.push(
      warning('image-unresolved', `image "${card.data.image.fileName}" hasn't been uploaded yet; drop it on the import area`, { ...at, field: 'image' }),
    );
  }
  return issues;
}

export function duplicateKey(card: CardRecord<SimpleCard>): string | null {
  const { title, body } = card.data;
  if (!title && !body) return null;
  return `${title.toLowerCase()}\u0000${body.toLowerCase().replace(/\s+/g, ' ')}`;
}

export const label = (card: CardRecord<SimpleCard>): string => card.data.title || card.data.body.split('\n')[0] || '(image card)';
