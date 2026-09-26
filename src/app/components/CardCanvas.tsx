import { useEffect, useRef, useState } from 'react';
import type { CardRecord, StyleSettings } from '../../core/model/deck';
import { drawCardBack, drawCardFace, pixelSize } from '../../core/render/renderCard';
import type { RenderContext } from '../hooks/useRender';

interface Props {
  rc: RenderContext;
  style: StyleSettings;
  /** CSS width in px. */
  width: number;
  card?: CardRecord;
  /** Draw this kind's back instead of a face. */
  backKind?: string;
  label: string;
  /** Only draw once scrolled into view. */
  lazy?: boolean;
  className?: string;
}

export function CardCanvas({ rc, style, width, card, backKind, label, lazy, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(!lazy);
  const size = pixelSize(rc.template, style, width);

  useEffect(() => {
    if (visible || !ref.current) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setVisible(true), { rootMargin: '400px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !visible) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const px = pixelSize(rc.template, style, width * dpr);
    canvas.width = px.width;
    canvas.height = px.height;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, px.width, px.height);
    if (card) drawCardFace(ctx, rc.template, card, style, rc.env, 0, 0, px.width);
    else if (backKind) drawCardBack(ctx, rc.template, backKind, style, rc.env, 0, 0, px.width);
  }, [rc, style, width, card, backKind, visible, rc.version]);

  return (
    <canvas
      ref={ref}
      className={`card-canvas ${className ?? ''}`}
      style={{ width: size.width, height: size.height }}
      role="img"
      aria-label={label}
    />
  );
}
