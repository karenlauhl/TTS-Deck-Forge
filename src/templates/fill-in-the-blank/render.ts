import type { CardRecord, StyleSettings } from '../../core/model/deck';
import { drawImageFit, drawLines } from '../../core/render/draw';
import { fontString } from '../../core/render/measure';
import { drawFooter } from '../shared/draw';
import { fitText, tokenize, type FitResult } from '../../core/text/fit';
import type { CardLayoutBase, Ctx2D, LayoutEnv, RenderEnv, Size } from '../../core/template/types';
import type { FibCard, FibKind } from './model';
import { resolveFibStyle, type FibStyle } from './style';

export const CARD: Size = { width: 750, height: 1050 }; // poker 2.5 × 3.5 in
const PAD = 64;
const TOP = 72;
const FOOTER_TOP = CARD.height - 140;
const TEXT_BOX = { x: PAD, y: TOP, width: CARD.width - PAD * 2, height: FOOTER_TOP - TOP - 16 };
const WEIGHT = 700;
export const TEXT_MAX = 62;
export const TEXT_MIN = 26;
const LINE_HEIGHT = 1.22;
const BLANK = { pattern: /_{3,}/, widthEm: 3.2 };
const FOOTER_BASELINE = CARD.height - 72;

export interface FibLayout extends CardLayoutBase, Pick<FitResult, 'fontSize' | 'lines' | 'paragraphStarts' | 'lineHeightPx'> {}

const kindOf = (k: string): FibKind => (k === 'black' ? 'black' : 'white');

export function layoutFib(card: CardRecord<FibCard>, style: StyleSettings<FibStyle>, env: LayoutEnv): FibLayout {
  const s = resolveFibStyle(style);
  const r = fitText(
    tokenize(card.data.text, BLANK),
    {
      font: { family: env.fontFamily(s.font), weight: WEIGHT },
      maxWidth: TEXT_BOX.width,
      maxHeight: TEXT_BOX.height,
      maxSize: TEXT_MAX,
      minSize: TEXT_MIN,
      lineHeight: LINE_HEIGHT,
    },
    env.measure,
  );
  return { fits: r.fits, fontSize: r.fontSize, lines: r.lines, paragraphStarts: r.paragraphStarts, lineHeightPx: r.lineHeightPx };
}

export function drawFibFace(ctx: Ctx2D, card: CardRecord<FibCard>, style: StyleSettings<FibStyle>, layout: FibLayout, env: RenderEnv): void {
  const s = resolveFibStyle(style);
  const colors = s.colors[kindOf(card.kind)];
  const family = env.fontFamily(s.font);

  // Fill the whole card: TTS's card mesh rounds the corners itself.
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, CARD.width, CARD.height);

  drawLines(ctx, layout.lines, {
    x: TEXT_BOX.x,
    y: TEXT_BOX.y,
    font: { family, weight: WEIGHT, sizePx: layout.fontSize },
    color: colors.text,
    lineHeight: layout.lineHeightPx,
    measure: env.measure,
  });

  if (s.footer.show) {
    drawFooter(ctx, env, {
      x: PAD,
      baseline: FOOTER_BASELINE,
      maxWidth: CARD.width - PAD * 2 - 220, // leave room for the PICK badge
      color: colors.text,
      family,
      logo: s.footer.logo,
      deckName: s.footer.showDeckName,
    });
  }

  const pick = card.kind === 'black' ? (card.data.pick ?? 1) : 1;
  if (pick > 1) drawPick(ctx, pick, colors, family);
}

function drawPick(ctx: Ctx2D, pick: number, colors: { background: string; text: string }, family: string) {
  const r = 36;
  const cx = CARD.width - PAD - r;
  const cy = FOOTER_BASELINE - 12;
  ctx.fillStyle = colors.text;
  ctx.font = fontString({ family, weight: 700, sizePx: 36 });
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('PICK', cx - r - 12, cy + 1);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.background;
  ctx.textAlign = 'center';
  ctx.font = fontString({ family, weight: 800, sizePx: 44 });
  ctx.fillText(String(pick), cx, cy + 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

export function drawFibBack(ctx: Ctx2D, kind: string, style: StyleSettings<FibStyle>, env: RenderEnv): void {
  const s = resolveFibStyle(style);
  const k = kindOf(kind);
  const custom = env.image(s.backs[k]);
  if (custom) {
    drawImageFit(ctx, custom, 0, 0, CARD.width, CARD.height, 'cover');
    return;
  }
  const colors = s.colors[k];
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, CARD.width, CARD.height);
  const family = env.fontFamily(s.font);
  const name = env.deckName.trim() || 'Party Cards';
  // One word per line, as large as fits: a bold, simple back.
  const r = fitText(
    tokenize(name.split(/\s+/).join('\n')),
    { font: { family, weight: 800 }, maxWidth: TEXT_BOX.width, maxHeight: CARD.height - TOP * 2, maxSize: 150, minSize: 36, lineHeight: 1.05 },
    env.measure,
  );
  drawLines(ctx, r.lines, {
    x: TEXT_BOX.x,
    y: TOP,
    font: { family, weight: 800, sizePx: r.fontSize },
    color: colors.text,
    lineHeight: r.lineHeightPx,
    measure: env.measure,
  });
}
