import { toCardRecords } from '../core/import/cards';
import { importFile } from '../core/import/importFile';
import { error } from '../core/model/issues';
import { randomId } from '../core/model/ids';
import type { AnyTemplate } from '../core/template/types';
import type { Action } from './state/store';

export const CARD_FILE_ACCEPT = '.txt,.csv,.xlsx,.json';

/** Read dropped/chosen card files and dispatch their cards and import reports. */
export async function importCardFiles(
  files: File[],
  template: AnyTemplate,
  dispatch: (a: Action) => void,
  onDeckFile: (file: File, value: unknown) => Promise<void> | void,
): Promise<void> {
  for (const file of files) {
    let bytes: ArrayBuffer;
    try {
      bytes = await file.arrayBuffer();
    } catch {
      dispatch({
        type: 'addReport',
        report: { id: randomId('r'), file: file.name, added: 0, issues: [error('parse-error', 'could not read the file', { origin: { type: 'file', file: file.name } })] },
      });
      continue;
    }
    const outcome = importFile(template, file.name, bytes);
    if (outcome.type === 'deck') {
      await onDeckFile(file, outcome.value);
      continue;
    }
    const cards = toCardRecords(template, outcome.result.cards);
    dispatch({
      type: 'addCards',
      cards,
      deckName: outcome.result.deckName,
      report: { id: randomId('r'), file: file.name, added: cards.length, issues: outcome.result.issues },
    });
  }
}
