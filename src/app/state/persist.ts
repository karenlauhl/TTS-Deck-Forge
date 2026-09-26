import type { Asset, Deck } from '../../core/model/deck';

// Autosave to IndexedDB. Stays in this browser; nothing is uploaded.
const DB = 'tts-deck-forge';
const STORE = 'kv';
const KEY = 'workspace';

interface Saved {
  version: 1;
  deck: Deck;
  assets: Asset[];
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function loadWorkspace(): Promise<{ deck: Deck; assets: Asset[] } | null> {
  try {
    const saved = await tx<Saved | undefined>('readonly', (s) => s.get(KEY));
    if (!saved || saved.version !== 1 || !saved.deck) return null;
    return { deck: saved.deck, assets: saved.assets ?? [] };
  } catch {
    return null;
  }
}

export async function saveWorkspace(deck: Deck, assets: Iterable<Asset>): Promise<boolean> {
  try {
    const value: Saved = { version: 1, deck, assets: [...assets] };
    await tx('readwrite', (s) => s.put(value, KEY));
    return true;
  } catch {
    return false;
  }
}
