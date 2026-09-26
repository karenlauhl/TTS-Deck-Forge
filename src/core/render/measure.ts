import type { FontSpec, Measurer } from '../template/types';

export const fontString = (f: FontSpec): string => `${f.style ?? 'normal'} ${f.weight} ${f.sizePx}px ${f.family}`;

/**
 * Canvas-backed measurer with a cache. Call `reset()` after fonts finish loading,
 * since widths measured with a fallback font are wrong.
 */
export function createCanvasMeasurer(): Measurer & { reset(): void } {
  const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(1, 1) : document.createElement('canvas');
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  let cache = new Map<string, number>();
  const measure = ((text: string, font: FontSpec) => {
    const f = fontString(font);
    const key = `${f}\u0000${text}`;
    let w = cache.get(key);
    if (w === undefined) {
      if (ctx.font !== f) ctx.font = f;
      w = ctx.measureText(text).width;
      if (cache.size > 200_000) cache = new Map();
      cache.set(key, w);
    }
    return w;
  }) as Measurer & { reset(): void };
  measure.reset = () => {
    cache = new Map();
  };
  return measure;
}
