import type { CardOrigin } from '../../core/model/deck';
import { error, warning, type Issue } from '../../core/model/issues';
import type { ImportedCard, ParseResult, TableMapping } from '../../core/template/types';
import { inferPick, normalizeText, parseKind, parsePick, type FibCard, type FibKind } from './model';

function makeCard(kind: FibKind, rawText: string, rawPick: unknown, origin: CardOrigin, issues: Issue[]): ImportedCard<FibCard> | null {
  const text = normalizeText(rawText);
  if (!text) {
    issues.push(error('missing-field', 'card text is empty; row skipped', { origin, field: 'text' }));
    return null;
  }
  if (kind === 'white') {
    if (rawPick !== undefined && rawPick !== null && String(rawPick).trim() !== '' && String(rawPick).trim() !== '1') {
      issues.push(warning('invalid-value', 'pick only applies to black cards; ignored', { origin, field: 'pick' }));
    }
    return { kind, data: { text }, origin };
  }
  const pick = parsePick(rawPick);
  if (pick.problem) issues.push(warning('invalid-value', pick.problem, { origin, field: 'pick' }));
  return { kind, data: { text, pick: pick.value ?? inferPick(text) }, origin };
}

// ---------- TXT ----------

const SECTION = /^#\s*(black|prompts?|questions?|white|answers?|responses?)(\s+cards?)?\s*:?\s*$/i;
/** "# SOMETHING" with a single word: a mistyped section header rather than card text. */
const LOOKS_LIKE_SECTION = /^#\s+\S+\s*$/;

export function parseTxt(text: string, file: string): ParseResult<FibCard> {
  const cards: ImportedCard<FibCard>[] = [];
  const issues: Issue[] = [];
  let kind: FibKind | null = null;
  const orphanLines: number[] = [];

  text.split(/\r\n|\r|\n/).forEach((raw, i) => {
    const line = raw.trim();
    const origin: CardOrigin = { type: 'file', file, line: i + 1 };
    if (!line) return;

    const section = line.match(SECTION);
    if (section) {
      kind = /^(black|prompts?|questions?)$/i.test(section[1]) ? 'black' : 'white';
      return;
    }
    if (LOOKS_LIKE_SECTION.test(line)) {
      issues.push(error('no-section', `"${line}" isn't a known section; use "# BLACK" or "# WHITE"`, { origin }));
      return;
    }
    if (!kind) {
      orphanLines.push(i + 1);
      return;
    }
    const card = makeCard(kind, line, undefined, origin, issues);
    if (card) cards.push(card);
  });

  if (orphanLines.length > 0) {
    const where = orphanLines.length === 1 ? `line ${orphanLines[0]}` : `lines ${orphanLines[0]}–${orphanLines.at(-1)}`;
    issues.unshift(
      error('no-section', `${where} ${orphanLines.length === 1 ? 'comes' : 'come'} before any "# BLACK" or "# WHITE" header and were skipped`, {
        origin: { type: 'file', file },
      }),
    );
  }
  return { cards, issues };
}

// ---------- CSV / XLSX ----------

export const tableMapping: TableMapping<FibCard> = {
  columns: [
    { key: 'type', required: true, aliases: ['kind', 'color', 'colour', 'card type'], description: '"black" (prompt) or "white" (answer).' },
    { key: 'text', required: true, aliases: ['card', 'card text', 'content'], description: 'Card text. Use ___ (3+ underscores) for a blank.' },
    { key: 'pick', required: false, description: 'Black cards: how many answers to play (1–3). Defaults to the number of blanks.' },
  ],
  fromRow(row, origin) {
    const issues: Issue[] = [];
    if (!row.type) {
      issues.push(error('missing-field', 'type is empty; use "black" or "white"', { origin, field: 'type' }));
      return { issues };
    }
    const kind = parseKind(row.type);
    if (!kind) {
      issues.push(error('invalid-value', `type "${row.type}" must be "black" or "white"`, { origin, field: 'type' }));
      return { issues };
    }
    const card = makeCard(kind, row.text, row.pick, origin, issues);
    return { card: card ? { kind: card.kind, data: card.data } : undefined, issues };
  },
};

// ---------- JSON ----------

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export function parseJson(value: unknown, file: string): ParseResult<FibCard> {
  const cards: ImportedCard<FibCard>[] = [];
  const issues: Issue[] = [];
  const fileOrigin: CardOrigin = { type: 'file', file };

  if (!isObj(value)) {
    issues.push(error('parse-error', 'expected an object like { "name": "...", "black": [...], "white": [...] }', { origin: fileOrigin }));
    return { cards, issues };
  }
  if (value.black === undefined && value.white === undefined) {
    issues.push(error('missing-field', 'no "black" or "white" arrays found', { origin: fileOrigin }));
    return { cards, issues };
  }

  for (const kind of ['black', 'white'] as const) {
    const list = value[kind];
    if (list === undefined) continue;
    if (!Array.isArray(list)) {
      issues.push(error('invalid-value', `"${kind}" must be an array`, { origin: fileOrigin }));
      continue;
    }
    list.forEach((item, i) => {
      const origin: CardOrigin = { type: 'file', file, path: `${kind}[${i}]` };
      let text: unknown;
      let pick: unknown;
      if (typeof item === 'string') text = item;
      else if (isObj(item)) {
        text = item.text;
        pick = item.pick;
      }
      if (typeof text !== 'string') {
        issues.push(
          error('invalid-value', kind === 'black' ? 'expected "text" or { "text": "...", "pick": 1 }' : 'expected a string', { origin }),
        );
        return;
      }
      const card = makeCard(kind, text, pick, origin, issues);
      if (card) cards.push(card);
    });
  }

  const deckName = typeof value.name === 'string' && value.name.trim() ? value.name.trim() : undefined;
  return { cards, issues, deckName };
}
