import type { Measurer } from '../core/template/types';

/** Monospace fake: every character is 0.5em wide (bold 0.55em). Deterministic for tests. */
export const fakeMeasure: Measurer = (text, font) => Array.from(text).length * font.sizePx * (font.weight >= 700 ? 0.55 : 0.5);
