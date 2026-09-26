import type { FontSpec, Measurer } from '../template/types';

/** Part of a word: text, or a fixed-width inline box (e.g. a fill-in blank) measured in em. */
export type Piece = { type: 'text'; text: string } | { type: 'box'; widthEm: number };

/** An unbreakable run of pieces. Words are separated by spaces; paragraphs by hard breaks. */
export interface Word {
  pieces: Piece[];
}

export type Paragraph = Word[];

export interface InlineBoxRule {
  pattern: RegExp;
  widthEm: number;
}

/**
 * Split text into paragraphs (on newlines) and words (on whitespace).
 * Matches of `box.pattern` inside a word become inline boxes: "_____." → [box, "."].
 */
export function tokenize(text: string, box?: InlineBoxRule): Paragraph[] {
  return text
    .split(/\r\n|\r|\n/)
    .map((para) =>
      para
        .split(/[ \t]+/)
        .filter(Boolean)
        .map((w) => ({ pieces: splitPieces(w, box) })),
    );
}

function splitPieces(word: string, box?: InlineBoxRule): Piece[] {
  if (!box) return [{ type: 'text', text: word }];
  const re = new RegExp(box.pattern.source, box.pattern.flags.includes('g') ? box.pattern.flags : box.pattern.flags + 'g');
  const out: Piece[] = [];
  let last = 0;
  for (const m of word.matchAll(re)) {
    if (m.index! > last) out.push({ type: 'text', text: word.slice(last, m.index) });
    out.push({ type: 'box', widthEm: box.widthEm });
    last = m.index! + m[0].length;
  }
  if (last < word.length) out.push({ type: 'text', text: word.slice(last) });
  return out;
}

export interface Line {
  words: Word[];
  width: number;
}

export interface FitOptions {
  font: Omit<FontSpec, 'sizePx'>;
  maxWidth: number;
  maxHeight: number;
  maxSize: number;
  minSize: number;
  /** Line height as a multiple of font size. */
  lineHeight: number;
  /** Extra space between paragraphs as a multiple of font size. */
  paragraphGap?: number;
  /** Font-size decrement per attempt (design units). */
  step?: number;
}

export interface FitResult {
  fits: boolean;
  fontSize: number;
  lines: Line[];
  /** Index into `lines` where each paragraph starts (for paragraph gaps). */
  paragraphStarts: number[];
  lineHeightPx: number;
  height: number;
}

export function wordWidth(word: Word, font: FontSpec, measure: Measurer): number {
  let w = 0;
  for (const p of word.pieces) w += p.type === 'text' ? measure(p.text, font) : p.widthEm * font.sizePx;
  return w;
}

/** Break a word that is wider than the line into character chunks that fit. */
function breakWord(word: Word, font: FontSpec, maxWidth: number, measure: Measurer): Word[] {
  const out: Word[] = [];
  let cur: Piece[] = [];
  let curW = 0;
  const push = (p: Piece, w: number) => {
    if (curW + w > maxWidth && cur.length > 0) {
      out.push({ pieces: cur });
      cur = [];
      curW = 0;
    }
    cur.push(p);
    curW += w;
  };
  for (const p of word.pieces) {
    if (p.type === 'box') push(p, p.widthEm * font.sizePx);
    else for (const ch of Array.from(p.text)) push({ type: 'text', text: ch }, measure(ch, font));
  }
  if (cur.length) out.push({ pieces: mergeText(cur) });
  return out.map((w) => ({ pieces: mergeText(w.pieces) }));
}

function mergeText(pieces: Piece[]): Piece[] {
  const out: Piece[] = [];
  for (const p of pieces) {
    const prev = out.at(-1);
    if (p.type === 'text' && prev?.type === 'text') out[out.length - 1] = { type: 'text', text: prev.text + p.text };
    else out.push(p);
  }
  return out;
}

/** Greedy word wrap at one font size. */
export function wrap(paragraphs: Paragraph[], font: FontSpec, maxWidth: number, measure: Measurer): { lines: Line[]; paragraphStarts: number[] } {
  const space = measure(' ', font);
  const lines: Line[] = [];
  const paragraphStarts: number[] = [];
  for (const para of paragraphs) {
    paragraphStarts.push(lines.length);
    let cur: Line = { words: [], width: 0 };
    const words = para.flatMap((w) => (wordWidth(w, font, measure) > maxWidth ? breakWord(w, font, maxWidth, measure) : [w]));
    for (const w of words) {
      const ww = wordWidth(w, font, measure);
      const next = cur.words.length === 0 ? ww : cur.width + space + ww;
      if (next > maxWidth && cur.words.length > 0) {
        lines.push(cur);
        cur = { words: [w], width: ww };
      } else {
        cur.words.push(w);
        cur.width = next;
      }
    }
    lines.push(cur); // empty paragraphs still take a line
  }
  return { lines, paragraphStarts };
}

export function textHeight(lineCount: number, paragraphCount: number, size: number, o: Pick<FitOptions, 'lineHeight' | 'paragraphGap'>): number {
  if (lineCount === 0) return 0;
  return lineCount * size * o.lineHeight + Math.max(0, paragraphCount - 1) * size * (o.paragraphGap ?? 0);
}

/**
 * Wrap first, then shrink the font until the text fits the box, down to `minSize`.
 * If it never fits, returns the `minSize` layout with `fits: false`.
 */
export function fitText(paragraphs: Paragraph[], o: FitOptions, measure: Measurer): FitResult {
  const step = o.step ?? 1;
  let size = o.maxSize;
  for (;;) {
    const font = { ...o.font, sizePx: size };
    const { lines, paragraphStarts } = wrap(paragraphs, font, o.maxWidth, measure);
    const height = textHeight(lines.length, paragraphs.length, size, o);
    const fits = height <= o.maxHeight && lines.every((l) => l.width <= o.maxWidth + 0.01);
    if (fits || size <= o.minSize) {
      return { fits, fontSize: size, lines, paragraphStarts, lineHeightPx: size * o.lineHeight, height };
    }
    size = Math.max(o.minSize, size - step);
  }
}

/** Plain-text content of a line (boxes rendered as underscores), handy for tests and labels. */
export function lineText(line: Line, boxChar = '_'): string {
  return line.words.map((w) => w.pieces.map((p) => (p.type === 'text' ? p.text : boxChar.repeat(3))).join('')).join(' ');
}
