# TTS Deck Forge: architecture and data model (proposal)

Status: **proposal for stage 1 (`feat/data-model`), awaiting approval.**
Nothing in this doc is implemented yet.

---

## 1. Layering rules

Three layers, with imports allowed in one direction only. ESLint (`no-restricted-imports`) enforces this so it doesn't drift:

| Layer | May import | Knows about |
|---|---|---|
| `src/core/` | nothing app-specific | Decks, cards, issues, sheets, TTS. **No React, no specific template.** |
| `src/templates/*` | `core` only | Its own card schema, import mappings, style and drawing. **No React.** |
| `src/app/` | `core`, template registry | React UI. It builds forms from the templates' declarative field and option definitions. |

- **Adding a template means adding a folder.** `src/templates/index.ts` auto-discovers `./*/index.ts` with `import.meta.glob`, so no core file and no registry list needs editing.
- The core and templates don't use React, so everything except drawing pixels runs in Vitest under Node. That covers parsers, validation, text fitting (through an injected measurer), sheet planning and the TTS object.

## 2. File structure

```
.
├── .github/workflows/
│   ├── test.yml                  # typecheck + vitest + build on every PR
│   └── deploy.yml                # build + deploy to GitHub Pages on push to main
├── public/favicon.svg            # original icon — no TTS or CAH marks
├── src/
│   ├── main.tsx
│   ├── app/                      # React UI (only layer that uses React)
│   │   ├── App.tsx               # tabs: Cards · Style · Preview · Export sheets · Build TTS object
│   │   ├── state/                # deck store (useReducer + context), IndexedDB autosave
│   │   ├── cards/                # DropZone, CardTable, CardRowEditor, ImportReport
│   │   ├── style/                # StyleForm, generated from template.styleOptions
│   │   ├── preview/              # CardPreview, SheetPreview
│   │   ├── export/               # SheetExportPanel
│   │   └── tts/                  # TtsObjectBuilder
│   ├── core/                     # template-agnostic, framework-free
│   │   ├── model/                # Deck, CardRecord, StyleSettings, Asset, Issue, id helpers
│   │   ├── template/             # CardTemplate interface + registry
│   │   ├── import/               # format detection, CSV/XLSX → rows, dispatch, merge, sample files
│   │   ├── validate/             # template rules + duplicates + overflow → Issue[]
│   │   ├── text/                 # tokenised word-wrap + shrink-to-fit (measurer injected)
│   │   ├── render/               # canvas factory, font loading, image cache, RenderEnv
│   │   ├── deckfile/             # deck JSON serialise / parse / migrate
│   │   ├── export/               # sheet planning (pure), sheet rendering, zip, README text
│   │   └── tts/                  # URL checks, saved-object generator (pure), thumbnail, README
│   ├── templates/
│   │   ├── index.ts              # import.meta.glob('./*/index.ts') → registry
│   │   ├── shared/               # opt-in building blocks: colour/font/footer/back options, draw helpers
│   │   ├── fill-in-the-blank/
│   │   │   ├── index.ts          # exports the CardTemplate object
│   │   │   ├── model.ts          # data/style types, fields, validation, blank normalisation, pick
│   │   │   ├── importers.ts      # txt / table (CSV+XLSX) / json
│   │   │   ├── style.ts          # "Classic" defaults + option definitions
│   │   │   ├── render.ts         # layout + face/back drawing
│   │   │   ├── samples.ts        # ORIGINAL sample cards only
│   │   │   └── *.test.ts
│   │   └── simple-card/          # same shape
│   └── test/                     # fake measurer, fixtures
├── docs/ARCHITECTURE.md, docs/screenshots/
├── index.html, vite.config.ts, tsconfig*.json, package.json
├── LICENSE                       # MIT
└── README.md
```

Tests sit next to the code they cover (`foo.ts` → `foo.test.ts`).

## 3. Core data model

