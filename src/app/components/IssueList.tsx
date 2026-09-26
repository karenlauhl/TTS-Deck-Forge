import type { Issue } from '../../core/model/issues';

interface Props {
  issues: Issue[];
  onSelectCard?: (id: string) => void;
  max?: number;
}

export function IssueList({ issues, onSelectCard, max = 200 }: Props) {
  if (issues.length === 0) return null;
  const shown = issues.slice(0, max);
  return (
    <ul className="issue-list">
      {shown.map((i, n) => (
        <li key={n} className={`issue ${i.severity}`}>
          <span className="issue-badge" aria-hidden="true">
            {i.severity === 'error' ? '✕' : '!'}
          </span>
          <span className="sr-only">{i.severity}: </span>
          {i.cardId && onSelectCard ? (
            <button type="button" className="link" onClick={() => onSelectCard(i.cardId!)}>
              {i.message}
            </button>
          ) : (
            <span>{i.message}</span>
          )}
        </li>
      ))}
      {issues.length > max && <li className="muted">…and {issues.length - max} more</li>}
    </ul>
  );
}
