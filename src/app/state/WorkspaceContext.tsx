import { createContext, useContext, useEffect, useReducer, useRef, useState, type Dispatch, type ReactNode } from 'react';
import { hasTemplate } from '../../core/template';
import { initialWorkspace, reducer, type Action, type Workspace } from './store';
import { loadWorkspace, saveWorkspace } from './persist';

interface Ctx {
  ws: Workspace;
  dispatch: Dispatch<Action>;
  /** False until the autosaved workspace has been restored. */
  ready: boolean;
  autosave: 'ok' | 'unavailable';
}

const WorkspaceContext = createContext<Ctx | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [ws, dispatch] = useReducer(reducer, undefined, initialWorkspace);
  const [ready, setReady] = useState(false);
  const [autosave, setAutosave] = useState<'ok' | 'unavailable'>('ok');
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    loadWorkspace().then((saved) => {
      if (saved && hasTemplate(saved.deck.templateId)) dispatch({ type: 'load', ...saved });
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      saveWorkspace(ws.deck, ws.assets.values()).then((ok) => setAutosave(ok ? 'ok' : 'unavailable'));
    }, 400);
  }, [ws.deck, ws.assets, ready]);

  return <WorkspaceContext.Provider value={{ ws, dispatch, ready, autosave }}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): Ctx {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace outside WorkspaceProvider');
  return ctx;
}
