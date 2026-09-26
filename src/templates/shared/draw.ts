import { drawImageFit } from '../../core/render/draw';
import { fontString } from '../../core/render/measure';
import type { Ctx2D, RenderEnv } from '../../core/template/types';

/** Small footer: optional logo, then optional deck name, sitting on `baseline`. */
export function drawFooter(
  ctx: Ctx2D,
  env: RenderEnv,
  o: { x: number; baseline: number; maxWidth: number; color: string; family: string; logo: string | null; deckName: boolean; size?: number },
): void {
  const size = o.size ?? 24;
  let x = o.x;
  const logo = env.image(o.logo);
  const LOGO = size * 2;
  if (logo) {
    drawImageFit(ctx, logo, x, o.baseline - LOGO + size * 0.4, LOGO, LOGO, 'contain');
    x += LOGO + size * 0.6;
  }
  if (o.deckName && env.deckName) {
    ctx.font = fontString({ family: o.family, weight: 700, sizePx: size });
    ctx.fillStyle = o.color;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    const room = o.x + o.maxWidth - x;
    if (room > size) ctx.fillText(env.deckName, x, o.baseline - size * 0.15, room);
  }
}
