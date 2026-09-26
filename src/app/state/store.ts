import type { Asset, AssetId, CardId, CardRecord, Deck, StyleSettings } from '../../core/model/deck';
import type { Issue } from '../../core/model/issues';
import { getTemplate, listTemplates } from '../../templates';
import { setPath } from '../../core/template/paths';

export interface ImportReport {
  id: string;
  file: string;
  added: number;
  issues: Issue[];
}

export interface Workspace {
  deck: Deck;
  assets: ReadonlyMap<AssetId, Asset>;
  reports: ImportReport[];
}

export type Action =
  | { type: 'load'; deck: Deck; assets: Asset[] }
  | { type: 'setName'; name: string }
  | { type: 'setTemplate'; templateId: string }
  | { type: 'addCards'; cards: CardRecord[]; report?: ImportReport; deckName?: string }
  | { type: 'updateCard'; id: CardId; patch: Partial<Pick<CardRecord, 'kind' | 'data' | 'count'>> }
  | { type: 'normalizeCard'; id: CardId }
  | { type: 'deleteCards'; ids: CardId[] }
  | { type: 'clearCards' }
  | { type: 'setStyle'; style: StyleSettings }
  /** Set one style value by dot path, against the latest state (safe for async uploads). */
  | { type: 'setStyleValue'; key: string; value: unknown }
  | { type: 'setStyleMode'; mode: StyleSettings['mode'] }
  | { type: 'setHostedUrl'; fileName: string; url: string }
  | { type: 'addAssets'; assets: Asset[] }
  | { type: 'addReport'; report: ImportReport }
  | { type: 'dismissReport'; id: string }
  | { type: 'dismissAllReports' };

export const DEFAULT_DECK_NAME = 'My Deck';

export function newDeck(templateId = listTemplates()[0].id): Deck {
  const t = getTemplate(templateId);
  return { name: DEFAULT_DECK_NAME, templateId, cards: [], style: { mode: 'default', values: structuredClone(t.defaultStyle) } };
}

export function initialWorkspace(): Workspace {
  return { deck: newDeck(), assets: new Map(), reports: [] };
}

const mapCards = (ws: Workspace, fn: (cards: CardRecord[]) => CardRecord[]): Workspace => ({
  ...ws,
  deck: { ...ws.deck, cards: fn(ws.deck.cards) },
});

export function reducer(ws: Workspace, a: Action): Workspace {
  switch (a.type) {
    case 'load':
      return { deck: a.deck, assets: new Map(a.assets.map((x) => [x.id, x])), reports: [] };
    case 'setName':
      return { ...ws, deck: { ...ws.deck, name: a.name } };
    case 'setTemplate':
      return { ...ws, deck: { ...newDeck(a.templateId), name: ws.deck.name }, reports: [] };
    case 'addCards': {
      const adoptName = a.deckName && ws.deck.cards.length === 0 && ws.deck.name === DEFAULT_DECK_NAME;
      const next = mapCards(ws, (cards) => [...cards, ...a.cards]);
      return {
        ...next,
        deck: adoptName ? { ...next.deck, name: a.deckName! } : next.deck,
        reports: a.report ? [...ws.reports, a.report] : ws.reports,
      };
    }
    case 'updateCard':
      return mapCards(ws, (cards) =>
        cards.map((c) => {
          if (c.id !== a.id) return c;
          const next = { ...c, ...a.patch };
          // Changing kind may change which fields apply (e.g. pick on black cards).
          if (a.patch.kind && a.patch.kind !== c.kind) next.data = getTemplate(ws.deck.templateId).normalize(next.kind, next.data);
          return next;
        }),
      );
    case 'normalizeCard':
      return mapCards(ws, (cards) =>
        cards.map((c) => (c.id === a.id ? { ...c, data: getTemplate(ws.deck.templateId).normalize(c.kind, c.data) } : c)),
      );
    case 'deleteCards': {
      const ids = new Set(a.ids);
      return mapCards(ws, (cards) => cards.filter((c) => !ids.has(c.id)));
    }
    case 'clearCards':
      return { ...mapCards(ws, () => []), reports: [] };
    case 'setStyle':
      return { ...ws, deck: { ...ws.deck, style: a.style } };
    case 'setStyleValue':
      return { ...ws, deck: { ...ws.deck, style: { ...ws.deck.style, values: setPath(ws.deck.style.values ?? {}, a.key, a.value) } } };
    case 'setStyleMode':
      return { ...ws, deck: { ...ws.deck, style: { ...ws.deck.style, mode: a.mode } } };
    case 'setHostedUrl':
      return { ...ws, deck: { ...ws.deck, hostedUrls: { ...ws.deck.hostedUrls, [a.fileName]: a.url } } };
    case 'addAssets': {
      const assets = new Map(ws.assets);
      for (const x of a.assets) assets.set(x.id, x);
      return { ...ws, assets };
    }
    case 'addReport':
      return { ...ws, reports: [...ws.reports, a.report] };
    case 'dismissReport':
      return { ...ws, reports: ws.reports.filter((r) => r.id !== a.id) };
    case 'dismissAllReports':
      return { ...ws, reports: [] };
  }
}
