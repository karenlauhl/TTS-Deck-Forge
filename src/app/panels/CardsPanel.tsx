import { useState } from 'react';
import type { CardId } from '../../core/model/deck';
import { CardCanvas } from '../components/CardCanvas';
import { CardTable } from '../components/CardTable';
import { DropZone } from '../components/DropZone';
import { IssueList } from '../components/IssueList';
import { SampleDownloads } from '../components/SampleDownloads';
import type { Analysis, RenderContext } from '../hooks/useRender';
import { CARD_FILE_ACCEPT } from '../importFiles';
import { useWorkspace } from '../state/WorkspaceContext';
import type { CardTableProps } from './types';

interface Props {
  rc: RenderContext;
  analysis: Analysis;
  onFiles: (files: File[]) => void;
  busy: boolean;
  accept?: string;
  hint?: React.ReactNode;
  renderField?: CardTableProps['renderField'];
}

export function CardsPanel({ rc, analysis, onFiles, busy, accept = CARD_FILE_ACCEPT, hint, renderField }: Props) {
  const { ws, dispatch } = useWorkspace();
  const [selectedId, setSelectedId] = useState<CardId | null>(null);
  const selected = ws.deck.cards.find((c) => c.id === selectedId) ?? null;
  const selectedIssues = selected ? (analysis.issuesByCard.get(selected.id) ?? []) : [];
  const deckIssues = analysis.issues;
  const errors = deckIssues.filter((i) => i.severity === 'error').length;

  return (
    <div className="cards-layout">
      <div className="cards-main">
        <section aria-labelledby="import-heading" className="panel">
          <h2 id="import-heading">Import</h2>
          <DropZone
            accept={accept}
            onFiles={onFiles}
            busy={busy}
            label="Choose files…"
            hint={hint ?? <>.txt, .csv, .xlsx or .json. Imported cards are added to the deck. Drop a .deck.json to reopen a saved deck.</>}
          />
          <SampleDownloads template={rc.template} />

          <div aria-live="polite">
            {ws.reports.map((r) => (
              <div key={r.id} className={`report ${r.issues.some((i) => i.severity === 'error') ? 'has-errors' : ''}`}>
                <div className="report-head">
                  <strong>{r.file}</strong>: added {r.added} card{r.added === 1 ? '' : 's'}
                  {r.issues.length > 0 && `, ${r.issues.length} problem${r.issues.length === 1 ? '' : 's'}`}
                  <button type="button" className="btn small ghost" onClick={() => dispatch({ type: 'dismissReport', id: r.id })} aria-label={`Dismiss report for ${r.file}`}>
                    Dismiss
                  </button>
                </div>
                <IssueList issues={r.issues} />
              </div>
            ))}
          </div>
        </section>

        {deckIssues.length > 0 && (
          <section aria-labelledby="problems-heading" className="panel">
            <h2 id="problems-heading">
              Problems <span className="muted">({deckIssues.length}{errors ? `, ${errors} errors` : ''})</span>
            </h2>
            <IssueList issues={deckIssues} onSelectCard={setSelectedId} />
          </section>
        )}

        <CardTable rc={rc} analysis={analysis} selectedId={selectedId} onSelect={setSelectedId} renderField={renderField} />
      </div>

      <aside className="cards-aside" aria-label="Selected card preview">
        <div className="sticky">
          <h2>Preview</h2>
          {selected ? (
            <>
              <CardCanvas rc={rc} style={ws.deck.style} width={260} card={selected} label={`Preview: ${rc.template.label(selected)}`} className="rounded shadow" />
              <IssueList issues={selectedIssues} />
            </>
          ) : (
            <p className="muted">Select a card to preview it.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
