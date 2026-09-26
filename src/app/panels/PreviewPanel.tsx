import { useState } from 'react';
import { CardCanvas } from '../components/CardCanvas';
import type { Analysis, RenderContext } from '../hooks/useRender';
import { useWorkspace } from '../state/WorkspaceContext';

export function PreviewPanel({ rc, analysis }: { rc: RenderContext; analysis: Analysis }) {
  const { ws } = useWorkspace();
  const [size, setSize] = useState(180);
  const { template } = rc;
  const style = ws.deck.style;

  return (
    <div className="preview-panel">
      <div className="toolbar-row">
        <label>
          Card size{' '}
          <input type="range" min={120} max={320} step={10} value={size} onChange={(e) => setSize(Number(e.target.value))} />
        </label>
      </div>
      {template.kinds.map((k) => {
        const cards = ws.deck.cards.filter((c) => c.kind === k.id);
        return (
          <section key={k.id} aria-labelledby={`pv-${k.id}`} className="panel">
            <h2 id={`pv-${k.id}`}>
              {k.label} <span className="muted">({cards.length})</span>
            </h2>
            <div className="card-grid" style={{ gridTemplateColumns: `repeat(auto-fill, ${size}px)` }}>
              <figure className="card-fig">
                <CardCanvas rc={rc} style={style} width={size} backKind={k.id} label={`${k.label} back`} className="rounded shadow" />
                <figcaption className="muted small">Back</figcaption>
              </figure>
              {cards.map((c) => {
                const overflow = analysis.layouts.get(c.id)?.fits === false;
                return (
                  <figure key={c.id} className={`card-fig${overflow ? ' overflow' : ''}`}>
                    <CardCanvas rc={rc} style={style} width={size} card={c} lazy label={template.label(c)} className="rounded shadow" />
                    {(c.count > 1 || overflow) && (
                      <figcaption className="small">
                        {c.count > 1 && <span>×{c.count}</span>} {overflow && <span className="warn-text">Text doesn't fit</span>}
                      </figcaption>
                    )}
                  </figure>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
