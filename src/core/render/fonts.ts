import type { Asset, AssetId } from '../model/deck';

/** Bundled default font (Inter, SIL OFL), loaded via @fontsource CSS in the app entry. */
export const DEFAULT_FONT_FAMILY = '"Inter", "Helvetica Neue", Arial, sans-serif';

export const assetFontFamily = (id: AssetId): string => `"tdf-${id}", ${DEFAULT_FONT_FAMILY}`;

const registered = new Set<AssetId>();

/** Register an uploaded font file as a FontFace. Throws a readable error for unusable files. */
export async function registerFontAsset(asset: Asset): Promise<void> {
  if (registered.has(asset.id) || typeof FontFace === 'undefined') return;
  const face = new FontFace(`tdf-${asset.id}`, await asset.blob.arrayBuffer());
  try {
    await face.load();
  } catch {
    throw new Error(`"${asset.name}" isn't a font the browser can use (try .ttf, .otf or .woff2)`);
  }
  document.fonts.add(face);
  registered.add(asset.id);
}

/**
 * Make sure every face needed to draw `sampleText` is loaded. @fontsource splits Inter by
 * unicode range, so passing the real card text loads e.g. the latin-ext subset for accents.
 */
export async function ensureFontsLoaded(families: string[], weights: number[], sampleText: string): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  const text = sampleText || 'A';
  await Promise.all(
    families.flatMap((fam) => weights.map((w) => document.fonts.load(`${w} 40px ${fam}`, text).catch(() => []))),
  );
}
