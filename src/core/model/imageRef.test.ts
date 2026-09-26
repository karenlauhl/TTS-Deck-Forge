import { describe, expect, it } from 'vitest';
import type { Asset, CardRecord } from './deck';
import { parseImageRef, resolveImageRefs } from './imageRef';

const asset = (id: string, name: string, role: Asset['role'] = 'image'): Asset => ({ id, name, mime: 'image/png', role, blob: new Blob() });

describe('image refs', () => {
  it('parses urls, filenames and empty values', () => {
    expect(parseImageRef(' https://x.test/a.png ')).toEqual({ type: 'url', url: 'https://x.test/a.png' });
    expect(parseImageRef('art/potion.png')).toEqual({ type: 'unresolved', fileName: 'art/potion.png' });
    expect(parseImageRef('  ')).toBeNull();
  });

  it('matches filenames to uploaded images by case-insensitive basename', () => {
    const cards: CardRecord[] = [
      { id: '1', kind: 'card', count: 1, origin: { type: 'manual' }, data: { title: 'a', image: { type: 'unresolved', fileName: 'art/Potion.PNG' } } },
      { id: '2', kind: 'card', count: 1, origin: { type: 'manual' }, data: { title: 'b', image: { type: 'unresolved', fileName: 'missing.png' } } },
    ];
    const assets = new Map([
      ['a1', asset('a1', 'potion.png')],
      ['f1', asset('f1', 'missing.png', 'font')],
    ]);
    const out = resolveImageRefs(cards, assets);
    expect((out[0].data as { image: unknown }).image).toEqual({ type: 'asset', assetId: 'a1' });
    expect(out[1]).toBe(cards[1]);
    expect(resolveImageRefs(out, assets)).toBe(out);
  });
});