```ts
// core/model
export type CardId = string;   // 'c_' + random; stable across edits, never shown to users
export type AssetId = string;  // 'a_' + SHA-256 prefix of the bytes → identical uploads dedupe

export interface Deck {
  name: string;                 // TTS nicknames, file names, optional footer text
  templateId: string;           // 'fill-in-the-blank' | 'simple-card' | …
  cards: CardRecord[];          // display order = sheet order (deterministic)
  style: StyleSettings;
}

export interface CardRecord<TData = unknown> {
  id: CardId;
  kind: string;                 // one of template.kinds[].id — each kind becomes its own TTS deck
  data: TData;                  // shape owned by the template
  origin: CardOrigin;           // for error messages ("answers.csv row 14")
}

export type CardOrigin =
  | { type: 'file'; file: string; line?: number; row?: number; sheet?: string; path?: string }
  | { type: 'manual' }
  | { type: 'sample' };

export interface StyleSettings<TValues = Record<string, unknown>> {
  mode: 'default' | 'custom';   // the user's toggle
  values: TValues;              // ALL option values; custom-only ones are ignored in default mode,
}                               // so switching back to default is non-destructive

export interface Asset {        // uploaded font / logo / back / card image
  id: AssetId;
  name: string;                 // original filename — Template 2 matches `image` column against it
  mime: string;
  role: 'font' | 'image';
  blob: Blob;                   // in memory; base64 only when serialised
}
// Assets live in an AssetStore (Map<AssetId, Asset>) beside the Deck, referenced by id from
// style values and card data. Keeps megabytes of base64 out of React state and diffing.

export interface Issue {
  severity: 'error' | 'warning';
  code: IssueCode;              // 'missing-text' | 'bad-pick' | 'duplicate' | 'overflow' | 'unknown-column' | …
  message: string;              // full human sentence
  origin?: CardOrigin;          // file + line/row
  cardId?: CardId;
  field?: string;
}
```

**Issue semantics**
- **Error:** the row can't become a card, e.g. empty text or `type` not black/white. The row is skipped and reported with its file and line/row.
- **Warning:** the card is imported but flagged. This covers duplicates, text that overflows even at the minimum font size, a pick/blank mismatch and an unresolved image.
- **Where issues live:** file-level parse issues belong to an *import report* that the user dismisses. Card-level issues (duplicate, overflow) are **derived** from current state and recomputed as you edit, so they never go stale.
- **Exporting with overflow warnings:** export stays allowed but asks for confirmation. Overflowing text is clipped with an ellipsis at the minimum font size.

**Row numbering:** CSV/XLSX rows are 1-based with the header as row 1, so the first card is row 2. That matches what Excel and Sheets show. TXT uses 1-based line numbers.

## 4. Template interface (fleshed out in stage 2)

```ts
export interface CardTemplate<TData = any, TStyle = any> {
  id: string;
  version: number;                         // bump on data/style shape change
  name: string;
  description: string;
  kinds: readonly { id: string; label: string }[];   // FIB: black, white · Simple: card
  fields: readonly FieldDef[];             // drives table columns + editor; FieldDef.kinds scopes a field

  // data
  createCard(kind: string): TData;
  normalize(kind: string, data: TData): TData;        // trim, collapse whitespace, canonical blanks
  validate(card: CardRecord<TData>): Issue[];         // pure, per-card
  duplicateKey(card: CardRecord<TData>): string | null;
  label(card: CardRecord<TData>): string;             // table display + TTS card Nickname

  // import — core reads files; template only maps content to cards
  importers: {
    txt?:   (text: string, file: string) => ParseResult<TData>;
    table?: TableMapping<TData>;                      // one mapping serves CSV and XLSX
    json?:  (value: unknown, file: string) => ParseResult<TData>;
  };
  samples: TemplateSamples<TData>;                    // sample deck + rows/text/json → downloadable
                                                      // template files, generated by core per format
  // style
  defaultStyle: TStyle;
  styleOptions: readonly StyleOptionDef[];            // declarative: color | font | image | boolean |
                                                      // select | number | text; `customOnly`, `kinds`
  cardSize(style: StyleSettings<TStyle>): { width: number; height: number }; // aspect, design units

  // rendering — layout is separate from drawing so overflow checks are cheap and testable
  layout(card: CardRecord<TData>, style: StyleSettings<TStyle>, measure: Measurer): CardLayout; // { fits, fontSize, … }
  drawFace(ctx: Ctx2D, card: CardRecord<TData>, layout: CardLayout, env: RenderEnv): void;
  drawBack(ctx: Ctx2D, kind: string, style: StyleSettings<TStyle>, env: RenderEnv): void;

  migrate?(data: unknown, fromVersion: number): unknown;   // old deck files keep loading
}

export interface TableMapping<TData> {
  columns: { key: string; required: boolean; aliases?: string[]; description: string }[];
  fromRow(row: Record<string, string>, at: { file: string; row: number; sheet?: string }): RowResult<TData>;
}
export interface ParseResult<TData> {
  cards: { kind: string; data: TData; origin: CardOrigin }[];
  issues: Issue[];
  deckName?: string;
}
export type Measurer = (text: string, font: { family: string; weight: number; sizePx: number }) => number;
```

- **Layout uses fixed design units.** The card is 750 units wide (2.5in at 300dpi) and the height follows the aspect ratio. The preview and the export sheet then just scale the context, so **the preview and the exported sheet wrap identically**. A preview that disagrees with the PNG is the most likely class of bug in this app, so it's designed out up front.
- **Text fitting lives in `core/text` and works on tokens,** not raw strings: words plus fixed-width inline boxes. A FIB blank is one of those boxes (e.g. `_____.` becomes [blank, "."] with no break allowed between them). The fitter wraps first, then steps the font size down until the text fits the box or hits the minimum. In the browser it measures with `canvas.measureText`; tests pass a fake measurer.
- **Fonts must be loaded before layout.** `core/render/fonts.ts` awaits `document.fonts.load(...)` for the bundled Inter and any uploaded `FontFace` first. Otherwise the first render measures with the fallback font and wraps wrongly.

