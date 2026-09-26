import type { Deck } from '../core/model/deck';
import { imageCache } from './hooks/useRender';

function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out));
  return out;
}

/** Start loading every image the deck may draw, then wait for all of them. */
export async function preloadImages(deck: Deck, assetIds: Iterable<string>): Promise<void> {
  const ids = new Set(assetIds);
  for (const s of strings([deck.style.values, deck.cards.map((c) => c.data)])) {
    if (ids.has(s)) imageCache.asset(s);
    else if (/^https?:\/\//i.test(s)) imageCache.remoteImage(s);
  }
  await imageCache.settled();
}
