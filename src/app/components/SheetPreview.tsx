import { useEffect, useRef } from 'react';
import type { Deck } from '../../core/model/deck';
import { drawCardBack, drawCardFace } from '../../core/render/renderCard';
import { HIDDEN_SLOT, SHEET_COLUMNS, SHEET_ROWS, slotPosition, type PlannedDeck, type PlannedSheet, type SheetPlan } from '../../core/export/sheetPlan';
import type { RenderContext } from '../hooks/useRender';

interface Props {
  rc: RenderContext;
  deck: Deck;
  plan: SheetPlan;
  pd: PlannedDeck;
  sheet: PlannedSheet;
  width: number;
}

/** The sheet exactly as exported, drawn small. Empty slots are outlined. */
export function SheetPreview({ rc, deck, plan, pd, sheet, width }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const cssCell = { width: width / SHEET_COLUMNS, height: (width / SHEET_COLUMNS) * (plan.cell.height / plan.cell.width) };

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cell = { width: Math.floor(cssCell.width * dpr), height: Math.floor(cssCell.height * dpr) };
    canvas.width = cell.width * SHEET_COLUMNS;
    canvas.height = cell.height * SHEET_ROWS;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let slot = 0; slot < SHEET_COLUMNS * SHEET_ROWS; slot++) {
      const { x, y } = slotPosition(slot, cell);
      const card = sheet.cards[slot];
      if (card) drawCardFace(ctx, rc.template, card, deck.style, rc.env, x, y, cell.width);
      else if (slot === HIDDEN_SLOT) drawCardBack(ctx, rc.template, pd.kind, deck.style, rc.env, x, y, cell.width);
      else {
        ctx.strokeStyle = 'rgba(128,128,128,0.35)';
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x + 1.5, y + 1.5, cell.width - 3, cell.height - 3);
        ctx.setLineDash([]);
      }
    }
  }, [rc, rc.version, deck.style, plan, pd, sheet, width]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={ref}
      className="sheet-canvas"
      style={{ width, height: cssCell.height * SHEET_ROWS }}
      role="img"
      aria-label={`${pd.label} sheet ${sheet.number}: ${sheet.cards.length} cards in a 10 by 7 grid; the last slot shows the card back`}
    />
  );
}