## 5. Template 1: fill-in-the-blank (Cards Against Humanity-style)

```ts
type FibKind = 'black' | 'white';
interface FibCard { text: string; pick?: number }   // pick only meaningful on black

interface FibStyle {
  // customOnly — ignored in "Classic" (default) mode
  colors: Record<FibKind, { background: string; text: string }>;
  font: AssetId | null;                             // null → bundled Inter
  footer: { show: boolean; showDeckName: boolean; logo: AssetId | null };
  backs: Record<FibKind, AssetId | null>;           // null → generated back
}
```

- **Blanks:** at import and edit, every run of 3 or more underscores becomes a canonical `_____`, so the text stays readable in the table and in exports. The renderer draws every blank as the same fixed-width line.
- **Classic:** bundled Inter (OFL). Black cards have white bold text on black; white cards have black text on white. Text is left-aligned in a minimalist layout with rounded corners. Black cards with pick > 1 show "PICK N" bottom-right, and there is no other footer.
- **Generated backs:** deck name in large bold type, white on black for black cards and the inverse for white. No third-party branding.
- **Duplicate key:** kind + lower-cased text with collapsed whitespace and canonical blanks.

## 6. Template 2: simple card

```ts
interface SimpleCard { title: string; body: string; image: ImageRef | null }
type ImageRef =
  | { type: 'asset'; assetId: AssetId }             // uploaded file, or filename matched to one
  | { type: 'url'; url: string }
  | { type: 'unresolved'; fileName: string };       // warning until the user uploads a match

interface SimpleStyle {
  size: { preset: 'poker' | 'bridge' | 'tarot' | 'square' | 'mini' | 'custom'; widthIn: number; heightIn: number };
  imageFit: 'cover' | 'contain';
  // customOnly (shared building blocks from templates/shared):
  colors: { background: string; text: string; accent: string };
  font: AssetId | null;
  footer: { show: boolean; showDeckName: boolean; logo: AssetId | null };
  back: AssetId | null;
}
```

Card size isn't `customOnly`, so it can be changed in default mode too. It feeds `cardSize()` and therefore the sheet cell size.

## 7. Deck JSON (round-trip file)

```json
{
  "format": "tts-deck-forge/deck",
  "formatVersion": 1,
  "generator": "TTS Deck Forge 1.0.0",
  "template": { "id": "fill-in-the-blank", "version": 1 },
  "name": "Office Party",
  "style": { "mode": "custom", "values": { "…": "…" } },
  "cards": [ { "id": "c_k3j2", "kind": "black", "data": { "text": "My boss keeps _____ in the fridge.", "pick": 1 } } ],
  "assets": { "a_9f2c…": { "name": "logo.png", "mime": "image/png", "role": "image", "data": "data:image/png;base64,…" } }
}
```

- **Self-contained:** fonts, logos, backs and card images are embedded as data URLs. That's the only way a single JSON round-trips the style, but a deck with photos will be large (MBs).
- **Telling it apart from the template's JSON import format:** the `format` key. If it matches, the file loads as a whole deck, replacing the current one after a confirm (and switching template if needed). Otherwise it goes to the template's `json` importer and the cards are appended.
- **Validation:** hand-written parse and validation, so a malformed file gives a clear error rather than a crash. `formatVersion` and `template.version` go through `migrate()`.

## 8. Sheet export

```ts
interface SheetPlan {
  cell: { width: number; height: number };   // px; scale = min(4096 / (10·w), 4096 / (7·h))
  sheet: { width: number; height: number };  // 10 × cell.width, 7 × cell.height
  decks: PlannedDeck[];                      // one per kind that has ≥ 1 card, in template.kinds order
}
interface PlannedDeck { kind: string; label: string; backFile: string; sheets: PlannedSheet[] }
interface PlannedSheet { index: number; fileName: string; cardIds: CardId[] }   // ≤ 69 ids
```

- **`planSheets()` is pure and deterministic.** The Build TTS Object screen calls it again on a re-imported deck JSON and gets the same sheets, so a user can come back days later with hosted URLs.
- **Poker size:** 409×573 px cells, so a 4090×4011 sheet. Both dimensions are capped at 4096, so tall cards like tarot shrink rather than overflow.
- **Slot 70:** the card back is drawn there. With `BackIsHidden: true`, TTS ignores slot 70 anyway. But the manual-import README path lets users leave "Back is hidden" unchecked, and then TTS *does* show slot 70 to other players, so filling it keeps both paths correct.
- **Rendering:** one sheet at a time on the main thread, releasing each canvas (about 65 MB per sheet), with a progress bar. A Web Worker/OffscreenCanvas is possible later but isn't worth the font-loading complexity for v1.
- **Zip contents:** `sheets/<deck>-<kind>-<n>.png`, `backs/<deck>-<kind>-back.png`, `<deck>.deck.json`, `README.txt`.

