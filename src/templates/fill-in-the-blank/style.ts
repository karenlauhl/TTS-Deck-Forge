import type { AssetId, StyleSettings } from '../../core/model/deck';
import type { StyleOptionDef } from '../../core/template/types';
import type { FibKind } from './model';

export interface FibStyle {
  colors: Record<FibKind, { background: string; text: string }>;
  /** Uploaded font asset; null = bundled Inter. */
  font: AssetId | null;
  footer: { show: boolean; showDeckName: boolean; logo: AssetId | null };
  /** Uploaded back images; null = generated back. */
  backs: Record<FibKind, AssetId | null>;
}

/** "Classic": white bold sans on black / black on white, minimalist. */
export const classicStyle: FibStyle = {
  colors: {
    black: { background: '#000000', text: '#ffffff' },
    white: { background: '#ffffff', text: '#000000' },
  },
  font: null,
  footer: { show: false, showDeckName: true, logo: null },
  backs: { black: null, white: null },
};

/** Values actually used for drawing: Classic in default mode, merged custom values otherwise. */
export function resolveFibStyle(style: StyleSettings<FibStyle>): FibStyle {
  if (style.mode !== 'custom') return classicStyle;
  const v = (style.values ?? {}) as Partial<FibStyle>;
  return {
    colors: {
      black: { ...classicStyle.colors.black, ...v.colors?.black },
      white: { ...classicStyle.colors.white, ...v.colors?.white },
    },
    font: v.font ?? null,
    footer: { ...classicStyle.footer, ...v.footer },
    backs: { ...classicStyle.backs, ...v.backs },
  };
}

export const fibStyleOptions: StyleOptionDef[] = [];
