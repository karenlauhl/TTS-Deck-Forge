import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import type { Asset, Deck } from '../model/deck';
import { template } from '../../templates/fill-in-the-blank';
import { buildZip } from '../export/zip';
import { planSheets } from '../export/sheetPlan';
import { sheetExportReadme } from '../export/readme';
import { parseDeckFile, serializeDeck } from './deckfile';
import { blobToDataUrl, dataUrlToBlob } from './base64';

const logo: Asset = { id: 'a_logo', name: 'logo.png', mime: 'image/png', role: 'image', blob: new Blob([new Uint8Array([137, 80, 78, 71, 1, 2, 3])], { type: 'image/png' }) };
const unused: Asset = { id: 'a_unused', name: 'x.png', mime: 'image/png', role: 'image', blob: new Blob([new Uint8Array([1])], { type: 'image/png' }) };

const deck: Deck = {
  name: 'Office Party',
  templateId: template.id,
  cards: [
    { id: 'c1', kind: 'black', count: 1, data: { text: 'Why _____?', pick: 1 }, origin: { type: 'manual' } },
    { id: 'c2', kind: 'white', count: 3, data: { text: 'Bees.' }, origin: { type: 'manual' } },
  ],
  style: {
    mode: 'custom',
    values: { ...template.defaultStyle, colors: { black: { background: '#112233', text: '#ffeeaa' }, white: { background: '#fff', text: '#000' } }, footer: { show: true, showDeckName: true, logo: 'a_logo' } },
  },
};

describe('base64 helpers', () => {
  it('round-trips binary data', async () => {
    const url = await blobToDataUrl(logo.blob);
    expect(url.startsWith('data:image/png;base64,')).toBe(true);
    const back = dataUrlToBlob(url);
    expect(new Uint8Array(await back.arrayBuffer())).toEqual(new Uint8Array(await logo.blob.arrayBuffer()));
    expect(back.type).toBe('image/png');
  });
});

describe('deck file', () => {
  it('round-trips content, copies, style and referenced assets only', async () => {
    const file = await serializeDeck(deck, new Map([[logo.id, logo], [unused.id, unused]]));
    expect(Object.keys(file.assets)).toEqual(['a_logo']);
    const json = JSON.parse(JSON.stringify(file));
    const parsed = parseDeckFile(json, 'd.json');
    expect(parsed.issues).toEqual([]);
    expect(parsed.deck!.name).toBe('Office Party');
    expect(parsed.deck!.style).toEqual(deck.style);
    expect(parsed.deck!.cards.map((c) => [c.id, c.kind, c.count, c.data])).toEqual(deck.cards.map((c) => [c.id, c.kind, c.count, c.data]));
    expect(parsed.assets).toHaveLength(1);
    expect(new Uint8Array(await parsed.assets[0].blob.arrayBuffer())).toEqual(new Uint8Array(await logo.blob.arrayBuffer()));
  });

  it('rejects foreign, future and unknown-template files', () => {
    expect(parseDeckFile({ black: [] }, 'x.json').issues[0].message).toMatch(/not a TTS Deck Forge deck file/);
    expect(parseDeckFile({ format: 'tts-deck-forge/deck', formatVersion: 99 }, 'x.json').issues[0].message).toMatch(/newer version/);
    expect(parseDeckFile({ format: 'tts-deck-forge/deck', formatVersion: 1, template: { id: 'nope' } }, 'x.json').issues[0].message).toMatch(/unknown card type/);
  });

  it('skips invalid cards with their path and fills missing style values', () => {
    const r = parseDeckFile(
      { format: 'tts-deck-forge/deck', formatVersion: 1, template: { id: template.id, version: 1 }, name: 'X', cards: [{ kind: 'purple', data: {} }, { kind: 'white', data: { text: ' ok ' } }] },
      'x.json',
    );
    expect(r.issues.map((i) => i.message)).toEqual(['x.json cards[0]: invalid card; skipped']);
    expect(r.deck!.cards.map((c) => c.data)).toEqual([{ text: 'ok' }]);
    expect(r.deck!.style).toEqual({ mode: 'default', values: template.defaultStyle });
  });
});

describe('sheet export zip + README', () => {
  it('lists every sheet with its card count and the manual import settings', async () => {
    const big: Deck = { ...deck, cards: [...deck.cards, { id: 'c3', kind: 'white', count: 70, data: { text: 'Llama.' }, origin: { type: 'manual' } }] };
    const plan = planSheets(template, big);
    const readme = sheetExportReadme(plan, 'office-party.deck.json');
    expect(readme).toContain('sheets/office-party-white-sheet-1.png  (69 cards)');
    expect(readme).toContain('sheets/office-party-white-sheet-2.png  (4 cards)');
    expect(readme).toContain('backs/office-party-black-back.png');
    expect(readme).toContain('Objects > Components > Custom > Deck');
    expect(readme).toContain('Width: 10   Height: 7');
    expect(readme).toContain('Modding > Cloud Manager');

    const zip = await buildZip([
      { path: 'README.txt', data: readme },
      { path: 'sheets/a.png', data: new Uint8Array([1, 2, 3]) },
    ]);
    const back = await JSZip.loadAsync(await zip.arrayBuffer());
    expect(Object.keys(back.files).sort()).toEqual(['README.txt', 'sheets/', 'sheets/a.png']);
    expect(await back.file('README.txt')!.async('string')).toBe(readme);
  });
});
