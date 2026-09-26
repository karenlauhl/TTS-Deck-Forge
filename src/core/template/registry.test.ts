import { beforeEach, describe, expect, it } from 'vitest';
import { clearTemplates, getTemplate, listTemplates, registerTemplate } from './registry';
import { getPath, setPath } from './paths';
import type { AnyTemplate } from './types';

const fake = (id: string, kinds = [{ id: 'card', label: 'Card' }]) => ({ id, kinds }) as unknown as AnyTemplate;

describe('template registry', () => {
  beforeEach(() => clearTemplates());

  it('registers and looks up templates', () => {
    registerTemplate(fake('a'));
    registerTemplate(fake('b'));
    expect(getTemplate('b').id).toBe('b');
    expect(listTemplates().map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('rejects duplicates, unknown ids and kind-less templates', () => {
    registerTemplate(fake('a'));
    expect(() => registerTemplate(fake('a'))).toThrow(/already registered/);
    expect(() => getTemplate('zzz')).toThrow(/Unknown card template/);
    expect(() => registerTemplate(fake('c', []))).toThrow(/no card kinds/);
  });
});

describe('style paths', () => {
  it('gets and immutably sets nested values', () => {
    const v = { colors: { black: { text: '#fff' } } };
    expect(getPath(v, 'colors.black.text')).toBe('#fff');
    expect(getPath(v, 'colors.white.text')).toBeUndefined();
    const next = setPath(v, 'colors.white.text', '#000');
    expect(getPath(next, 'colors.white.text')).toBe('#000');
    expect(getPath(next, 'colors.black.text')).toBe('#fff');
    expect(v).toEqual({ colors: { black: { text: '#fff' } } });
  });
});
