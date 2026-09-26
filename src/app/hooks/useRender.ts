import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { CardId, CardRecord } from '../../core/model/deck';
import type { Issue } from '../../core/model/issues';
import { assetFontFamily, DEFAULT_FONT_FAMILY, ensureFontsLoaded, registerFontAsset } from '../../core/render/fonts';
import { ImageCache } from '../../core/render/images';
import { createCanvasMeasurer } from '../../core/render/measure';
import type { AnyTemplate, CardLayoutBase, RenderEnv } from '../../core/template/types';
import { validateCards } from '../../core/validate/validateCards';
import { isImageRef } from '../../core/model/imageRef';
import { warning } from '../../core/model/issues';
import { getTemplate } from '../../templates';
import { useWorkspace } from '../state/WorkspaceContext';

// One measurer and image cache for the whole app.
const measurer = createCanvasMeasurer();
export const imageCache = new ImageCache();

/** Text of every card, reduced to its set of characters: enough to load the right font subsets. */
function charSet(cards: readonly CardRecord[], extra: string): string {
  const set = new Set<string>(extra);
  for (const c of cards) for (const v of Object.values(c.data as Record<string, unknown>)) if (typeof v === 'string') for (const ch of v) set.add(ch);
  return [...set].sort().join('');
}

export interface RenderContext {
  template: AnyTemplate;
  env: RenderEnv;
  /** Changes whenever fonts or images finish loading: redraw when it changes. */
  version: number;
  fontsReady: boolean;
}

export function useRenderContext(): RenderContext {
  const { ws } = useWorkspace();
  const template = getTemplate(ws.deck.templateId);
  const [version, setVersion] = useState(0);
  const [fontsReady, setFontsReady] = useState(false);

  imageCache.setAssets(ws.assets);
  useEffect(() => imageCache.subscribe(() => setVersion((v) => v + 1)), []);

  const chars = charSet(ws.deck.cards, ws.deck.name + 'PICK0123456789');
  const fontAssets = [...ws.assets.values()].filter((a) => a.role === 'font');
  const fontKey = fontAssets.map((a) => a.id).join(',');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const a of fontAssets) {
        try {
          await registerFontAsset(a);
        } catch {
          /* reported where the font is chosen */
        }
      }
      await ensureFontsLoaded([DEFAULT_FONT_FAMILY, ...fontAssets.map((a) => assetFontFamily(a.id))], [400, 700, 800], chars);
      if (cancelled) return;
      measurer.reset();
      setFontsReady(true);
      setVersion((v) => v + 1);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chars, fontKey]);

  const env = useMemo<RenderEnv>(
    () => ({
      measure: measurer,
      fontFamily: (id) => (id && ws.assets.has(id) ? assetFontFamily(id) : DEFAULT_FONT_FAMILY),
      deckName: ws.deck.name,
      image: (id) => imageCache.asset(id),
      remoteImage: (url) => imageCache.remoteImage(url),
    }),
    // version: new env identity after loads so memoised layouts recompute
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ws.assets, ws.deck.name, version],
  );

  return { template, env, version, fontsReady };
}

export interface Analysis {
  layouts: Map<CardId, CardLayoutBase>;
  issues: Issue[];
  issuesByCard: Map<CardId, Issue[]>;
}

/** Layout every card and derive validation issues. Deferred so typing stays responsive. */
export function useAnalysis(rc: RenderContext): Analysis {
  const { ws } = useWorkspace();
  const cards = useDeferredValue(ws.deck.cards);
  const style = useDeferredValue(ws.deck.style);
  return useMemo(() => {
    const layouts = new Map<CardId, CardLayoutBase>();
    for (const c of cards) layouts.set(c.id, rc.template.layout(c, style, rc.env));
    const issues = validateCards(rc.template, cards, rc.fontsReady ? { fits: (c) => layouts.get(c.id)?.fits ?? true } : {});
    // Remote images whose host blocks CORS can't go into exported sheets.
    for (const c of cards) {
      for (const v of Object.values(c.data as Record<string, unknown>)) {
        if (isImageRef(v) && v.type === 'url') {
          const st = imageCache.remoteStatus(v.url);
          if (st === 'blocked' || st === 'failed') {
            issues.push(
              warning('image-blocked', st === 'blocked' ? "this image's website blocks it from being used in exports; download it and upload the file instead" : "the image URL couldn't be loaded", {
                origin: c.origin,
                cardId: c.id,
              }),
            );
          }
        }
      }
    }
    const issuesByCard = new Map<CardId, Issue[]>();
    for (const i of issues) if (i.cardId) issuesByCard.set(i.cardId, [...(issuesByCard.get(i.cardId) ?? []), i]);
    return { layouts, issues, issuesByCard };
  }, [cards, style, rc.template, rc.env, rc.fontsReady]);
}
