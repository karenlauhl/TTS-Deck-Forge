import { useMemo } from 'react';
import type { CardRecord } from '../../core/model/deck';
import { CardCanvas } from '../components/CardCanvas';
import { StyleForm } from '../components/StyleForm';
import type { RenderContext } from '../hooks/useRender';
import { useWorkspace } from '../state/WorkspaceContext';

export function StylePanel({ rc }: { rc: RenderContext }) {
  const { ws } = useWorkspace();
  const { template } = rc;

  // One example per kind: the deck's first card, or a sample card.
  const examples = useMemo(
    () =>
      template.kinds.map((k) => {
        const own = ws.deck.cards.find((c) => c.kind === k.id);
        const sample = template.samples.cards.find((c) => c.kind === k.id);
        const card: CardRecord = own ?? {
          id: `example-${k.id}`,
          kind: k.id,
          count: 1,
          data: template.normalize(k.id, sample?.data ?? template.createCard(k.id)),
          origin: { type: 'sample' },
        };
        return { kind: k, card };
      }),
    [template, ws.deck.cards],
  );

  return (
    <div className="style-layout">
      <section className="panel" aria-labelledby="style-heading">
        <h2 id="style-heading">Card style</h2>
        <StyleForm template={template} />
      </section>
      <section className="panel style-preview" aria-labelledby="style-preview-heading">
        <h2 id="style-preview-heading">Live preview</h2>
        <div className="style-preview-grid">
          {examples.map(({ kind, card }) => (
            <div key={kind.id} className="style-pair">
              <figure className="card-fig">
                <CardCanvas rc={rc} style={ws.deck.style} width={200} card={card} label={`${kind.label} example: ${template.label(card)}`} className="rounded shadow" />
                <figcaption className="muted small">{kind.label}</figcaption>
              </figure>
              <figure className="card-fig">
                <CardCanvas rc={rc} style={ws.deck.style} width={200} backKind={kind.id} label={`${kind.label} back`} className="rounded shadow" />
                <figcaption className="muted small">Back</figcaption>
              </figure>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
