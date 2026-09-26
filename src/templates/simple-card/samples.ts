import type { TemplateSamples } from '../../core/template/types';
import type { SimpleCard } from './model';

// Original sample cards written for TTS Deck Forge.
const CARDS: { title: string; body: string; count?: number }[] = [
  { title: 'Healing Draught', body: 'Restore 3 health.\nDiscard after use.', count: 3 },
  { title: 'Rusty Lantern', body: 'Look at the top card of any deck, then put it back.' },
  { title: 'Sudden Storm', body: 'Every player discards one card at random.' },
  { title: 'Lucky Coin', body: 'Reroll one die. You must keep the new result.', count: 2 },
  { title: 'Secret Passage', body: 'Move to any room that shares a wall with yours.' },
  { title: 'Market Day', body: 'Draw two cards. Give one of them to the player on your left.' },
  { title: 'Night Watch', body: 'Until your next turn, you cannot be the target of an action.' },
  { title: 'Old Map', body: 'Reveal one hidden tile of your choice.' },
];

const toData = (c: { title: string; body: string }): SimpleCard => ({ title: c.title, body: c.body, image: null });

export const samples: TemplateSamples<SimpleCard> = {
  deckName: 'Sample Adventure Deck',
  cards: CARDS.map((c) => ({ kind: 'card', data: toData(c), count: c.count })),
  txt: CARDS.slice(0, 5).map((c) => `${c.title} | ${c.body.replace(/\n/g, '\\n')}`).join('\n') + '\n',
  table: CARDS.slice(0, 5).map((c) => ({ title: c.title, body: c.body, image: '', count: c.count ? String(c.count) : '' })),
  json: CARDS.slice(0, 5).map((c) => ({ title: c.title, body: c.body, ...(c.count ? { count: c.count } : {}) })),
};
