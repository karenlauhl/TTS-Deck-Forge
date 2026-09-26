import type { CardRecord } from '../model/deck';
import { describeOrigin, warning, type Issue } from '../model/issues';
import type { AnyTemplate } from '../template/types';

export interface ValidateOptions {
  /** Returns false when a card's text can't fit even at minimum size. Omit to skip the check. */
  fits?: (card: CardRecord) => boolean;
}

/** Card-level issues, derived from current deck state. */
export function validateCards(template: AnyTemplate, cards: readonly CardRecord[], opts: ValidateOptions = {}): Issue[] {
  const issues: Issue[] = [];
  const firstByKey = new Map<string, CardRecord>();

  for (const card of cards) {
    issues.push(...template.validate(card).map((i) => ({ ...i, cardId: card.id })));

    const key = template.duplicateKey(card);
    if (key !== null) {
      const first = firstByKey.get(key);
      if (first) {
        const firstWhere = describeOrigin(first.origin);
        issues.push(
          warning('duplicate', `duplicate of "${template.label(first)}"${firstWhere ? ` (${firstWhere})` : ''}`, {
            origin: card.origin,
            cardId: card.id,
          }),
        );
      } else {
        firstByKey.set(key, card);
      }
    }

    if (opts.fits && !opts.fits(card)) {
      issues.push(
        warning('overflow', "text doesn't fit on the card even at the smallest font size; shorten it", {
          origin: card.origin,
          cardId: card.id,
        }),
      );
    }
  }
  return issues;
}
