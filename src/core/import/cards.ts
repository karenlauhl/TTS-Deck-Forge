import type { CardRecord } from '../model/deck';
import { newCardId } from '../model/ids';
import type { AnyTemplate, ImportedCard } from '../template/types';

/** Turn parsed cards into deck records: assign ids, normalise, default count. */
export function toCardRecords<T>(template: AnyTemplate, imported: readonly ImportedCard<T>[]): CardRecord<T>[] {
  return imported.map((c) => ({
    id: newCardId(),
    kind: c.kind,
    data: template.normalize(c.kind, c.data) as T,
    count: c.count ?? 1,
    origin: c.origin,
  }));
}

/** Total cards in the exported deck, counting copies. */
export const totalCopies = (cards: readonly CardRecord[]): number => cards.reduce((n, c) => n + c.count, 0);
