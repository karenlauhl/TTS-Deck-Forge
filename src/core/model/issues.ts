import type { CardId, CardOrigin } from './deck';

export type IssueSeverity = 'error' | 'warning';

export type IssueCode =
  | 'empty-file'
  | 'parse-error'
  | 'unsupported-format'
  | 'missing-column'
  | 'unknown-column'
  | 'missing-field'
  | 'invalid-value'
  | 'no-section'
  | 'duplicate'
  | 'overflow'
  | 'pick-mismatch'
  | 'image-unresolved'
  | 'image-blocked'
  | 'extra-sheets';

/**
 * A validation or import problem.
 * - `error`: the row/file could not become a card and was skipped.
 * - `warning`: the card exists but is flagged.
 */
export interface Issue {
  severity: IssueSeverity;
  code: IssueCode;
  message: string;
  origin?: CardOrigin;
  cardId?: CardId;
  field?: string;
}

/** "answers.csv row 14", "prompts.txt line 3", "deck.json black[2]". */
export function describeOrigin(origin: CardOrigin | undefined): string {
  if (!origin) return '';
  switch (origin.type) {
    case 'manual':
      return 'manually added card';
    case 'sample':
      return 'sample card';
    case 'file': {
      const parts = [origin.file];
      if (origin.sheet) parts.push(`sheet "${origin.sheet}"`);
      if (origin.row !== undefined) parts.push(`row ${origin.row}`);
      else if (origin.line !== undefined) parts.push(`line ${origin.line}`);
      else if (origin.path) parts.push(origin.path);
      return parts.join(' ');
    }
  }
}

export function issue(
  severity: IssueSeverity,
  code: IssueCode,
  message: string,
  extra: Omit<Issue, 'severity' | 'code' | 'message'> = {},
): Issue {
  const where = describeOrigin(extra.origin);
  return { severity, code, message: where ? `${where}: ${message}` : message, ...extra };
}

export const error = (code: IssueCode, message: string, extra?: Omit<Issue, 'severity' | 'code' | 'message'>) =>
  issue('error', code, message, extra);
export const warning = (code: IssueCode, message: string, extra?: Omit<Issue, 'severity' | 'code' | 'message'>) =>
  issue('warning', code, message, extra);
