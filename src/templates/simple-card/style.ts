import type { AssetId, StyleSettings } from '../../core/model/deck';
import { DESIGN_WIDTH, type Size, type StyleOptionDef } from '../../core/template/types';
import { backOption, fontOption, footerOptions } from '../shared/styleOptions';

export const SIZE_PRESETS = {
  poker: { label: 'Poker (2.5 × 3.5 in)', widthIn: 2.5, heightIn: 3.5 },
  bridge: { label: 'Bridge (2.25 × 3.5 in)', widthIn: 2.25, heightIn: 3.5 },
  tarot: { label: 'Tarot (2.75 × 4.75 in)', widthIn: 2.75, heightIn: 4.75 },
  mini: { label: 'Mini (1.75 × 2.5 in)', widthIn: 1.75, heightIn: 2.5 },
  square: { label: 'Square (3.5 × 3.5 in)', widthIn: 3.5, heightIn: 3.5 },
  custom: { label: 'Custom size', widthIn: 0, heightIn: 0 },
} as const;
export type SizePreset = keyof typeof SIZE_PRESETS;

export interface SimpleStyle {
  size: { preset: SizePreset; widthIn: number; heightIn: number };
  imageFit: 'cover' | 'contain';
  colors: { background: string; text: string; accent: string };
  font: AssetId | null;
  footer: { show: boolean; showDeckName: boolean; logo: AssetId | null };
  back: AssetId | null;
}

export const defaultSimpleStyle: SimpleStyle = {
  size: { preset: 'poker', widthIn: 2.5, heightIn: 3.5 },
  imageFit: 'cover',
  colors: { background: '#ffffff', text: '#1d1d1f', accent: '#2f5bd8' },
  font: null,
  footer: { show: false, showDeckName: true, logo: null },
  back: null,
};

export const MIN_IN = 1;
export const MAX_IN = 6;
const clampIn = (n: unknown, fallback: number) => (typeof n === 'number' && Number.isFinite(n) ? Math.min(MAX_IN, Math.max(MIN_IN, n)) : fallback);

/** Size applies in both modes; colours/font/footer/back only in custom mode. */
export function resolveSimpleStyle(style: StyleSettings<SimpleStyle>): SimpleStyle {
  const v = (style.values ?? {}) as Partial<SimpleStyle>;
  const base: SimpleStyle = {
    ...defaultSimpleStyle,
    size: { ...defaultSimpleStyle.size, ...v.size },
    imageFit: v.imageFit === 'contain' ? 'contain' : 'cover',
  };
  if (style.mode !== 'custom') return base;
  return {
    ...base,
    colors: { ...defaultSimpleStyle.colors, ...v.colors },
    font: v.font ?? null,
    footer: { ...defaultSimpleStyle.footer, ...v.footer },
    back: v.back ?? null,
  };
}

export function simpleCardSize(style: StyleSettings<SimpleStyle>): Size {
  const { size } = resolveSimpleStyle(style);
  const preset = SIZE_PRESETS[size.preset] ?? SIZE_PRESETS.poker;
  const w = size.preset === 'custom' ? clampIn(size.widthIn, 2.5) : preset.widthIn;
  const h = size.preset === 'custom' ? clampIn(size.heightIn, 3.5) : preset.heightIn;
  return { width: DESIGN_WIDTH, height: Math.round((DESIGN_WIDTH * h) / w) };
}

const isCustomSize = (v: Record<string, unknown>) => (v.size as { preset?: string } | undefined)?.preset === 'custom';

export const simpleStyleOptions: StyleOptionDef[] = [
  {
    type: 'select',
    key: 'size.preset',
    label: 'Card size',
    group: 'Card',
    options: Object.entries(SIZE_PRESETS).map(([value, p]) => ({ value, label: p.label })),
  },
  { type: 'number', key: 'size.widthIn', label: 'Width', unit: 'in', min: MIN_IN, max: MAX_IN, step: 0.05, group: 'Card', visibleWhen: isCustomSize },
  { type: 'number', key: 'size.heightIn', label: 'Height', unit: 'in', min: MIN_IN, max: MAX_IN, step: 0.05, group: 'Card', visibleWhen: isCustomSize },
  {
    type: 'select',
    key: 'imageFit',
    label: 'Image fit',
    group: 'Card',
    options: [
      { value: 'cover', label: 'Fill the image area (crop edges)' },
      { value: 'contain', label: 'Show the whole image' },
    ],
  },
  { type: 'color', key: 'colors.background', label: 'Background', group: 'Colours', customOnly: true },
  { type: 'color', key: 'colors.text', label: 'Text', group: 'Colours', customOnly: true },
  { type: 'color', key: 'colors.accent', label: 'Accent (title rule, back)', group: 'Colours', customOnly: true },
  fontOption(),
  ...footerOptions(),
  backOption('back', 'Card back'),
];
