import type { StyleOptionDef } from '../../core/template/types';

// Reusable style option building blocks. Templates opt in; core knows nothing about them.

export const colorOptions = (prefix: string, label: string, group = 'Colours'): StyleOptionDef[] => [
  { type: 'color', key: `${prefix}.background`, label: `${label} background`, group, customOnly: true },
  { type: 'color', key: `${prefix}.text`, label: `${label} text`, group, customOnly: true },
];

export const fontOption = (key = 'font'): StyleOptionDef => ({
  type: 'font',
  key,
  label: 'Font',
  group: 'Font',
  customOnly: true,
  help: 'Upload a .ttf, .otf or .woff2 file. Only use fonts whose licence allows it. The font is embedded in your deck file.',
});

export const footerOptions = (prefix = 'footer'): StyleOptionDef[] => [
  { type: 'boolean', key: `${prefix}.show`, label: 'Show a footer on card faces', group: 'Footer', customOnly: true },
  {
    type: 'boolean',
    key: `${prefix}.showDeckName`,
    label: 'Deck name in footer',
    group: 'Footer',
    customOnly: true,
    visibleWhen: (v) => get(v, `${prefix}.show`) === true,
  },
  {
    type: 'image',
    key: `${prefix}.logo`,
    label: 'Footer logo / icon',
    group: 'Footer',
    customOnly: true,
    help: 'A small square image works best.',
    visibleWhen: (v) => get(v, `${prefix}.show`) === true,
  },
];

export const backOption = (key: string, label: string): StyleOptionDef => ({
  type: 'image',
  key,
  label,
  group: 'Card backs',
  customOnly: true,
  help: 'Leave empty for a generated back showing the deck name. The image is stretched to cover the card.',
});

function get(v: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), v);
}
