import { useId, useMemo, useState } from 'react';
import { planSheets, type SheetPlan } from '../../core/export/sheetPlan';
import { renderThumbnail } from '../../core/export/renderSheets';
import { buildZip } from '../../core/export/zip';
import { savedObjectReadme } from '../../core/tts/readme';
import { buildSavedObject, savedObjectFileBase } from '../../core/tts/savedObject';
import { checkImageUrl, type UrlCheck } from '../../core/tts/urls';
import { downloadBlob } from '../download';
import type { RenderContext } from '../hooks/useRender';
import { preloadImages } from '../preload';
import { useWorkspace } from '../state/WorkspaceContext';

interface Slot {
  fileName: string;
  label: string;
}

function slotsFor(plan: SheetPlan): Slot[] {
  return plan.decks.flatMap((d) => [
    ...d.sheets.map((s) => ({ fileName: s.fileName, label: `${d.label}: sheet ${s.number} (${s.cards.length} cards)` })),
    { fileName: d.backFileName, label: `${d.label}: back image` },
  ]);
}

export function TtsPanel({ rc }: { rc: RenderContext }) {
  const { ws, dispatch } = useWorkspace();
  const deck = ws.deck;
  const plan = useMemo(() => planSheets(rc.template, deck), [rc.template, deck]);
  const slots = slotsFor(plan);
  const [local, setLocal] = useState(false);
  const [bulk, setBulk] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const localId = useId();

  const url = (f: string) => deck.hostedUrls?.[f] ?? '';
  const checks = new Map<string, UrlCheck>(slots.map((s) => [s.fileName, checkImageUrl(url(s.fileName), { allowLocal: local })]));
  const blocking = slots.filter((s) => checks.get(s.fileName)!.level === 'error').length;
  const usesLocal = slots.some((s) => /^file:/i.test(url(s.fileName)));

  const applyBulk = () => {
    const lines = bulk.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    lines.slice(0, slots.length).forEach((u, i) => dispatch({ type: 'setHostedUrl', fileName: slots[i].fileName, url: u }));
    setBulk('');
    setStatus(`Filled ${Math.min(lines.length, slots.length)} of ${slots.length} URLs.${lines.length > slots.length ? ` Ignored ${lines.length - slots.length} extra line(s).` : ''}`);
  };

  const build = async () => {
    setError(null);
    try {
      setStatus('Building…');
      const fileBase = savedObjectFileBase(deck.name);
      const obj = buildSavedObject({
        saveName: fileBase,
        decks: plan.decks.map((d) => ({
          nickname: `${plan.deckName} — ${d.label}`,
          backUrl: url(d.backFileName),
          sheets: d.sheets.map((s) => ({
            faceUrl: url(s.fileName),
            cards: s.cards.map((c) => ({ nickname: rc.template.label(c), description: rc.template.ttsDescription?.(c) ?? '' })),
          })),
        })),
      });
      await preloadImages(deck, ws.assets.keys());
      const first = plan.decks[0]?.sheets[0]?.cards[0];
      const thumb = await renderThumbnail(rc.template, deck, rc.env, first);
      const zip = await buildZip([
        { path: `${fileBase}.json`, data: JSON.stringify(obj, null, 2) },
        { path: `${fileBase}.png`, data: thumb },
        { path: 'README.txt', data: savedObjectReadme(fileBase, plan.decks.map((d) => `${d.label} (${d.cardCount})`), usesLocal) },
      ]);
      downloadBlob(zip, `${fileBase} - TTS saved object.zip`);
      setStatus(`Downloaded. Unzip it and copy "${fileBase}.json" and "${fileBase}.png" into your Saved Objects folder.`);
    } catch (e) {
      setStatus(null);
      setError((e as Error).message);
    }
  };

  if (plan.decks.length === 0) return <p className="empty">Add some cards first.</p>;

  return (
    <div className="tts-panel">
      <section className="panel" aria-labelledby="tts-heading">
        <h2 id="tts-heading">Build a Tabletop Simulator saved object</h2>
        <ol className="steps">
          <li>Download the ZIP from the <em>Export sheets</em> step.</li>
          <li>
            Host each image: in Tabletop Simulator open <strong>Modding › Cloud Manager</strong>, upload the files, and copy each URL. Any host
            that gives a direct image link also works.
          </li>
          <li>Paste the URLs below and download the saved object.</li>
        </ol>
        <p className="muted small">
          If you change cards or style after uploading, export and upload again. The sheets must match this deck exactly. URLs are saved with
          the deck.
        </p>
      </section>

      <section className="panel" aria-labelledby="urls-heading">
        <h2 id="urls-heading">Image URLs</h2>
        <details className="bulk">
          <summary>Paste all URLs at once</summary>
          <label className="stack">
            One URL per line, in the order listed below.
            <textarea rows={Math.min(8, slots.length + 1)} value={bulk} onChange={(e) => setBulk(e.target.value)} />
          </label>
          <button type="button" className="btn small" onClick={applyBulk} disabled={!bulk.trim()}>
            Fill URLs
          </button>
        </details>

        <div className="url-list">
          {slots.map((s) => {
            const check = checks.get(s.fileName)!;
            const value = url(s.fileName);
            const id = `url-${s.fileName}`;
            return (
              <div key={s.fileName} className={`url-row ${value ? check.level : ''}`}>
                <label htmlFor={id}>
                  {s.label}
                  <span className="muted small file-name">{s.fileName}</span>
                </label>
                <input
                  id={id}
                  type="url"
                  inputMode="url"
                  spellCheck={false}
                  placeholder="https://…"
                  value={value}
                  aria-invalid={value !== '' && check.level === 'error'}
                  aria-describedby={`${id}-msg`}
                  onChange={(e) => dispatch({ type: 'setHostedUrl', fileName: s.fileName, url: e.target.value })}
                />
                <span id={`${id}-msg`} className="url-msg small">
                  {value ? check.message : ''}
                </span>
              </div>
            );
          })}
        </div>

        <label className="check local-mode" htmlFor={localId}>
          <input id={localId} type="checkbox" checked={local} onChange={(e) => setLocal(e.target.checked)} />
          Local test mode (allow <code>file:///</code> paths)
        </label>
        {local && (
          <p className="notice warn" role="alert">
            Local test mode is for checking your deck on your own computer. <strong>Other players will not see the cards in multiplayer</strong>
            , because they can't read files on your disk. Use hosted URLs before playing with others.
          </p>
        )}

        <div className="toolbar-row">
          <button type="button" className="btn primary" onClick={build} disabled={blocking > 0}>
            Download saved object
          </button>
          {blocking > 0 && (
            <span className="muted">
              {blocking} URL{blocking > 1 ? 's' : ''} missing or invalid
            </span>
          )}
        </div>
        <p aria-live="polite" className="muted">
          {status}
        </p>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
      </section>

      <section className="panel" aria-labelledby="install-heading">
        <h2 id="install-heading">Install and spawn</h2>
        <p>Copy the .json and .png files from the download into your Saved Objects folder:</p>
        <ul>
          <li>
            Windows: <code>Documents\My Games\Tabletop Simulator\Saves\Saved Objects\</code>
          </li>
          <li>
            macOS: <code>~/Library/Tabletop Simulator/Saves/Saved Objects/</code>
          </li>
          <li>
            Linux: <code>~/.local/share/Tabletop Simulator/Saves/Saved Objects/</code>
          </li>
        </ul>
        <p>
          In a game, open <strong>Objects › Saved Objects</strong> and click the deck to spawn it. Each deck appears face down, side by side.
        </p>
      </section>
    </div>
  );
}
