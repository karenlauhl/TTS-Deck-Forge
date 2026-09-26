import type { SheetPlan } from './sheetPlan';
import { SHEET_COLUMNS, SHEET_ROWS, withExtension } from './sheetPlan';

/** README.txt for the sheet export zip: manual TTS import + hosting instructions. */
export function sheetExportReadme(plan: SheetPlan, deckFile: string, format: 'png' | 'jpeg' = 'png'): string {
  const lines: string[] = [];
  const p = (s = '') => lines.push(s);
  p(`${plan.deckName} — Tabletop Simulator deck sheets`);
  p('Made with TTS Deck Forge.');
  p();
  p('CONTENTS');
  for (const d of plan.decks) {
    p(`  ${d.label}: ${d.cardCount} card${d.cardCount === 1 ? '' : 's'} on ${d.sheets.length} sheet${d.sheets.length === 1 ? '' : 's'}`);
    for (const s of d.sheets) p(`    sheets/${withExtension(s.fileName, format)}  (${s.cards.length} cards)`);
    p(`    backs/${d.backFileName}`);
  }
  p(`  ${deckFile}  — re-import this into TTS Deck Forge to edit the deck later`);
  p();
  p('STEP 1 — HOST THE IMAGES');
  p('Tabletop Simulator loads card images from URLs, so every sheet and back image needs a');
  p('public, direct image link. Easiest option, built into TTS:');
  p('  1. In TTS, open Modding > Cloud Manager.');
  p('  2. Upload each sheet and back image (the up-arrow button).');
  p('  3. Copy each file\'s URL (it will look like https://steamusercontent-a.akamaihd.net/ugc/...');
  p('     or https://cloud-3.steamusercontent.com/ugc/...).');
  p('Any host that gives a direct image link works too (e.g. an image host whose link ends in .png).');
  p('Pages that merely show the image (like a sharing page) do not work.');
  p();
  p('STEP 2A — EASY: BUILD A SAVED OBJECT');
  p('Open TTS Deck Forge, load this deck (drop the .deck.json file on the Cards tab),');
  p('go to "Build TTS object", paste the URLs and download the saved object. That gives you');
  p('every deck ready to spawn, with card names set.');
  p();
  p('STEP 2B — MANUAL IMPORT IN TTS');
  p('For each sheet:');
  p('  1. Objects > Components > Custom > Deck, then click the table to place it.');
  p('  2. Face: the sheet\'s URL. Back: the matching back image URL.');
  p(`  3. Width: ${SHEET_COLUMNS}   Height: ${SHEET_ROWS}   Number: the sheet's card count (listed above).`);
  p('  4. Tick "Back is hidden". Leave "Unique backs" unticked. Click Import.');
  p('A deck with several sheets imports as several stacks: drop them on top of each other to merge.');
  for (const d of plan.decks) {
    for (const s of d.sheets) p(`  ${d.label} sheet ${s.number}: Number = ${s.cards.length}`);
  }
  p();
  p('The bottom-right slot of every sheet shows the card back: TTS reserves that slot as the');
  p('"hidden" card, so each sheet holds at most 69 cards.');
  p();
  return lines.join('\n');
}
