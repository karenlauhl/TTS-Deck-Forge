import { SHEET_COLUMNS, SHEET_ROWS } from '../export/sheetPlan';

export interface TtsCardInput {
  nickname: string;
  description?: string;
}

export interface TtsSheetInput {
  faceUrl: string;
  /** Cards in slot order (≤ 69). */
  cards: TtsCardInput[];
}

export interface TtsDeckInput {
  /** e.g. "Office Party — Black (prompt)". */
  nickname: string;
  backUrl: string;
  sheets: TtsSheetInput[];
}

export interface TtsBuildInput {
  saveName: string;
  decks: TtsDeckInput[];
  /** Deterministic GUIDs for tests. */
  guid?: () => string;
}

export interface CustomDeckEntry {
  FaceURL: string;
  BackURL: string;
  NumWidth: number;
  NumHeight: number;
  BackIsHidden: boolean;
  UniqueBack: boolean;
  Type: number;
}

interface Transform {
  posX: number;
  posY: number;
  posZ: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
}

export interface TtsCardObject {
  GUID: string;
  Name: 'Card';
  Transform: Transform;
  Nickname: string;
  Description: string;
  CardID: number;
  CustomDeck: Record<string, CustomDeckEntry>;
  [k: string]: unknown;
}

export interface TtsDeckObject {
  GUID: string;
  Name: 'DeckCustom';
  Transform: Transform;
  Nickname: string;
  Description: string;
  DeckIDs: number[];
  CustomDeck: Record<string, CustomDeckEntry>;
  ContainedObjects: TtsCardObject[];
  [k: string]: unknown;
}

export interface TtsSavedObject {
  SaveName: string;
  ObjectStates: (TtsDeckObject | TtsCardObject)[];
  [k: string]: unknown;
}

/** Distance between decks on the table (a card is ~2.2 units wide). */
export const DECK_SPACING = 3;

export const randomGuid = (): string => Array.from(crypto.getRandomValues(new Uint8Array(3)), (b) => b.toString(16).padStart(2, '0')).join('');

/** TTS card id: sheet key × 100 + slot index within that sheet. */
export const cardId = (sheetKey: number, slot: number): number => sheetKey * 100 + slot;

const transform = (posX: number): Transform => ({
  posX,
  posY: 1,
  posZ: 0,
  rotX: 0,
  rotY: 180,
  rotZ: 180, // face down
  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,
});

const commonFlags = {
  ColorDiffuse: { r: 0.713235259, g: 0.713235259, b: 0.713235259 },
  Locked: false,
  Grid: true,
  Snap: true,
  IgnoreFoW: false,
  MeasureMovement: false,
  DragSelectable: true,
  Autoraise: true,
  Sticky: true,
  Tooltip: true,
  GridProjection: false,
  SidewaysCard: false,
  LuaScript: '',
  LuaScriptState: '',
  XmlUI: '',
};

/**
 * Build a Tabletop Simulator saved object with one DeckCustom per deck.
 *
 * Sheet keys (the CustomDeck keys) are numbered 1…N across the whole object, so decks spawned
 * together never share a key. Each card's CardID is key × 100 + its slot on that sheet.
 * A deck with exactly one card becomes a plain Card (TTS decks need at least two). Empty decks are skipped.
 */
export function buildSavedObject(input: TtsBuildInput): TtsSavedObject {
  const guid = input.guid ?? randomGuid;
  const objects: (TtsDeckObject | TtsCardObject)[] = [];
  const decks = input.decks.filter((d) => d.sheets.some((s) => s.cards.length > 0));
  let nextKey = 1;

  decks.forEach((deck, di) => {
    const posX = (di - (decks.length - 1) / 2) * DECK_SPACING;
    const customDeck: Record<string, CustomDeckEntry> = {};
    const cards: TtsCardObject[] = [];

    for (const sheet of deck.sheets) {
      if (sheet.cards.length === 0) continue;
      if (sheet.cards.length > SHEET_COLUMNS * SHEET_ROWS - 1) throw new Error('A sheet holds at most 69 cards');
      const key = nextKey++;
      const entry: CustomDeckEntry = {
        FaceURL: sheet.faceUrl.trim(),
        BackURL: deck.backUrl.trim(),
        NumWidth: SHEET_COLUMNS,
        NumHeight: SHEET_ROWS,
        BackIsHidden: true,
        UniqueBack: false,
        Type: 0,
      };
      customDeck[String(key)] = entry;
      sheet.cards.forEach((c, slot) => {
        cards.push({
          GUID: guid(),
          Name: 'Card',
          Transform: transform(posX),
          Nickname: c.nickname,
          Description: c.description ?? '',
          GMNotes: '',
          ...commonFlags,
          Hands: true,
          CardID: cardId(key, slot),
          CustomDeck: { [String(key)]: entry },
        });
      });
    }

    if (cards.length === 1) {
      objects.push({ ...cards[0], Description: cards[0].Description || deck.nickname });
      return;
    }
    objects.push({
      GUID: guid(),
      Name: 'DeckCustom',
      Transform: transform(posX),
      Nickname: deck.nickname,
      Description: '',
      GMNotes: '',
      ...commonFlags,
      Hands: false,
      DeckIDs: cards.map((c) => c.CardID),
      CustomDeck: customDeck,
      ContainedObjects: cards,
    });
  });

  return {
    SaveName: input.saveName,
    GameMode: '',
    Gravity: 0.5,
    PlayArea: 0.5,
    Date: '',
    Table: '',
    Sky: '',
    Note: '',
    Rules: '',
    XmlUI: '',
    LuaScript: '',
    LuaScriptState: '',
    ObjectStates: objects,
    TabStates: {},
    VersionNumber: '',
  };
}

/** Windows/macOS-safe file name that keeps the deck name readable in TTS's Saved Objects list. */
export function savedObjectFileBase(name: string): string {
  const s = name
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
    .slice(0, 80);
  return s || 'TTS Deck';
}
