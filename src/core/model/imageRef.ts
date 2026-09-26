import type { AssetMap, CardRecord } from './deck';

/** A card image: an uploaded file, a remote URL, or a filename waiting for its upload. */
export type ImageRef = { type: 'asset'; assetId: string } | { type: 'url'; url: string } | { type: 'unresolved'; fileName: string };

export function isImageRef(v: unknown): v is ImageRef {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return (
    (r.type === 'asset' && typeof r.assetId === 'string') ||
    (r.type === 'url' && typeof r.url === 'string') ||
    (r.type === 'unresolved' && typeof r.fileName === 'string')
  );
}

/** "" → null, http(s) → url, anything else → a filename to match against uploads. */
export function parseImageRef(raw: string): ImageRef | null {
  const v = raw.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return { type: 'url', url: v };
  return { type: 'unresolved', fileName: v };
}

/** Case-insensitive basename, so "img/Potion.PNG" matches an upload named "potion.png". */
export const baseName = (path: string): string => path.split(/[\\/]/).pop()!.trim().toLowerCase();

export function findImageAsset(fileName: string, assets: AssetMap): string | undefined {
  const want = baseName(fileName);
  for (const a of assets.values()) if (a.role === 'image' && baseName(a.name) === want) return a.id;
  return undefined;
}

/** Link unresolved image filenames to uploaded images. Returns the same array if nothing changed. */
export function resolveImageRefs<T extends CardRecord>(cards: T[], assets: AssetMap): T[] {
  let changed = false;
  const out = cards.map((c) => {
    const data = c.data as Record<string, unknown>;
    let next: Record<string, unknown> | null = null;
    for (const [k, v] of Object.entries(data)) {
      if (isImageRef(v) && v.type === 'unresolved') {
        const id = findImageAsset(v.fileName, assets);
        if (id) (next ??= { ...data })[k] = { type: 'asset', assetId: id };
      }
    }
    if (!next) return c;
    changed = true;
    return { ...c, data: next };
  });
  return changed ? out : cards;
}

export function imageRefText(ref: ImageRef | null | undefined, assets: AssetMap): string {
  if (!ref) return '';
  if (ref.type === 'url') return ref.url;
  if (ref.type === 'unresolved') return ref.fileName;
  return assets.get(ref.assetId)?.name ?? '';
}
