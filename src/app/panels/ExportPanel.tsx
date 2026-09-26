import { useMemo, useState } from 'react';
import { deckFileName, serializeDeck } from '../../core/deckfile/deckfile';
import { sheetExportReadme } from '../../core/export/readme';
import { nextFrame, renderBack, renderSheet, type ImageFormat } from '../../core/export/renderSheets';
import { planSheets, withExtension } from '../../core/export/sheetPlan';
import { buildZip, type ZipEntry } from '../../core/export/zip';
import { SheetPreview } from '../components/SheetPreview';
import { downloadBlob } from '../download';
import type { Analysis, RenderContext } from '../hooks/useRender';
import { preloadImages } from '../preload';
import { useWorkspace } from '../state/WorkspaceContext';

export const APP_GENERATOR = 'TTS Deck Forge';

export function ExportPanel({ rc, analysis }: { rc: RenderContext; analysis: Analysis }) {
  const { ws } = useWorkspace();
  const deck = ws.deck;
  const plan = useMemo(() => planSheets(rc.template, deck), [rc.template, deck]);
  const [sel, setSel] = useState({ deck: 0, sheet: 0 });
  const [format, setFormat] = useState<ImageFormat>('png');
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pd = plan.decks[Math.min(sel.deck, plan.decks.length - 1)];
  const sheet = pd?.sheets[Math.min(sel.sheet, pd.sheets.length - 1)];
  const overflow = analysis.issues.filter((i) => i.code === 'overflow').length;
  const errors = analysis.issues.filter((i) => i.severity === 'error').length;

  const downloadDeckJson = async () => {
    const file = await serializeDeck(deck, ws.assets, APP_GENERATOR);
    downloadBlob(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }), deckFileName(plan.baseName));
  };

  const exportZip = async () => {
    const problems = [errors && `${errors} card${errors > 1 ? 's have' : ' has'} errors`, overflow && `${overflow} card${overflow > 1 ? "s' text doesn't" : "'s text doesn't"} fit`].filter(Boolean);
    if (problems.length && !confirm(`${problems.join(' and ')}. Export anyway?`)) return;
    setError(null);
    try {
      setProgress('Loading fonts and images…');
      await preloadImages(deck, ws.assets.keys());
      const total = plan.decks.reduce((n, d) => n + d.sheets.length, 0);
      const entries: ZipEntry[] = [];
      let done = 0;
      for (const d of plan.decks) {
        for (const s of d.sheets) {
          setProgress(`Rendering sheet ${++done} of ${total}…`);
          await nextFrame();
          entries.push({ path: `sheets/${withExtension(s.fileName, format)}`, data: await renderSheet(rc.template, deck, rc.env, plan, d, s, format) });
        }
        entries.push({ path: `backs/${d.backFileName}`, data: await renderBack(rc.template, deck, rc.env, d.kind) });
      }
      setProgress('Packing zip…');
      const deckJson = deckFileName(plan.baseName);
      entries.push({ path: deckJson, data: JSON.stringify(await serializeDeck(deck, ws.assets, APP_GENERATOR), null, 2) });
      entries.push({ path: 'README.txt', data: sheetExportReadme(plan, deckJson, format) });
      downloadBlob(await buildZip(entries), `${plan.baseName}-tts-sheets.zip`);
      setProgress(null);
    } catch (e) {
      setProgress(null);
      setError((e as Error).message);
    }
  };

  if (plan.decks.length === 0) {
    return <p className="empty">Add some cards first.</p>;
  }

  return (
    <div className="export-panel">
      <section className="panel" aria-labelledby="export-heading">
        <h2 id="export-heading">Deck sheets</h2>
        <p>
          Cards are laid out 10 × 7 per sheet ({plan.sheet.width} × {plan.sheet.height} px), up to 69 cards per sheet. The last slot shows the
          back, because TTS reserves it for hidden cards.
        </p>
        <ul className="plan-list">
          {plan.decks.map((d) => (
            <li key={d.kind}>
              <strong>{d.label}</strong>: {d.cardCount} card{d.cardCount === 1 ? '' : 's'} on {d.sheets.length} sheet{d.sheets.length === 1 ? '' : 's'} + back
              image
              {d.cardCount === 1 && <span className="muted"> (a single card: it spawns as one card, not a deck)</span>}
            </li>
          ))}
        </ul>
        {(errors > 0 || overflow > 0) && (
          <p className="notice warn" role="status">
            {errors > 0 && `${errors} card${errors > 1 ? 's have' : ' has'} errors. `}
            {overflow > 0 && `${overflow} card${overflow > 1 ? 's have' : ' has'} text that doesn't fit and will be cut off. `}
            Check the Cards tab.
          </p>
        )}
        <div className="toolbar-row">
          <label>
            Image format{' '}
            <select value={format} onChange={(e) => setFormat(e.target.value as ImageFormat)}>
              <option value="png">PNG (sharpest; best for text)</option>
              <option value="jpeg">JPEG (much smaller; best for photos)</option>
            </select>
          </label>
          <button type="button" className="btn primary" onClick={exportZip} disabled={!!progress || !rc.fontsReady}>
            Download ZIP
          </button>
          <button type="button" className="btn" onClick={downloadDeckJson} disabled={!!progress}>
            Download deck JSON only
          </button>
        </div>
        <p aria-live="polite" className="muted">
          {progress}
        </p>
        {error && (
          <p className="notice error" role="alert">
            Export failed: {error}
          </p>
        )}
        <p className="muted small">
          The ZIP contains every sheet, the back images, the deck JSON (to re-open this deck later) and a README with Tabletop Simulator import
          steps.
        </p>
      </section>

      {pd && sheet && (
        <section className="panel" aria-labelledby="sheet-preview-heading">
          <h2 id="sheet-preview-heading">Sheet preview</h2>
          <div className="toolbar-row sheet-picker" role="group" aria-label="Choose a sheet">
            {plan.decks.map((d, di) =>
              d.sheets.map((s, si) => (
                <button
                  key={`${d.kind}-${s.number}`}
                  type="button"
                  className={`btn small${di === sel.deck && si === sel.sheet ? ' primary' : ''}`}
                  aria-pressed={di === sel.deck && si === sel.sheet}
                  onClick={() => setSel({ deck: di, sheet: si })}
                >
                  {d.label.split(' ')[0]} {s.number}
                </button>
              )),
            )}
          </div>
          <p className="muted small">
            {withExtension(sheet.fileName, format)}: {sheet.cards.length} cards
          </p>
          <div className="sheet-wrap">
            <SheetPreview rc={rc} deck={deck} plan={plan} pd={pd} sheet={sheet} width={820} />
          </div>
        </section>
      )}
    </div>
  );
}
