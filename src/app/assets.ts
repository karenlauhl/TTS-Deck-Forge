import type { Asset } from '../core/model/deck';
import { assetIdFor } from '../core/model/ids';
import { registerFontAsset } from '../core/render/fonts';

export const FONT_ACCEPT = '.ttf,.otf,.woff,.woff2';
export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';

const FONT_MIME: Record<string, string> = { ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2' };

/** Turn an uploaded file into an asset, checking the browser can actually use it. */
export async function fileToAsset(file: File, role: Asset['role']): Promise<Asset> {
  const ext = file.name.toLowerCase().split('.').pop() ?? '';
  if (role === 'font' && !FONT_MIME[ext]) throw new Error(`"${file.name}" isn't a font file (.ttf, .otf, .woff or .woff2)`);
  if (role === 'image' && !/^image\//.test(file.type)) throw new Error(`"${file.name}" isn't an image`);
  const mime = role === 'font' ? FONT_MIME[ext] : file.type;
  const blob = new Blob([await file.arrayBuffer()], { type: mime });
  const asset: Asset = { id: await assetIdFor(blob), name: file.name, mime, role, blob };
  if (role === 'font') await registerFontAsset(asset);
  else {
    try {
      (await createImageBitmap(blob)).close();
    } catch {
      throw new Error(`"${file.name}" couldn't be decoded as an image`);
    }
  }
  return asset;
}
