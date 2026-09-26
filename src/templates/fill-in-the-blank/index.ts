import type { CardTemplate } from '../../core/template/types';
import { parseJson, parseTxt, tableMapping } from './importers';
import { createCard, duplicateKey, FIB_KINDS, normalizeCard, validateCard, type FibCard } from './model';
import { CARD, drawFibBack, drawFibFace, layoutFib, type FibLayout } from './render';
import { samples } from './samples';
import { classicStyle, fibStyleOptions, type FibStyle } from './style';

export const template: CardTemplate<FibCard, FibStyle, FibLayout> = {
  id: 'fill-in-the-blank',
  version: 1,
  name: 'Fill-in-the-blank party cards',
  description:
    'Cards Against Humanity-style party game: black prompt cards with blanks, white answer cards. Black and white cards export as separate TTS decks.',
  kinds: FIB_KINDS,
  fields: [
    { key: 'text', label: 'Text', type: 'multiline', required: true, placeholder: 'Use ___ for a blank' },
    { key: 'pick', label: 'Pick', type: 'number', kinds: ['black'], min: 1, max: 3 },
  ],
  createCard,
  normalize: normalizeCard,
  validate: validateCard,
  duplicateKey,
  label: (c) => c.data.text,
  importers: { txt: parseTxt, table: tableMapping, json: parseJson },
  samples,
  defaultStyle: classicStyle,
  styleOptions: fibStyleOptions,
  cardSize: () => CARD,
  layout: layoutFib,
  drawFace: drawFibFace,
  drawBack: drawFibBack,
};
