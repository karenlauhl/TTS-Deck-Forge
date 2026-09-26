import type { CardRecord, StyleSettings } from '../../core/model/deck';
import { drawImageFit, drawLines } from '../../core/render/draw';
import { fitText, tokenize, type FitResult } from '../../core/text/fit';
import type { CardLayoutBase, Ctx2D, LayoutEnv, RenderEnv } from '../../core/template/types';
import { drawFooter } from '../shared/draw';
import type { SimpleCard } from './model';
import { resolveSimpleStyle, simpleCardSize, type SimpleStyle } from './style';

const PAD = 52;
const TITLE = { max: 64, min: 30, lineHeight: 1.15, weight: 800 };
const BODY = { max: 44, min: 20, lineHeight: 1.3, weight: 400, paragraphGap: 0.35 };
const RULE_GAP = 22;
const FOOTER_H = 70;

type Fit = Pick<FitResult, 'fontSize' | 'lines' | 'paragraphStarts' | 'lineHeightPx' | 'height' | 'fits'>;

export interface SimpleLayout extends CardLayoutBase {
  width: number;
  height: number;
  title: Fit | null;
  titleY: number;
  ruleY: number | null;
  image: { x: number; y: number; w: number; h: number } | null;
  body: Fit | null;
  bodyY: number;
}

export function layoutSimple(card: CardRecord<SimpleCard>, style: StyleSettings<SimpleStyle>, env: LayoutEnv): SimpleLayout {
  const s = resolveSimpleStyle(style);
  const { width, height } = simpleCardSize(style);
  const family = env.fontFamily(s.font);
  const inner = width - PAD * 2;
  const bottom = height - PAD - (s.footer.show ? FOOTER_H : 0);
  const { title, body, image } = card.data;

  let y = PAD;
  let titleFit: Fit | null = null;
  let ruleY: number | null = null;
  if (title) {
    titleFit = fitText(
      tokenize(title),
      { font: { family, weight: TITLE.weight }, maxWidth: inner, maxHeight: height * 0.22, maxSize: TITLE.max, minSize: TITLE.min, lineHeight: TITLE.lineHeight },
      env.measure,
    );
    y += titleFit.height + RULE_GAP / 2;
    ruleY = y;
    y += RULE_GAP;
  }
  const titleY = PAD;

  let imageBox: SimpleLayout['image'] = null;
  if (image) {
    const remaining = bottom - y;
    const h = body ? Math.round(remaining * 0.55) : remaining;
    imageBox = { x: PAD, y, w: inner, h };
    y += h + (body ? 24 : 0);
  }

  let bodyFit: Fit | null = null;
  const bodyY = y;
  if (body) {
    bodyFit = fitText(
      tokenize(body),
      {
        font: { family, weight: BODY.weight },
        maxWidth: inner,
        maxHeight: Math.max(0, bottom - y),
        maxSize: image ? BODY.max * 0.85 : BODY.max,
        minSize: BODY.min,
        lineHeight: BODY.lineHeight,
        paragraphGap: BODY.paragraphGap,
      },
      env.measure,
    );
  }

  return {
    fits: (titleFit?.fits ?? true) && (bodyFit?.fits ?? true),
    width,
    height,
    title: titleFit,
    titleY,
    ruleY,
    image: imageBox,
    body: bodyFit,
    bodyY,
  };
}

export function drawSimpleFace(ctx: Ctx2D, card: CardRecord<SimpleCard>, style: StyleSettings<SimpleStyle>, l: SimpleLayout, env: RenderEnv): void {
  const s = resolveSimpleStyle(style);
  const family = env.fontFamily(s.font);
  ctx.fillStyle = s.colors.background;
  ctx.fillRect(0, 0, l.width, l.height);

  if (l.title) {
    drawLines(ctx, l.title.lines, {
      x: PAD,
      y: l.titleY,
      font: { family, weight: TITLE.weight, sizePx: l.title.fontSize },
      color: s.colors.text,
      lineHeight: l.title.lineHeightPx,
      measure: env.measure,
    });
  }
  if (l.ruleY !== null) {
    ctx.fillStyle = s.colors.accent;
    ctx.fillRect(PAD, l.ruleY, l.width - PAD * 2, 5);
  }
  if (l.image) {
    const ref = card.data.image;
    const img = ref?.type === 'asset' ? env.image(ref.assetId) : ref?.type === 'url' ? env.remoteImage(ref.url) : undefined;
    const { x, y, w, h } = l.image;
    if (img) drawImageFit(ctx, img, x, y, w, h, s.imageFit);
    else drawPlaceholder(ctx, x, y, w, h, s.colors.text, family, ref?.type === 'unresolved' ? ref.fileName : 'image');
  }
  if (l.body) {
    drawLines(ctx, l.body.lines, {
      x: PAD,
      y: l.bodyY,
      font: { family, weight: BODY.weight, sizePx: l.body.fontSize },
      color: s.colors.text,
      lineHeight: l.body.lineHeightPx,
      paragraphStarts: l.body.paragraphStarts,
      paragraphGap: BODY.paragraphGap,
      measure: env.measure,
    });
  }
  if (s.footer.show) {
    drawFooter(ctx, env, { x: PAD, baseline: l.height - PAD, maxWidth: l.width - PAD * 2, color: s.colors.text, family, logo: s.footer.logo, deckName: s.footer.showDeckName });
  }
}

function drawPlaceholder(ctx: Ctx2D, x: number, y: number, w: number, h: number, color: string, family: string, text: string) {
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 10]);
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  ctx.setLineDash([]);
  ctx.font = `400 26px ${family}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2, w - 40);
  ctx.restore();
}

export function drawSimpleBack(ctx: Ctx2D, _kind: string, style: StyleSettings<SimpleStyle>, env: RenderEnv): void {
  const s = resolveSimpleStyle(style);
  const { width, height } = simpleCardSize(style);
  const custom = env.image(s.back);
  if (custom) {
    drawImageFit(ctx, custom, 0, 0, width, height, 'cover');
    return;
  }
  ctx.fillStyle = s.colors.accent;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = s.colors.background;
  ctx.lineWidth = 8;
  ctx.strokeRect(PAD * 0.6, PAD * 0.6, width - PAD * 1.2, height - PAD * 1.2);
  const family = env.fontFamily(s.font);
  const name = env.deckName.trim() || 'Deck';
  const inner = width - PAD * 3;
  const r = fitText(tokenize(name), { font: { family, weight: 800 }, maxWidth: inner, maxHeight: height * 0.5, maxSize: 110, minSize: 30, lineHeight: 1.1 }, env.measure);
  drawLines(ctx, r.lines, {
    x: PAD * 1.5,
    y: (height - r.height) / 2,
    font: { family, weight: 800, sizePx: r.fontSize },
    color: s.colors.background,
    lineHeight: r.lineHeightPx,
    align: 'center',
    maxWidth: inner,
    measure: env.measure,
  });
}
