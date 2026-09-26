# TTS Deck Forge

Make custom card decks for **Tabletop Simulator** (TTS) in your browser. Import your card text from a spreadsheet or text file, style the cards, and export:

1. **TTS-ready deck sheets:** 10 × 7 PNG grids plus back images, zipped with import instructions.
2. **A spawnable saved object:** after you host the images, one click gives you a `.json` you drop into TTS's Saved Objects folder.

Everything runs in your browser. There's no account, no server and no tracking, and your cards never leave your computer. It also works offline after the first visit.

> Screenshots: _coming soon_ (`docs/screenshots/`).

---

## Card types

| Card type | What it's for |
|---|---|
| **Fill-in-the-blank party cards** | A Cards Against Humanity-style party game: black prompt cards with blanks (`___`) and white answer cards. Black and white export as two separate TTS decks with their own backs. Cards with 2 or 3 blanks show **PICK 2** / **PICK 3**. |
| **Simple cards** | A title, body text and an optional image. Card size is configurable (poker by default; bridge, tarot, mini, square or custom). |

Both have a clean **default** style and an optional **custom** style:
- colours
- your own font (.ttf, .otf, .woff2)
- a footer with a logo and the deck name
- custom card back images

The default font is [Inter](https://rsms.me/inter/) (SIL Open Font License), bundled with the app.

The fill-in-the-blank template ships with **original** sample cards only. No third-party card text is included.

## Using it

1. **Cards.** Pick a card type, then drop files on the import area (or click *Choose files…*). You can also add and edit cards by hand in the table, and mix both.
   - Every problem is listed with its file and line/row: empty text, unknown types, duplicates, text too long to fit even at the smallest font size, and missing images.
   - Use the *Copies* column when you need several of the same card.
   - *Template files* downloads a ready-to-fill example in each format.
2. **Style.** Keep the default look or switch to *Custom*. The preview updates live.
3. **Preview.** Check every card and back. Cards whose text doesn't fit are outlined.
4. **Export sheets.** Download a ZIP containing:
   - `sheets/…`: one image per 69 cards, laid out 10 × 7, up to 4096 px wide
   - `backs/…`: one back image per deck
   - `<deck>.deck.json`: your whole deck (cards, style, fonts and images), to reopen later by dropping it on the Cards tab
   - `README.txt`: TTS import and hosting steps
5. **Build TTS object.** Upload the images somewhere public, paste the URLs, and download the saved object (see below).

Your deck is autosaved in this browser (IndexedDB). Keep the `.deck.json` as your real backup.

## File formats

Leading and trailing spaces are trimmed and blank lines are skipped. Column names are case-insensitive. Any spreadsheet can have an optional **`count`** column (also accepted as `copies` or `qty`) for the number of copies.

### Fill-in-the-blank party cards

A run of three or more underscores (`___`) is a blank, and every blank is drawn as the same line. When `pick` is left out it's worked out from the number of blanks. A card that says PICK 1 but has two blanks gets a warning.

**TXT**: one card per line, in sections:

```text
# BLACK
Why is there _____ in my sandwich?
_____ + _____ = a perfect weekend.

# WHITE
A suspiciously confident raccoon.
Bees?
```

`# PROMPTS` / `# ANSWERS` also work as section headers.

**CSV / XLSX**: columns `type` (`black` or `white`), `text`, and an optional `pick` (1–3):

```csv
type,text,pick
black,"Why is there _____ in my sandwich?",1
black,"_____ + _____ = a perfect weekend.",2
white,A suspiciously confident raccoon.,
```

**JSON**:

```json
{
  "name": "My Party Deck",
  "black": [{ "text": "Why is there _____ in my sandwich?", "pick": 1 }],
  "white": ["A suspiciously confident raccoon.", "Bees?"]
}
```

### Simple cards

**TXT**: `title | body` per line, with an optional third column for the image. Write `\n` for a line break.

```text
Healing Draught | Restore 3 health.\nDiscard after use.
Old Map | Reveal one hidden tile. | map.png
```

**CSV / XLSX**: columns `title`, `body`, and an optional `image`. Line breaks inside a cell are kept.

**JSON**: an array of objects, or `{ "name": "…", "cards": [ … ] }`:

```json
[
  { "title": "Healing Draught", "body": "Restore 3 health.\nDiscard after use.", "count": 3 },
  { "title": "Old Map", "body": "Reveal one hidden tile.", "image": "map.png" }
]
```

`image` can be a URL or a **file name**. Drop the image files on the import area together with (or after) the spreadsheet, and they are matched by file name.

Uploading images is more reliable than URLs. Many websites don't allow their images to be used by other sites, and those can't go into exported sheets. The app flags them.

## Getting the deck into Tabletop Simulator

### 1. Host the images

TTS loads card images from URLs, and each sheet and back image needs a **direct link to the image itself**. The easiest host is built into TTS:

1. In TTS, open **Modding › Cloud Manager**.
2. Upload each sheet and back image.
3. Copy each URL (Steam Cloud links look like `https://steamusercontent-a.akamaihd.net/ugc/…` or `https://cloud-3.steamusercontent.com/ugc/…`).

Any host that gives a direct `.png`/`.jpg` link works too.

### 2a. Easy: saved object

In **Build TTS object**, paste each URL next to its file, or paste them all at once, then click **Download saved object**.

The zip contains `<Deck>.json` and a `<Deck>.png` thumbnail. Copy both to your Saved Objects folder:

| OS | Folder |
|---|---|
| Windows | `Documents\My Games\Tabletop Simulator\Saves\Saved Objects\` |
| macOS | `~/Library/Tabletop Simulator/Saves/Saved Objects/` |
| Linux | `~/.local/share/Tabletop Simulator/Saves/Saved Objects/` |

In a game, open **Objects › Saved Objects** and click your deck. Each deck spawns face down, side by side. For fill-in-the-blank cards that means one black and one white deck, and every card's name is its text.

*Local test mode* accepts `file:///` paths so you can try the deck before uploading. **Other players will not see those cards in multiplayer.**

### 2b. Manual import

For each sheet:
1. **Objects › Components › Custom › Deck**, then place it on the table.
2. **Face** = the sheet URL; **Back** = the back image URL.
3. **Width 10, Height 7, Number** = the number of cards on that sheet (listed in the zip's README).
4. Tick **Back is hidden**, and leave **Unique backs** unticked.

A deck with several sheets imports as several stacks; drop them on each other to merge. The bottom-right slot of each sheet holds the card back, because TTS reserves that slot as the "hidden" card, which is why a sheet holds at most 69 cards.

### How IDs work (for the curious)

In the saved object:
- Each sheet gets a `CustomDeck` key: 1, 2, 3 … across the whole object.
- Each card's `CardID` is `key × 100 + position on the sheet`, counting from 0.

For example, 150 black cards use keys 1–3 (IDs 100–168, 200–268, 300–311), and the white deck continues at key 4. A deck with a single card is saved as a lone card, since TTS decks need at least two.

## Privacy

- No backend, no analytics, no cookies. The app is a static site.
- Files you open are read by your browser and never uploaded. Your deck is autosaved to your browser's local storage (IndexedDB) on your device only.
- The only network requests are for loading the app itself and for **image URLs you type in** (Simple cards), which your browser fetches from those sites to draw them.
- Custom fonts and images are embedded in your `.deck.json` export. Only use fonts and images you are allowed to use.

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest
npm run typecheck
npm run build      # static site in dist/
```

**Stack:**
- React, Vite and TypeScript
- PapaParse (CSV), SheetJS (XLSX) and JSZip
- vite-plugin-pwa for offline support
- Vitest

SheetJS is installed as `xlsx@npm:@e965/xlsx@0.20.3`, a republish of SheetJS 0.20.3. The `xlsx` package on the npm registry is stuck at 0.18.5, which has known vulnerabilities. To use the official tarball instead, change that line in `package.json` to `"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"`.

**Deployment:** every push to `main` is tested, built, and deployed to GitHub Pages by `.github/workflows/deploy.yml`. To turn it on, go to the repo's **Settings › Pages** and set **Source** to **GitHub Actions**. Pull requests run `.github/workflows/test.yml`.

### Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

- **`src/core/`** is template-agnostic and has no React. It handles:
  - importing (file readers, column mapping, row numbers)
  - validation
  - text fitting (wrap, then shrink)
  - canvas rendering helpers
  - sheet planning and export
  - the deck JSON round-trip
  - the TTS saved-object generator
- **`src/templates/<name>/`**: each card type is a self-contained module implementing `CardTemplate` (`src/core/template/types.ts`). It provides the data schema and editor fields, the import mappings, the default style and style options, and the canvas renderer.
- **`src/app/`**: the React UI. Forms and tables are generated from each template's declarative fields and options.

**Adding a card type:**
1. Create `src/templates/<your-template>/index.ts`, exporting `template: CardTemplate`.
2. It's discovered automatically. No core changes are needed.
3. Reusable style options and drawing helpers are in `src/templates/shared/`.

## Licence

[MIT](LICENSE). Inter is © The Inter Project Authors, SIL Open Font License 1.1 (bundled via `@fontsource/inter`).

TTS Deck Forge is an independent fan tool. It is not affiliated with or endorsed by Berserk Games (Tabletop Simulator) or any card game publisher.
