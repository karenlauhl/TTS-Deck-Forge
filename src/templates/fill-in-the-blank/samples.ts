import type { TemplateSamples } from '../../core/template/types';
import type { FibCard } from './model';

// Original sample cards written for TTS Deck Forge.
const BLACK: FibCard[] = [
  { text: 'My landlord just texted me a photo of _____.', pick: 1 },
  { text: "The secret ingredient in Grandma's lasagna is _____.", pick: 1 },
  { text: 'Nobody warned me that adulthood would be mostly _____.', pick: 1 },
  { text: 'What got me kicked out of the book club?', pick: 1 },
  { text: 'Breaking news: local man arrested for _____ at the zoo.', pick: 1 },
  { text: '_____ + _____ = my weekend plans.', pick: 2 },
  { text: 'My therapist says I need to stop _____.', pick: 1 },
  { text: 'In the sequel, the hero defeats _____ using only _____.', pick: 2 },
  { text: "What's really in the office fridge?", pick: 1 },
  { text: 'Step 1: _____. Step 2: _____. Step 3: _____.', pick: 3 },
  { text: 'My dating profile says I enjoy long walks and _____.', pick: 1 },
  { text: 'The homeowners association just banned _____.', pick: 1 },
  { text: "What's the real reason the dinosaurs went extinct?", pick: 1 },
  { text: "I'm not saying it was aliens, but it was probably _____.", pick: 1 },
];

const WHITE: string[] = [
  'A suspiciously confident raccoon.',
  'Forgetting the Wi-Fi password to my own house.',
  'Three kids in a trench coat.',
  'Aggressively replying all.',
  'A motivational poster of a sad goat.',
  'Emotional support lasagna.',
  'Crying in a parked car.',
  'The group chat.',
  'A pigeon with a business plan.',
  'Unskippable ads.',
  'An interpretive dance about taxes.',
  "My uncle's conspiracy board.",
  'Microwaving fish at work.',
  'A haunted robot vacuum.',
  "Whispering 'enhance' at a blurry photo.",
  'Getting lost in a furniture store for three days.',
  'Competitive napping.',
  'A sourdough starter named Kevin.',
  'Pretending to understand wine.',
  'The last slice of pizza.',
  'Too many browser tabs.',
  'A strongly worded letter.',
  'Doing the robot at a very serious event.',
  'Bees?',
  "Accidentally liking an ex's photo from 2014.",
  'A dramatic reading of the terms and conditions.',
  'Existential dread, but make it fashion.',
  'A llama in sunglasses.',
  'Tax-deductible glitter.',
  'Speed-running my morning routine.',
];

export const samples: TemplateSamples<FibCard> = {
  deckName: 'Sample Party Deck',
  cards: [
    ...BLACK.map((data) => ({ kind: 'black', data })),
    ...WHITE.map((text) => ({ kind: 'white', data: { text } })),
  ],
  txt: [
    '# BLACK',
    ...BLACK.slice(0, 6).map((c) => c.text),
    '',
    '# WHITE',
    ...WHITE.slice(0, 10),
    '',
  ].join('\n'),
  table: [
    ...BLACK.slice(0, 6).map((c) => ({ type: 'black', text: c.text, pick: String(c.pick) })),
    ...WHITE.slice(0, 10).map((text) => ({ type: 'white', text, pick: '' })),
  ],
  json: {
    name: 'Sample Party Deck',
    black: BLACK.slice(0, 6),
    white: WHITE.slice(0, 10),
  },
};
