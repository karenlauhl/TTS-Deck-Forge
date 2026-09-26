import { useEffect, useRef, useState } from 'react';
import type { CardRecord } from '../../core/model/deck';
import { imageRefText, parseImageRef, type ImageRef } from '../../core/model/imageRef';
import { fileToAsset, IMAGE_ACCEPT } from '../assets';
import { imageCache } from '../hooks/useRender';
import { useWorkspace } from '../state/WorkspaceContext';

/** Table cell for an image field: URL or filename text, plus an upload button. */
export function ImageField({ card, fieldKey, n }: { card: CardRecord; fieldKey: string; n: number }) {
  const { ws, dispatch } = useWorkspace();
  const data = card.data as Record<string, unknown>;
  const ref = (data[fieldKey] ?? null) as ImageRef | null;
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);

  const asset = ref?.type === 'asset' ? ws.assets.get(ref.assetId) : undefined;
  useEffect(() => {
    if (!asset) return setThumb(null);
    const url = URL.createObjectURL(asset.blob);
    setThumb(url);
    return () => URL.revokeObjectURL(url);
  }, [asset]);

  const set = (image: ImageRef | null) => dispatch({ type: 'updateCard', id: card.id, patch: { data: { ...data, [fieldKey]: image } } });
  const status = ref?.type === 'url' ? imageCache.remoteStatus(ref.url) : undefined;

  return (
    <div className="image-field">
      {thumb && <img src={thumb} alt="" className="asset-thumb" />}
      <input
        type="text"
        aria-label={`Image of card ${n} (URL or file name)`}
        placeholder="URL or file name"
        value={imageRefText(ref, ws.assets)}
        onChange={(e) => set(parseImageRef(e.target.value))}
      />
      <button type="button" className="btn small" onClick={() => input.current?.click()} aria-label={`Upload image for card ${n}`}>
        Upload
      </button>
      <input
        ref={input}
        type="file"
        hidden
        accept={IMAGE_ACCEPT}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          try {
            const a = await fileToAsset(f, 'image');
            dispatch({ type: 'addAssets', assets: [a] });
            set({ type: 'asset', assetId: a.id });
            setError(null);
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      />
      {error && <span className="small error-text">{error}</span>}
      {status === 'blocked' && <span className="small warn-text">This site blocks use in exports. Upload the file instead.</span>}
      {status === 'failed' && <span className="small warn-text">Couldn't load this image.</span>}
    </div>
  );
}
