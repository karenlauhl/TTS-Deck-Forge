import type { AssetId, CardOrigin, CardRecord, StyleSettings } from '../model/deck';
import type { Issue } from '../model/issues';

// ---------- editor fields ----------

export type FieldType = 'text' | 'multiline' | 'number' | 'image';

/** One editable card field. The table UI is generated from these. */
export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  /** Only shown for these kinds (default: all). */
  kinds?: readonly string[];
  required?: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
}

// ---------- style options ----------

interface StyleOptionBase {
  /** Dot path into StyleSettings.values, e.g. `colors.black.background`. */
  key: string;
  label: string;
  group?: string;
  /** Ignored while style mode is 'default'. */
  customOnly?: boolean;
  /** Hide the control unless this returns true. */
  visibleWhen?: (values: Record<string, unknown>) => boolean;
  help?: string;
}

export type StyleOptionDef =
  | (StyleOptionBase & { type: 'color' })
  | (StyleOptionBase & { type: 'font' })
  | (StyleOptionBase & { type: 'image' })
  | (StyleOptionBase & { type: 'boolean' })
  | (StyleOptionBase & { type: 'text' })
  | (StyleOptionBase & { type: 'select'; options: readonly { value: string; label: string }[] })
  | (StyleOptionBase & { type: 'number'; min: number; max: number; step?: number; unit?: string });

// ---------- import ----------

export interface ImportedCard<TData> {
  kind: string;
  data: TData;
  count?: number;
  origin: CardOrigin;
}

export interface ParseResult<TData> {
  cards: ImportedCard<TData>[];
  issues: Issue[];
  deckName?: string;
}

export interface TableColumn {
  /** Canonical, lower-case column name. */
  key: string;
  required: boolean;
  aliases?: readonly string[];
  description: string;
}

export interface RowResult<TData> {
  card?: { kind: string; data: TData; count?: number };
  issues: Issue[];
}

/** Shared by CSV and XLSX. Core reads the file and maps headers; the template maps a row to a card. */
export interface TableMapping<TData> {
  columns: readonly TableColumn[];
  /** `row` is keyed by canonical column key; values are trimmed strings ('' when empty). */
  fromRow(row: Record<string, string>, origin: CardOrigin): RowResult<TData>;
}

export interface TemplateImporters<TData> {
  txt?: (text: string, file: string) => ParseResult<TData>;
  table?: TableMapping<TData>;
  json?: (value: unknown, file: string) => ParseResult<TData>;
}

/** Everything needed for the sample deck and the downloadable per-format template files. */
export interface TemplateSamples<TData> {
  deckName: string;
  cards: readonly { kind: string; data: TData; count?: number }[];
  txt?: string;
  table?: readonly Record<string, string>[];
  json?: unknown;
}

// ---------- rendering ----------

export interface FontSpec {
  family: string;
  weight: number;
  sizePx: number;
  style?: 'normal' | 'italic';
}

/** Width of `text` in design units when set in `font`. */
export type Measurer = (text: string, font: FontSpec) => number;

export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface LayoutEnv {
  measure: Measurer;
  /** CSS font-family for an uploaded font asset, or the bundled default for null. */
  fontFamily(asset: AssetId | null): string;
  deckName: string;
}

export interface RenderEnv extends LayoutEnv {
  /** Decoded uploaded image, or undefined if not (yet) available. */
  image(asset: AssetId | null | undefined): CanvasImageSource | undefined;
  /** Decoded CORS-safe remote image, or undefined if not loaded / blocked. */
  remoteImage(url: string): CanvasImageSource | undefined;
}

export interface CardLayoutBase {
  /** False when the text overflows even at the minimum font size. */
  fits: boolean;
}

export interface Size {
  width: number;
  height: number;
}

/** Width of every card in design units. Height follows the card's aspect ratio. */
export const DESIGN_WIDTH = 750;

// ---------- the template ----------

export interface CardTemplate<TData = any, TStyle = any, TLayout extends CardLayoutBase = CardLayoutBase> {
  id: string;
  /** Bump when data/style shape changes, and handle old files in `migrate`. */
  version: number;
  name: string;
  description: string;
  /** Each kind becomes a separate TTS deck with its own back. */
  kinds: readonly { id: string; label: string }[];
  fields: readonly FieldDef[];

  createCard(kind: string): TData;
  /** Trim / canonicalise. Called on import and on every edit. */
  normalize(kind: string, data: TData): TData;
  validate(card: CardRecord<TData>): Issue[];
  /** Cards with equal keys are flagged as duplicates. null = never a duplicate. */
  duplicateKey(card: CardRecord<TData>): string | null;
  /** Short label: table display and TTS card Nickname. */
  label(card: CardRecord<TData>): string;
  /** Optional TTS card Description. */
  ttsDescription?(card: CardRecord<TData>): string;

  importers: TemplateImporters<TData>;
  samples: TemplateSamples<TData>;

  defaultStyle: TStyle;
  styleOptions: readonly StyleOptionDef[];
  /** Card size in design units: width is always DESIGN_WIDTH. */
  cardSize(style: StyleSettings<TStyle>): Size;

  layout(card: CardRecord<TData>, style: StyleSettings<TStyle>, env: LayoutEnv): TLayout;
  /** ctx is scaled so the card occupies (0,0)-(cardSize). */
  drawFace(ctx: Ctx2D, card: CardRecord<TData>, style: StyleSettings<TStyle>, layout: TLayout, env: RenderEnv): void;
  drawBack(ctx: Ctx2D, kind: string, style: StyleSettings<TStyle>, env: RenderEnv): void;

  /** Upgrade card data / style values written by an older template version. */
  migrate?(input: { cards: unknown[]; style: unknown }, fromVersion: number): { cards: unknown[]; style: unknown };
}

export type AnyTemplate = CardTemplate<any, any, any>;