## 9. TTS saved object

```ts
interface TtsBuildInput {
  deckName: string;
  decks: {
    label: string;                                    // "Office Party — Black"
    backUrl: string;
    sheets: { faceUrl: string; cards: { nickname: string }[] }[];
  }[];
}
```

**ID numbering** (`buildSavedObject()` is pure, so it's fully unit-tested):
- **Sheet keys** run 1…N across the whole saved object, not per deck: black sheets first, then white. That rules out key collisions between decks spawned together.
- **Card IDs:** `CardID = key × 100 + slot`, with the slot 0-based within the sheet. For example, 150 black + 80 white cards gives black keys 1–3 (IDs 100–168, 200–268, 300–311) and white keys 4–5 (400–468, 500–510).
- **Per-deck tables:** each `DeckCustom` gets `DeckIDs` in card order, and its `CustomDeck` holds **only its own sheets**. Each contained `Card` carries a `CustomDeck` with just its own sheet: `FaceURL`, `BackURL`, `NumWidth 10`, `NumHeight 7`, `BackIsHidden true`, `UniqueBack false`, `Type 0`.

**Deck-size edge cases:** TTS decks need at least 2 cards, so a kind with exactly 1 card is emitted as a single `Card` object, not a `DeckCustom`. Kinds with 0 cards are omitted.

**Layout in the save:** decks are placed side by side, spaced 3 units apart on X, face down, with random 6-hex GUIDs.

**Output:** `<deck>.json` plus a 256×256 `<deck>.png` thumbnail (the first card face), zipped together with a short README. Browsers make multiple separate downloads awkward, which is why they're zipped.

**URL check:**
- It must be `http(s)` and either end in `.png`/`.jpg`/`.jpeg`/`.webp`, ignoring the query, or be on a known Steam Cloud host: `steamusercontent-a.akamaihd.net`, `steamuserimages-a.akamaihd.net`, `cloud-3.steamusercontent.com`.
- Anything else gets a warning, not a block.
- Local test mode accepts `file:///` and shows a persistent banner saying that other players won't see the cards.

## 10. Dependencies

| Package | Why |
|---|---|
| react, react-dom, vite, typescript, @vitejs/plugin-react | stack |
| papaparse (+ @types) | CSV |
| xlsx (SheetJS **0.20.3 from the official cdn.sheetjs.com tarball**) | XLSX; see note below |
| jszip | zip export |
| @fontsource/inter | OFL Inter woff2 bundled by Vite, so it works offline and ships its licence |
| vitest | tests |
| vite-plugin-pwa | service worker, needed for "works offline once loaded" |
| eslint + typescript-eslint | lint + layer-boundary rule |

**SheetJS note:** the `xlsx` package on the npm registry is frozen at 0.18.5. That version has known CVEs (prototype pollution CVE-2023-30533, ReDoS CVE-2024-22363) and SheetJS no longer publishes to npm. The fixed version only comes from `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`.

## 11. Decisions that deviate from, or add to, the brief

1. **`pick` default.**
   - *Brief:* default 1.
   - *Proposal:* when `pick` is omitted, infer it from the number of blanks (minimum 1). When it's given explicitly and disagrees with the blank count, warn.
   - *Why:* a card with two blanks and "PICK 1" is a bug the user wants caught. It also gives TXT a way to set pick 2/3, which the brief's TXT format otherwise can't express.
2. **IndexedDB autosave:** local only, so nothing leaves the browser. Losing a 300-card deck to an accidental refresh is the most likely real-world complaint.
3. **Remote image URLs (Template 2):**
   - *Problem:* many hosts don't send CORS headers. Drawing such an image **taints the canvas and PNG export throws**.
   - *Handling:* load remote images with `crossOrigin="anonymous"`. On failure, flag the card ("this host blocks use in exported sheets — download the image and upload the file instead") and draw a placeholder.
   - *Privacy:* the README notes that fetching a URL contacts that host.
4. **JPEG sheet option for Template 2 only:** a 4096² photographic PNG runs to roughly 15–25 MB per sheet, which every player has to download. PNG stays the default.
5. **Test workflow moves to stage 2,** with deploy staying in stage 9. That way PRs 2–8 get CI instead of only the last one.
6. **Project scaffold goes in stage 1** once this is approved: Vite, TS config, Vitest, ESLint, the MIT LICENSE and the `core/model` types, so the data model compiles and is typechecked.
