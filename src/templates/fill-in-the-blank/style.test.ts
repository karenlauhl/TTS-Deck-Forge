import { describe, expect, it } from 'vitest';
import { classicStyle, fibStyleOptions, resolveFibStyle } from './style';

describe('fill-in-the-blank style', () => {
  const custom = { ...classicStyle, colors: { ...classicStyle.colors, black: { background: '#123456', text: '#abcdef' } }, font: 'a_font' };

  it('uses Classic in default mode even when custom values are stored', () => {
    expect(resolveFibStyle({ mode: 'default', values: custom })).toEqual(classicStyle);
  });
  it('applies custom values in custom mode and fills missing ones from Classic', () => {
    const r = resolveFibStyle({ mode: 'custom', values: { colors: { black: { background: '#123456' } } } as never });
    expect(r.colors.black).toEqual({ background: '#123456', text: '#ffffff' });
    expect(r.colors.white).toEqual(classicStyle.colors.white);
    expect(r.font).toBeNull();
  });
  it('exposes every custom option as customOnly', () => {
    expect(fibStyleOptions.map((o) => o.key)).toEqual([
      'colors.black.background',
      'colors.black.text',
      'colors.white.background',
      'colors.white.text',
      'font',
      'footer.show',
      'footer.showDeckName',
      'footer.logo',
      'backs.black',
      'backs.white',
    ]);
    expect(fibStyleOptions.every((o) => o.customOnly)).toBe(true);
  });
});
