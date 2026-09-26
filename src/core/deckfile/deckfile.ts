import type { Asset, AssetId, AssetMap, CardRecord, Deck } from '../model/deck';
import { DECK_FILE_FORMAT } from '../model/deckFormat';
import { newCardId } from '../model/ids';
import { error, warning, type Issue } from '../model/issues';
import { getTemplate, hasTemplate } from '../template/registry';
import { MAX_COUNT } from '../import/table';
import { blobToDataUrl, dataUrlToBlob } from './base64';

export const DECK_FILE_VERSION = 1;

/** Serialised deck: content, style and every referenced asset, in one JSON file. */
export interface DeckFile {
  format: typeof DECK_FILE_FORMAT;
  formatVersion: number;
  generator: string;
  template: { id: string; version: number };
  name: string;
  style: { mode: 'default' | 'custom'; values: unknown };
  cards: { id: string; kind: string; count: number; data: unknown }[];
  assets: Record<AssetId, { name: string; mime: string; role: 'font' | 'image'; data: string }>;
  hostedUrls?: Record<string, string>;
}

/** Every string anywhere in a value (used to find referenced asset ids). */
function collectStrings(v: unknown, out: Set<string>): Set<string> {
  if (typeof v === 'string') out.add(v);
  else if (Array.isArray(v)) v.forEach((x) => collectStrings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => collectStrings(x, out));
  return out;
}

export function referencedAssets(deck: Deck, assets: AssetMap): Asset[] {
  const strings = collectStrings([deck.style.values, deck.cards.map((c) => c.data)], new Set());
  return [...assets.values()].filter((a) => strings.has(a.id));
}

export async function serializeDeck(deck: Deck, assets: AssetMap, generator = 'TTS Deck Forge'): Promise<DeckFile> {
  const t = getTemplate(deck.templateId);
  const out: DeckFile['assets'] = {};
  for (const a of referencedAssets(deck, assets)) {
    out[a.id] = { name: a.name, mime: a.mime, role: a.role, data: await blobToDataUrl(a.blob) };
  }
  return {
    format: DECK_FILE_FORMAT,
    formatVersion: DECK_FILE_VERSION,
    generator,
    template: { id: t.id, version: t.version },
    name: deck.name,
    style: { mode: deck.style.mode, values: deck.style.values },
    cards: deck.cards.map((c) => ({ id: c.id, kind: c.kind, count: c.count, data: c.data })),
    assets: out,
    ...(deck.hostedUrls && Object.keys(deck.hostedUrls).length ? { hostedUrls: deck.hostedUrls } : {}),
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export interface ParsedDeckFile {
  deck?: Deck;
  assets: Asset[];
  issues: Issue[];
}

/** Validate and load a deck file. Bad cards are skipped with issues; a bad file returns no deck. */
export function parseDeckFile(value: unknown, file: string): ParsedDeckFile {
  const issues: Issue[] = [];
  const at = { origin: { type: 'file' as const, file } };
  const fail = (msg: string): ParsedDeckFile => ({ assets: [], issues: [error('parse-error', msg, at)] });

  if (!isObj(value) || value.format !== DECK_FILE_FORMAT) return fail('not a TTS Deck Forge deck file');
  if (typeof value.formatVersion !== 'number' || value.formatVersion > DECK_FILE_VERSION) {
    return fail('this deck file was made with a newer version of TTS Deck Forge; reload the page to update');
  }
  const tpl = isObj(value.template) ? value.template : {};
  if (typeof tpl.id !== 'string' || !hasTemplate(tpl.id)) return fail(`unknown card type "${String(tpl.id)}"`);
  const template = getTemplate(tpl.id);
  const tplVersion = typeof tpl.version === 'number' ? tpl.version : 1;
  if (tplVersion > template.version) return fail('this deck file was made with a newer version of TTS Deck Forge; reload the page to update');

  let rawCards: unknown[] = Array.isArray(value.cards) ? value.cards : [];
  let rawStyle: unknown = value.style;
  if (tplVersion < template.version && template.migrate) {
    ({ cards: rawCards, style: rawStyle } = template.migrate({ cards: rawCards, style: rawStyle }, tplVersion));
  }

  const kinds = new Set(template.kinds.map((k) => k.id));
  const cards: CardRecord[] = [];
  const seen = new Set<string>();
  rawCards.forEach((c, i) => {
    const origin = { type: 'file' as const, file, path: `cards[${i}]` };
    if (!isObj(c) || typeof c.kind !== 'string' || !kinds.has(c.kind) || !isObj(c.data)) {
      issues.push(error('invalid-value', 'invalid card; skipped', { origin }));
      return;
    }
    const count = typeof c.count === 'number' && Number.isInteger(c.count) && c.count >= 1 ? Math.min(c.count, MAX_COUNT) : 1;
    const id = typeof c.id === 'string' && c.id && !seen.has(c.id) ? c.id : newCardId();
    seen.add(id);
    cards.push({ id, kind: c.kind, count, data: template.normalize(c.kind, c.data), origin });
  });

  const style = isObj(rawStyle) ? rawStyle : {};
  const values = isObj(style.values) ? { ...structuredClone(template.defaultStyle), ...style.values } : structuredClone(template.defaultStyle);

  const assets: Asset[] = [];
  if (isObj(value.assets)) {
    for (const [id, a] of Object.entries(value.assets)) {
      if (!isObj(a) || typeof a.data !== 'string') {
        issues.push(warning('invalid-value', `asset ${id} is invalid and was skipped`, at));
        continue;
      }
      try {
        const blob = dataUrlToBlob(a.data);
        assets.push({
          id,
          name: typeof a.name === 'string' ? a.name : id,
          mime: typeof a.mime === 'string' ? a.mime : blob.type,
          role: a.role === 'font' ? 'font' : 'image',
          blob,
        });
      } catch {
        issues.push(warning('invalid-value', `asset "${String(a.name ?? id)}" could not be decoded and was skipped`, at));
      }
    }
  }

  const hostedUrls: Record<string, string> = {};
  if (isObj(value.hostedUrls)) for (const [k, v] of Object.entries(value.hostedUrls)) if (typeof v === 'string') hostedUrls[k] = v;

  return {
    deck: {
      name: typeof value.name === 'string' ? value.name : 'Deck',
      templateId: template.id,
      cards,
      style: { mode: style.mode === 'custom' ? 'custom' : 'default', values },
      ...(Object.keys(hostedUrls).length ? { hostedUrls } : {}),
    },
    assets,
    issues,
  };
}

export const deckFileName = (baseName: string) => `${baseName}.deck.json`;
