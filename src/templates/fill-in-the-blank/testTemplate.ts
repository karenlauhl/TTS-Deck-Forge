// Test-only: the data half of the template, without rendering.
import type { AnyTemplate } from '../../core/template/types';
import { parseJson, parseTxt, tableMapping } from './importers';
import { createCard, duplicateKey, FIB_KINDS, normalizeCard, validateCard, type FibCard } from './model';
import { samples } from './samples';

export const fibDataTemplate = {
  id: 'fill-in-the-blank',
  name: 'Fill-in-the-blank party cards',
  kinds: FIB_KINDS,
  createCard,
  normalize: normalizeCard,
  validate: validateCard,
  duplicateKey,
  label: (c: { data: FibCard }) => c.data.text,
  importers: { txt: parseTxt, table: tableMapping, json: parseJson },
  samples,
} as unknown as AnyTemplate;
