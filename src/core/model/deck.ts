export type CardId = string;
export type AssetId = string;

/** Where a card came from, so issues can point at a file and line/row. */
export type CardOrigin =
  | { type: 'file'; file: string; line?: number; row?: number; sheet?: string; path?: string }
  | { type: 'manual' }
  | { type: 'sample' };

export interface CardRecord<TData = unknown> {
  id: CardId;
  /** One of the template's kinds. Each kind becomes its own TTS deck. */
  kind: string;
  /** Template-owned card fields. */
  data: TData;
  /** Copies of this card in the exported deck (>= 1). */
  count: number;
  origin: CardOrigin;
}

/**
 * Style is one bag of values. Options marked `customOnly` are ignored while
 * `mode` is 'default', so toggling back to default never loses custom work.
 */
export interface StyleSettings<TValues = unknown> {
  mode: 'default' | 'custom';
  values: TValues;
}

export interface Deck<TData = unknown, TStyle = unknown> {
  name: string;
  templateId: string;
  cards: CardRecord<TData>[];
  style: StyleSettings<TStyle>;
}

/** An uploaded binary: font, logo, card back or card image. */
export interface Asset {
  id: AssetId;
  /** Original filename; image columns match against it. */
  name: string;
  mime: string;
  role: 'font' | 'image';
  blob: Blob;
}

export type AssetMap = ReadonlyMap<AssetId, Asset>;
