import { useEffect, useMemo, useState } from 'react';
import type { CardId, CardRecord } from '../../core/model/deck';
import { MAX_COUNT } from '../../core/import/table';
import type { FieldDef } from '../../core/template/types';
import type { Analysis, RenderContext } from '../hooks/useRender';
import { useWorkspace } from '../state/WorkspaceContext';
import { newCardId } from '../../core/model/ids';

const PAGE = 150;

interface Props {
  rc: RenderContext;
  analysis: Analysis;
  selectedId: CardId | null;
  onSelect: (id: CardId) => void;
  /** Extra per-field editors (e.g. images) supplied by the app. */
  renderField?: (field: FieldDef, card: CardRecord, index: number) => React.ReactNode;
}

export function CardTable({ rc, analysis, selectedId, onSelect, renderField }: Props) {
  const { ws, dispatch } = useWorkspace();
  const { template } = rc;
  const cards = ws.deck.cards;
  const [kind, setKind] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [focusId, setFocusId] = useState<CardId | null>(null);

  const multiKind = template.kinds.length > 1;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards
      .map((c, i) => ({ card: c, index: i }))
      .filter(({ card }) => kind === 'all' || card.kind === kind)
      .filter(({ card }) => !onlyProblems || analysis.issuesByCard.has(card.id))
      .filter(({ card }) => !q || template.label(card).toLowerCase().includes(q) || JSON.stringify(card.data).toLowerCase().includes(q));
  }, [cards, kind, query, onlyProblems, analysis, template]);

  // Jump to a card selected elsewhere (e.g. from the issue list).
  useEffect(() => {
    if (!selectedId) return;
    const pos = rows.findIndex((r) => r.card.id === selectedId);
    if (pos >= limit) setLimit(pos + 1);
    requestAnimationFrame(() => document.querySelector(`[data-card-id="${selectedId}"]`)?.scrollIntoView({ block: 'nearest' }));
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!focusId) return;
    const el = document.querySelector<HTMLElement>(`[data-card-id="${focusId}"] textarea, [data-card-id="${focusId}"] input`);
    el?.focus();
    el?.scrollIntoView({ block: 'center' });
    setFocusId(null);
  }, [focusId, cards.length]);

  const addCard = (k: string) => {
    const card: CardRecord = { id: newCardId(), kind: k, data: template.createCard(k), count: 1, origin: { type: 'manual' } };
    dispatch({ type: 'addCards', cards: [card] });
    setKind((cur) => (cur === 'all' || cur === k ? cur : 'all'));
    setQuery('');
    setOnlyProblems(false);
    setLimit(Number.MAX_SAFE_INTEGER);
    setFocusId(card.id);
    onSelect(card.id);
  };

  const fieldsFor = (k: string) => template.fields.filter((f) => !f.kinds || f.kinds.includes(k));
  const allFields = template.fields;

  return (
    <section aria-labelledby="cards-heading" className="card-table-section">
      <div className="table-toolbar">
        <h2 id="cards-heading">
          Cards <span className="muted">({cards.length})</span>
        </h2>
        <div className="toolbar-row">
          {template.kinds.map((k) => (
            <button key={k.id} type="button" className="btn" onClick={() => addCard(k.id)}>
              + Add {multiKind ? k.label.split(' ')[0].toLowerCase() : ''} card
            </button>
          ))}
        </div>
        <div className="toolbar-row filters">
          {multiKind && (
            <label>
              Show{' '}
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="all">All types</option>
                {template.kinds.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Search <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <label className="check">
            <input type="checkbox" checked={onlyProblems} onChange={(e) => setOnlyProblems(e.target.checked)} /> Only cards with problems
          </label>
        </div>
      </div>

      {cards.length === 0 ? (
        <p className="empty">No cards yet. Import a file, add cards by hand, or load the sample deck.</p>
      ) : rows.length === 0 ? (
        <p className="empty">No cards match the filters.</p>
      ) : (
        <div className="table-wrap">
          <table className="card-table">
            <thead>
              <tr>
                <th scope="col">#</th>
                {multiKind && <th scope="col">Type</th>}
                {allFields.map((f) => (
                  <th scope="col" key={f.key}>
                    {f.label}
                  </th>
                ))}
                <th scope="col">Copies</th>
                <th scope="col">
                  <span className="sr-only">Status</span>
                </th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map(({ card, index }) => {
                const n = index + 1;
                const issues = analysis.issuesByCard.get(card.id) ?? [];
                const worst = issues.some((i) => i.severity === 'error') ? 'error' : issues.length ? 'warning' : '';
                const applicable = new Set(fieldsFor(card.kind).map((f) => f.key));
                return (
                  <tr
                    key={card.id}
                    data-card-id={card.id}
                    className={`${card.id === selectedId ? 'selected' : ''} ${worst}`}
                    onFocusCapture={() => onSelect(card.id)}
                    onClick={() => onSelect(card.id)}
                  >
                    <td className="num">{n}</td>
                    {multiKind && (
                      <td>
                        <select
                          aria-label={`Type of card ${n}`}
                          value={card.kind}
                          onChange={(e) => dispatch({ type: 'updateCard', id: card.id, patch: { kind: e.target.value } })}
                        >
                          {template.kinds.map((k) => (
                            <option key={k.id} value={k.id}>
                              {k.label.split(' ')[0]}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
                    {allFields.map((f) => (
                      <td key={f.key} className={`field-${f.type}`}>
                        {applicable.has(f.key) ? (
                          renderField && f.type === 'image' ? (
                            renderField(f, card, n)
                          ) : (
                            <FieldInput field={f} card={card} n={n} />
                          )
                        ) : (
                          <span className="muted" aria-label="not applicable">
                            —
                          </span>
                        )}
                      </td>
                    ))}
                    <td>
                      <input
                        type="number"
                        className="count-input"
                        aria-label={`Copies of card ${n}`}
                        min={1}
                        max={MAX_COUNT}
                        value={card.count}
                        onChange={(e) => {
                          const v = Math.round(Number(e.target.value));
                          if (Number.isFinite(v)) dispatch({ type: 'updateCard', id: card.id, patch: { count: Math.min(MAX_COUNT, Math.max(1, v)) } });
                        }}
                      />
                    </td>
                    <td className="status">
                      {worst && (
                        <span className={`issue-badge ${worst}`} title={issues.map((i) => i.message).join('\n')} role="img" aria-label={issues.map((i) => i.message).join('; ')}>
                          {worst === 'error' ? '✕' : '!'}
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn icon danger"
                        aria-label={`Delete card ${n}`}
                        title="Delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch({ type: 'deleteCards', ids: [card.id] });
                        }}
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length > limit && (
            <button type="button" className="btn show-more" onClick={() => setLimit((l) => l + PAGE)}>
              Show more ({rows.length - limit} hidden)
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function FieldInput({ field, card, n }: { field: FieldDef; card: CardRecord; n: number }) {
  const { dispatch } = useWorkspace();
  const data = card.data as Record<string, unknown>;
  const value = data[field.key];
  const label = `${field.label} of card ${n}`;
  const set = (v: unknown) => dispatch({ type: 'updateCard', id: card.id, patch: { data: { ...data, [field.key]: v } } });
  const commit = () => dispatch({ type: 'normalizeCard', id: card.id });

  if (field.type === 'number') {
    return (
      <input
        type="number"
        aria-label={label}
        min={field.min}
        max={field.max}
        value={typeof value === 'number' ? value : ''}
        onChange={(e) => set(e.target.value === '' ? undefined : Math.round(Number(e.target.value)))}
        onBlur={commit}
      />
    );
  }
  if (field.type === 'multiline') {
    const text = typeof value === 'string' ? value : '';
    return (
      <textarea
        aria-label={label}
        value={text}
        placeholder={field.placeholder}
        rows={Math.min(6, Math.max(1, Math.ceil(text.length / 60), text.split('\n').length))}
        onChange={(e) => set(e.target.value)}
        onBlur={commit}
      />
    );
  }
  return (
    <input
      type="text"
      aria-label={label}
      value={typeof value === 'string' ? value : ''}
      placeholder={field.placeholder}
      onChange={(e) => set(e.target.value)}
      onBlur={commit}
    />
  );
}
