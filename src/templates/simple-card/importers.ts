import type { CardOrigin } from '../../core/model/deck';
import { parseImageRef } from '../../core/model/imageRef';
import { error, warning, type Issue } from '../../core/model/issues';
import { parseCount } from '../../core/import/table';
import type { ImportedCard, ParseResult, TableMapping } from '../../core/template/types';
import { normalizeCard, type SimpleCard } from './model';

function make(title: string, body: string, image: string, origin: CardOrigin, issues: Issue[]): SimpleCard | null {
  const data = normalizeCard('card', { title, body, image: parseImageRef(image) });
  if (!data.title && !data.body && !data.image) {
    issues.push(error('missing-field', 'title and body are both empty; skipped', { origin }));
    return null;
  }
  return data;
}

/** TXT: "title | body" per line (optional third column: image). "\n" in the body becomes a line break. */
export function parseTxt(text: string, file: string): ParseResult<SimpleCard> {
  const cards: ImportedCard<SimpleCard>[] = [];
  const issues: Issue[] = [];
  text.split(/\r\n|\r|\n/).forEach((raw, i) => {
    if (!raw.trim()) return;
    const origin: CardOrigin = { type: 'file', file, line: i + 1 };
    const [title = '', body = '', image = ''] = raw.split('|');
    const data = make(title, body.replace(/\\n/g, '\n'), image, origin, issues);
    if (data) cards.push({ kind: 'card', data, origin });
  });
  return { cards, issues };
}

export const tableMapping: TableMapping<SimpleCard> = {
  columns: [
    { key: 'title', required: true, aliases: ['name', 'heading'], description: 'Card title.' },
    { key: 'body', required: false, aliases: ['text', 'description', 'rules'], description: 'Card text. Line breaks are kept.' },
    { key: 'image', required: false, aliases: ['picture', 'art', 'img'], description: 'Image URL, or the filename of an image you upload.' },
  ],
  fromRow(row, origin) {
    const issues: Issue[] = [];
    const data = make(row.title, row.body, row.image, origin, issues);
    return { card: data ? { kind: 'card', data } : undefined, issues };
  },
};

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');

/** JSON: an array of { title, body, image?, count? }, or { name, cards: [...] }. */
export function parseJson(value: unknown, file: string): ParseResult<SimpleCard> {
  const cards: ImportedCard<SimpleCard>[] = [];
  const issues: Issue[] = [];
  let list: unknown = value;
  let deckName: string | undefined;
  if (isObj(value)) {
    list = value.cards;
    if (typeof value.name === 'string' && value.name.trim()) deckName = value.name.trim();
  }
  if (!Array.isArray(list)) {
    issues.push(error('parse-error', 'expected an array of cards like [{ "title": "...", "body": "..." }]', { origin: { type: 'file', file } }));
    return { cards, issues };
  }
  list.forEach((item, i) => {
    const origin: CardOrigin = { type: 'file', file, path: `[${i}]` };
    if (!isObj(item)) {
      issues.push(error('invalid-value', 'expected an object with "title" and "body"', { origin }));
      return;
    }
    const data = make(str(item.title), str(item.body), str(item.image), origin, issues);
    if (!data) return;
    const count = parseCount(item.count as string | number | undefined);
    if (count.problem) issues.push(warning('invalid-value', count.problem, { origin, field: 'count' }));
    cards.push({ kind: 'card', data, count: count.value, origin });
  });
  return { cards, issues, deckName };
}
