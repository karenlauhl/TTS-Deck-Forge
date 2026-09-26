import type { Deck } from '../model/deck';
import { drawCardBack, drawCardFace, pixelSize } from '../render/renderCard';
import type { AnyTemplate, RenderEnv } from '../template/types';
import { HIDDEN_SLOT, slotPosition, type PlannedDeck, type PlannedSheet, type SheetPlan } from './sheetPlan';

export type ImageFormat = 'png' | 'jpeg';

type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

function makeCanvas(w: number, h: number): AnyCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

async function toBlob(canvas: AnyCanvas, format: ImageFormat): Promise<Blob> {
  const type = format === 'png' ? 'image/png' : 'image/jpeg';
  try {
    if ('convertToBlob' in canvas) return await canvas.convertToBlob({ type, quality: 0.9 });
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('the browser could not encode the image'))), type, 0.9),
    );
  } catch (e) {
    if ((e as Error).name === 'SecurityError') {
      throw new Error('An image from another website blocks being used in exports. Download that image and upload the file instead.');
    }
    throw e;
  }
}

/** Draw one 10×7 sheet. Slot 70 gets the card back (TTS's hidden-card slot). */
export async function renderSheet(
  template: AnyTemplate,
  deck: Deck,
  env: RenderEnv,
  plan: SheetPlan,
  pd: PlannedDeck,
  sheet: PlannedSheet,
  format: ImageFormat,
): Promise<Blob> {
  const canvas = makeCanvas(plan.sheet.width, plan.sheet.height);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  if (format === 'jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, plan.sheet.width, plan.sheet.height);
  }
  const layouts = new Map<string, ReturnType<AnyTemplate['layout']>>();
  sheet.cards.forEach((card, slot) => {
    const { x, y } = slotPosition(slot, plan.cell);
    let layout = layouts.get(card.id);
    if (!layout) layouts.set(card.id, (layout = template.layout(card, deck.style, env)));
    drawCardFace(ctx, template, card, deck.style, env, x, y, plan.cell.width, layout);
  });
  const hidden = slotPosition(HIDDEN_SLOT, plan.cell);
  drawCardBack(ctx, template, pd.kind, deck.style, env, hidden.x, hidden.y, plan.cell.width);
  const blob = await toBlob(canvas, format);
  // Free the ~65 MB backing store promptly.
  canvas.width = canvas.height = 1;
  return blob;
}

/** The back image on its own, at the template's design size. */
export async function renderBack(template: AnyTemplate, deck: Deck, env: RenderEnv, kind: string): Promise<Blob> {
  const size = pixelSize(template, deck.style, template.cardSize(deck.style).width);
  const canvas = makeCanvas(size.width, size.height);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  drawCardBack(ctx, template, kind, deck.style, env, 0, 0, size.width);
  return toBlob(canvas, 'png');
}

/** Small PNG of a single card face, e.g. for the saved-object thumbnail. */
export async function renderCardImage(template: AnyTemplate, deck: Deck, env: RenderEnv, cardIndex: number, width: number): Promise<Blob> {
  const card = deck.cards[cardIndex];
  const size = pixelSize(template, deck.style, width);
  const canvas = makeCanvas(size.width, size.height);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  if (card) drawCardFace(ctx, template, card, deck.style, env, 0, 0, size.width);
  return toBlob(canvas, 'png');
}

export const nextFrame = () => new Promise<void>((r) => setTimeout(r, 0));
