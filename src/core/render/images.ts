import type { AssetId, AssetMap } from '../model/deck';

type Entry =
  | { status: 'loading' }
  | { status: 'ready'; image: CanvasImageSource }
  | { status: 'error'; reason: 'blocked' | 'failed' };

/**
 * Decodes uploaded images and remote URLs for canvas drawing.
 * Remote images are loaded with CORS so exported sheets don't get tainted;
 * hosts that don't allow that are reported as 'blocked'.
 */
export class ImageCache {
  private assets = new Map<AssetId, Entry>();
  private remote = new Map<string, Entry>();
  private listeners = new Set<() => void>();
  private source: AssetMap = new Map();

  setAssets(assets: AssetMap): void {
    this.source = assets;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private changed() {
    for (const fn of this.listeners) fn();
  }

  asset(id: AssetId | null | undefined): CanvasImageSource | undefined {
    if (!id) return undefined;
    const e = this.assets.get(id);
    if (e) return e.status === 'ready' ? e.image : undefined;
    const a = this.source.get(id);
    if (!a) return undefined;
    this.assets.set(id, { status: 'loading' });
    createImageBitmap(a.blob).then(
      (image) => {
        this.assets.set(id, { status: 'ready', image });
        this.changed();
      },
      () => {
        this.assets.set(id, { status: 'error', reason: 'failed' });
        this.changed();
      },
    );
    return undefined;
  }

  remoteImage(url: string): CanvasImageSource | undefined {
    const e = this.remote.get(url);
    if (e) return e.status === 'ready' ? e.image : undefined;
    this.remote.set(url, { status: 'loading' });
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      this.remote.set(url, { status: 'ready', image: img });
      this.changed();
    };
    img.onerror = () => {
      // Distinguish "host blocks CORS" from "broken link" by retrying without CORS.
      const probe = new Image();
      probe.onload = () => {
        this.remote.set(url, { status: 'error', reason: 'blocked' });
        this.changed();
      };
      probe.onerror = () => {
        this.remote.set(url, { status: 'error', reason: 'failed' });
        this.changed();
      };
      probe.src = url;
    };
    img.src = url;
    return undefined;
  }

  remoteStatus(url: string): Entry['status'] | 'blocked' | 'failed' | undefined {
    const e = this.remote.get(url);
    if (!e) return undefined;
    return e.status === 'error' ? e.reason : e.status;
  }

  /** Resolves once every image requested so far has finished loading (or failed). */
  async settled(): Promise<void> {
    const pending = () => [...this.assets.values(), ...this.remote.values()].some((e) => e.status === 'loading');
    while (pending()) await new Promise((r) => setTimeout(r, 30));
  }
}
