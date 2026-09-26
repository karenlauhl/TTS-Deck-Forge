import type { CardRecord, StyleSettings } from '../model/deck';
import type { AnyTemplate, CardLayoutBase, Ctx2D, RenderEnv } from '../template/types';

/** Draw a card face into a region of a context. The template draws in design units. */
export function drawCardFace(
  ctx: Ctx2D,
  template: AnyTemplate,
  card: CardRecord,
  style: StyleSettings,
  env: RenderEnv,
  x: number,
  y: number,
  width: number,
  layout?: CardLayoutBase,
): CardLayoutBase {
  const size = template.cardSize(style);
  const l = layout ?? template.layout(card, style, env);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(width / size.width, width / size.width);
  ctx.beginPath();
  ctx.rect(0, 0, size.width, size.height);
  ctx.clip();
  template.drawFace(ctx, card, style, l, env);
  ctx.restore();
  return l;
}

export function drawCardBack(ctx: Ctx2D, template: AnyTemplate, kind: string, style: StyleSettings, env: RenderEnv, x: number, y: number, width: number): void {
  const size = template.cardSize(style);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(width / size.width, width / size.width);
  ctx.beginPath();
  ctx.rect(0, 0, size.width, size.height);
  ctx.clip();
  template.drawBack(ctx, kind, style, env);
  ctx.restore();
}

/** Pixel size of a card rendered `width` pixels wide. */
export function pixelSize(template: AnyTemplate, style: StyleSettings, width: number): { width: number; height: number } {
  const s = template.cardSize(style);
  return { width: Math.round(width), height: Math.round((width * s.height) / s.width) };
}
