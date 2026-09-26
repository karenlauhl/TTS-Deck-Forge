import type { Line } from '../text/fit';
import type { Ctx2D, FontSpec } from '../template/types';
import { fontString } from './measure';

/** Draw wrapped lines top-down. Inline boxes are drawn by `drawBox` (default: an underline). */
export function drawLines(
  ctx: Ctx2D,
  lines: Line[],
  opts: {
    x: number;
    y: number;
    font: FontSpec;
    color: string;
    lineHeight: number;
    paragraphStarts?: number[];
    paragraphGap?: number;
    align?: 'left' | 'center';
    maxWidth?: number;
    measure: (t: string, f: FontSpec) => number;
    drawBox?: (x: number, baseline: number, width: number) => void;
  },
): void {
  const { font, lineHeight } = opts;
  ctx.font = fontString(font);
  ctx.fillStyle = opts.color;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const space = opts.measure(' ', font);
  const ascent = font.sizePx * 0.8;
  const gap = (opts.paragraphGap ?? 0) * font.sizePx;
  let y = opts.y + ascent + (lineHeight - font.sizePx) / 2;
  const drawBox =
    opts.drawBox ??
    ((bx: number, baseline: number, w: number) => {
      ctx.fillRect(bx + font.sizePx * 0.05, baseline + font.sizePx * 0.1, w - font.sizePx * 0.1, Math.max(2, font.sizePx * 0.07));
    });

  lines.forEach((line, i) => {
    if (i > 0 && opts.paragraphStarts?.includes(i)) y += gap;
    let x = opts.x;
    if (opts.align === 'center' && opts.maxWidth) x += (opts.maxWidth - line.width) / 2;
    line.words.forEach((word, wi) => {
      if (wi > 0) x += space;
      for (const p of word.pieces) {
        if (p.type === 'text') {
          ctx.fillText(p.text, x, y);
          x += opts.measure(p.text, font);
        } else {
          const w = p.widthEm * font.sizePx;
          drawBox(x, y, w);
          x += w;
        }
      }
    });
    y += lineHeight;
  });
}

export function roundRectPath(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draw an image scaled to cover or fit inside a box. */
export function drawImageFit(ctx: Ctx2D, img: CanvasImageSource, x: number, y: number, w: number, h: number, fit: 'cover' | 'contain'): void {
  const iw = (img as { width: number }).width;
  const ih = (img as { height: number }).height;
  if (!iw || !ih) return;
  const scale = fit === 'cover' ? Math.max(w / iw, h / ih) : Math.min(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}
