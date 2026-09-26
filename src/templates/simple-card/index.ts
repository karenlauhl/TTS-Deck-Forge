import type { CardTemplate } from '../../core/template/types';
import { COUNT_COLUMN } from '../../core/import/table';
import { parseJson, parseTxt, tableMapping } from './importers';
import { createCard, duplicateKey, label, normalizeCard, SIMPLE_KINDS, validateCard, type SimpleCard } from './model';
import { drawSimpleBack, drawSimpleFace, layoutSimple, type SimpleLayout } from './render';
import { samples } from './samples';
import { defaultSimpleStyle, simpleCardSize, simpleStyleOptions, type SimpleStyle } from './style';

export const template: CardTemplate<SimpleCard, SimpleStyle, SimpleLayout> = {
  id: 'simple-card',
  version: 1,
  name: 'Simple cards',
  description: 'General-purpose cards with a title, body text and an optional image. Choose a card size in the Style step.',
  kinds: SIMPLE_KINDS,
  fields: [
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'body', label: 'Body', type: 'multiline' },
    { key: 'image', label: 'Image', type: 'image' },
  ],
  createCard,
  normalize: normalizeCard,
  validate: validateCard,
  duplicateKey,
  label,
  ttsDescription: (c) => c.data.body,
  importers: { txt: parseTxt, table: { ...tableMapping, columns: [...tableMapping.columns, COUNT_COLUMN] }, json: parseJson },
  samples,
  defaultStyle: defaultSimpleStyle,
  styleOptions: simpleStyleOptions,
  cardSize: simpleCardSize,
  layout: layoutSimple,
  drawFace: drawSimpleFace,
  drawBack: drawSimpleBack,
};
