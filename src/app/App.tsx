import { useState } from 'react';
import { toCardRecords } from '../core/import/cards';
import { error } from '../core/model/issues';
import { randomId } from '../core/model/ids';
import { listTemplates } from '../templates';
import { Tabs, type TabDef } from './components/Tabs';
import { useAnalysis, useRenderContext } from './hooks/useRender';
import { importCardFiles } from './importFiles';
import { CardsPanel } from './panels/CardsPanel';
import { PreviewPanel } from './panels/PreviewPanel';
import { useWorkspace } from './state/WorkspaceContext';

type TabId = 'cards' | 'preview';

export function App() {
  const { ws, dispatch, ready, autosave } = useWorkspace();
  const rc = useRenderContext();
  const analysis = useAnalysis(rc);
  const [tab, setTab] = useState<TabId>('cards');
  const [busy, setBusy] = useState(false);
  const { template } = rc;
  const templates = listTemplates();

  const onFiles = async (files: File[]) => {
    setBusy(true);
    try {
      await importCardFiles(files, template, dispatch, (file) =>
        dispatch({
          type: 'addReport',
          report: { id: randomId('r'), file: file.name, added: 0, issues: [error('unsupported-format', 'deck files are not supported yet', { origin: { type: 'file', file: file.name } })] },
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  const loadSample = () => {
    if (ws.deck.cards.length > 0 && !confirm('Replace the current cards with the sample deck?')) return;
    dispatch({ type: 'clearCards' });
    dispatch({ type: 'setName', name: template.samples.deckName });
    dispatch({
      type: 'addCards',
      cards: toCardRecords(
        template,
        template.samples.cards.map((c) => ({ ...c, origin: { type: 'sample' as const } })),
      ),
    });
  };

  const tabs: TabDef<TabId>[] = [
    { id: 'cards', label: 'Cards', badge: ws.deck.cards.length || '' },
    { id: 'preview', label: 'Preview' },
  ];

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <img src="./favicon.svg" alt="" width={28} height={28} />
          <span>TTS Deck Forge</span>
        </div>
        <div className="deck-meta">
          <label>
            Deck name
            <input type="text" value={ws.deck.name} onChange={(e) => dispatch({ type: 'setName', name: e.target.value })} />
          </label>
          <label>
            Card type
            <select
              value={ws.deck.templateId}
              onChange={(e) => {
                if (ws.deck.cards.length > 0 && !confirm('Switching card type clears the current cards. Continue?')) return;
                dispatch({ type: 'setTemplate', templateId: e.target.value });
              }}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn" onClick={loadSample}>
            Load sample deck
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => ws.deck.cards.length > 0 && confirm('Delete all cards in this deck?') && dispatch({ type: 'clearCards' })}
          >
            Clear cards
          </button>
        </div>
      </header>

      <p className="template-desc muted">{template.description}</p>

      <nav>
        <Tabs tabs={tabs} active={tab} onChange={setTab} label="Steps" />
      </nav>

      <main>
        {!ready ? (
          <p className="muted">Loading your saved deck…</p>
        ) : (
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0} className="tabpanel">
            {tab === 'cards' && <CardsPanel rc={rc} analysis={analysis} onFiles={onFiles} busy={busy} />}
            {tab === 'preview' && <PreviewPanel rc={rc} analysis={analysis} />}
          </div>
        )}
      </main>

      <footer className="app-footer muted small">
        <p>
          Everything runs in your browser. Your cards and images are never uploaded.
          {autosave === 'ok' ? ' Your deck is autosaved in this browser.' : ' Autosave is unavailable in this browser (private mode?), so export your deck JSON to keep it.'}
        </p>
        <p>
          Open source (MIT) · <a href="https://github.com/karenlauhl/TTS-Deck-Forge">Source on GitHub</a> · Not affiliated with Tabletop Simulator or Berserk Games.
        </p>
      </footer>
    </div>
  );
}
