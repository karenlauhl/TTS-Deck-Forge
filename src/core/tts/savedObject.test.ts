import { describe, expect, it } from 'vitest';
import { buildSavedObject, cardId, savedObjectFileBase, type TtsCardObject, type TtsDeckInput, type TtsDeckObject } from './savedObject';
import { checkImageUrl } from './urls';

const cards = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => ({ nickname: `${prefix}${i}` }));
let g = 0;
const guid = () => `g${g++}`;

function deck(name: string, sheetSizes: number[]): TtsDeckInput {
  return {
    nickname: name,
    backUrl: `https://x.test/${name}-back.png`,
    sheets: sheetSizes.map((n, i) => ({ faceUrl: `https://x.test/${name}-${i + 1}.png`, cards: cards(`${name}-${i + 1}-`, n) })),
  };
}

describe('buildSavedObject', () => {
  it('numbers sheet keys across all decks and CardIDs as key*100 + slot', () => {
    const obj = buildSavedObject({ saveName: 'Party', decks: [deck('black', [69, 69, 12]), deck('white', [69, 11])], guid });
    const [black, white] = obj.ObjectStates as TtsDeckObject[];

    expect(black.Name).toBe('DeckCustom');
    expect(Object.keys(black.CustomDeck)).toEqual(['1', '2', '3']);
    expect(Object.keys(white.CustomDeck)).toEqual(['4', '5']);

    expect(black.DeckIDs).toHaveLength(150);
    expect(black.DeckIDs.slice(0, 2)).toEqual([100, 101]);
    expect(black.DeckIDs[68]).toBe(168);
    expect(black.DeckIDs[69]).toBe(200);
    expect(black.DeckIDs[138]).toBe(300);
    expect(black.DeckIDs.at(-1)).toBe(311);
    expect(white.DeckIDs[0]).toBe(400);
    expect(white.DeckIDs.at(-1)).toBe(510);

    // IDs match contained cards, in order, and are unique across the object
    expect(black.ContainedObjects.map((c) => c.CardID)).toEqual(black.DeckIDs);
    const all = [...black.DeckIDs, ...white.DeckIDs];
    expect(new Set(all).size).toBe(all.length);
  });

  it('writes the CustomDeck entries TTS expects, per deck and per card', () => {
    const obj = buildSavedObject({ saveName: 'P', decks: [deck('black', [69, 2]), deck('white', [3])], guid });
    const [black, white] = obj.ObjectStates as TtsDeckObject[];
    expect(black.CustomDeck['2']).toEqual({
      FaceURL: 'https://x.test/black-2.png',
      BackURL: 'https://x.test/black-back.png',
      NumWidth: 10,
      NumHeight: 7,
      BackIsHidden: true,
      UniqueBack: false,
      Type: 0,
    });
    // each card carries only its own sheet
    const card70 = black.ContainedObjects[69];
    expect(card70.CardID).toBe(200);
    expect(Object.keys(card70.CustomDeck)).toEqual(['2']);
    expect(card70.CustomDeck['2'].FaceURL).toBe('https://x.test/black-2.png');
    // other deck's sheets never appear
    expect(white.CustomDeck['1']).toBeUndefined();
    expect(white.CustomDeck['3'].BackURL).toBe('https://x.test/white-back.png');
  });

  it('sets nicknames and places decks side by side, face down', () => {
    const obj = buildSavedObject({ saveName: 'P', decks: [deck('Party — Black', [2]), deck('Party — White', [2])], guid });
    const [a, b] = obj.ObjectStates as TtsDeckObject[];
    expect(a.Nickname).toBe('Party — Black');
    expect(a.ContainedObjects.map((c) => c.Nickname)).toEqual(['Party — Black-1-0', 'Party — Black-1-1']);
    expect(a.Transform.posX).toBeLessThan(b.Transform.posX);
    expect(b.Transform.posX - a.Transform.posX).toBe(3);
    expect(a.Transform.posX + b.Transform.posX).toBe(0); // centred
    expect(a.Transform.rotZ).toBe(180);
    expect(obj.SaveName).toBe('P');
  });

  it('emits a single card as a Card, and skips empty decks', () => {
    const obj = buildSavedObject({ saveName: 'P', decks: [deck('one', [1]), deck('none', []), deck('two', [2])], guid });
    expect(obj.ObjectStates.map((o) => o.Name)).toEqual(['Card', 'DeckCustom']);
    const single = obj.ObjectStates[0] as TtsCardObject;
    expect(single.CardID).toBe(100);
    expect(single.Description).toBe('one');
    expect((obj.ObjectStates[1] as TtsDeckObject).DeckIDs).toEqual([200, 201]);
  });

  it('gives every object a GUID and survives JSON serialisation', () => {
    const obj = JSON.parse(JSON.stringify(buildSavedObject({ saveName: 'P', decks: [deck('a', [3])] })));
    expect(obj.ObjectStates[0].GUID).toMatch(/^[0-9a-f]{6}$/);
    expect(obj.ObjectStates[0].ContainedObjects.every((c: { GUID: string }) => /^[0-9a-f]{6}$/.test(c.GUID))).toBe(true);
  });

  it('rejects sheets over 69 cards', () => {
    expect(() => buildSavedObject({ saveName: 'P', decks: [deck('a', [70])] })).toThrow(/69/);
  });

  it('cardId helper', () => {
    expect(cardId(1, 0)).toBe(100);
    expect(cardId(12, 68)).toBe(1268);
  });
});

describe('savedObjectFileBase', () => {
  it('strips characters that are illegal in file names', () => {
    expect(savedObjectFileBase('Office: "Party"? <v2>/final.')).toBe('Office Party v2final');
    expect(savedObjectFileBase('   ')).toBe('TTS Deck');
  });
});

describe('checkImageUrl', () => {
  const level = (u: string, local = false) => checkImageUrl(u, { allowLocal: local }).level;
  it('accepts direct image links and Steam Cloud', () => {
    expect(level('https://i.imgur.com/abc.png')).toBe('ok');
    expect(level('https://example.com/a/b.JPG?x=1')).toBe('ok');
    expect(level('https://steamusercontent-a.akamaihd.net/ugc/123/ABC/')).toBe('ok');
    expect(level('https://cloud-3.steamusercontent.com/ugc/123/ABC/')).toBe('ok');
  });
  it('warns on likely web pages', () => {
    expect(level('https://example.com/image')).toBe('warn');
    expect(level('https://imgur.com/abc')).toBe('warn');
    expect(level('https://drive.google.com/file/d/x/view')).toBe('warn');
    expect(level('https://www.dropbox.com/s/x/a.png?dl=0')).toBe('warn');
    expect(level('https://www.dropbox.com/s/x/a.png?dl=1')).toBe('ok');
  });
  it('rejects empty, invalid and non-http URLs', () => {
    expect(level('')).toBe('error');
    expect(level('not a url')).toBe('error');
    expect(level('ftp://x.test/a.png')).toBe('error');
  });
  it('only allows file:/// in local test mode, with a warning', () => {
    expect(level('file:///C:/cards/a.png')).toBe('error');
    expect(checkImageUrl('file:///C:/cards/a.png', { allowLocal: true })).toMatchObject({ level: 'warn', message: expect.stringMatching(/Other players/) });
  });
});
