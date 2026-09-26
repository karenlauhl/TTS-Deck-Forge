/** README for the saved-object download. */
export function savedObjectReadme(fileBase: string, deckNames: string[], localMode: boolean): string {
  const lines = [
    `${fileBase} — Tabletop Simulator saved object`,
    'Made with TTS Deck Forge.',
    '',
    `Contains: ${deckNames.join(', ')}.`,
    '',
    'INSTALL',
    `Copy "${fileBase}.json" and "${fileBase}.png" (the thumbnail) into your Saved Objects folder:`,
    '  Windows: Documents\\My Games\\Tabletop Simulator\\Saves\\Saved Objects\\',
    '  macOS:   ~/Library/Tabletop Simulator/Saves/Saved Objects/',
    '  Linux:   ~/.local/share/Tabletop Simulator/Saves/Saved Objects/',
    'You can also put them in a sub-folder there to keep things tidy.',
    '',
    'SPAWN IT',
    '  1. Start or load a game in Tabletop Simulator.',
    '  2. Open Objects > Saved Objects.',
    `  3. Click "${fileBase}". The decks appear face down on the table, side by side.`,
    '     (If it does not show up, close and reopen the Saved Objects window.)',
    '',
    'TIPS',
    '  - Right-click a deck > Shuffle before playing.',
    '  - Hover a card to see its name (the card text).',
    '  - If cards show as white/blank, one of the image URLs is not reachable: open it in a',
    '    browser. It must show just the image.',
  ];
  if (localMode) {
    lines.push(
      '',
      'WARNING: LOCAL TEST MODE',
      'This object uses file:/// paths. Only this computer can load them. Other players in',
      'multiplayer will NOT see the cards. Upload the images (Modding > Cloud Manager) and',
      'rebuild the object before playing with others.',
    );
  }
  return lines.join('\n') + '\n';
}
