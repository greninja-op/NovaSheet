// Text measurement for dynamic cell sizing.
// Uses a shared canvas 2D context with the same font as grid cells.

export const CELL_FONT = '12px "Segoe UI", system-ui, -apple-system, sans-serif';
export const LINE_H = 18; // px per wrapped line
export const CELL_V_PAD = 6; // total vertical padding inside cell
export const DEFAULT_ROW_H = 24;
export const MAX_ROW_H = 240; // upper cap so runaway text doesn't eat the sheet

// Grid geometry shared between store and SheetGrid.
export const COL_W = 104;
export const MIN_COL_W = 60;
export const MAX_COL_W = 600;
export const HEADER_H = 28;
export const INDEX_W = 56;

let _ctx: CanvasRenderingContext2D | null = null;
const ctx = (): CanvasRenderingContext2D => {
  if (_ctx) return _ctx;
  const c = document.createElement("canvas");
  const g = c.getContext("2d")!;
  g.font = CELL_FONT;
  _ctx = g;
  return g;
};

// Count visual lines for `text` when wrapped within `maxWidth` pixels.
// Honors explicit newlines; breaks on words, falls back to per-char splitting
// when a single token exceeds maxWidth.
export const countWrappedLines = (text: string, maxWidth: number): number => {
  if (!text) return 1;
  if (maxWidth <= 0) return 1;
  const g = ctx();
  const paragraphs = text.split(/\r?\n/);
  let total = 0;

  const charSplit = (token: string): number => {
    let lines = 1;
    let cur = "";
    for (const ch of token) {
      const next = cur + ch;
      if (g.measureText(next).width <= maxWidth) cur = next;
      else {
        lines++;
        cur = ch;
      }
    }
    return lines;
  };

  for (const p of paragraphs) {
    if (p === "") {
      total += 1;
      continue;
    }
    const words = p.split(/\s+/);
    let lines = 1;
    let cur = "";
    for (const w of words) {
      const candidate = cur ? cur + " " + w : w;
      if (g.measureText(candidate).width <= maxWidth) {
        cur = candidate;
      } else {
        if (cur !== "") lines++;
        if (g.measureText(w).width > maxWidth) {
          lines += charSplit(w) - 1;
          cur = "";
        } else {
          cur = w;
        }
      }
    }
    total += lines;
  }
  return Math.max(1, total);
};

// Desired cell height in pixels for given text + column width.
export const measureCellHeight = (
  text: string,
  colWidth: number,
  padding = 12 // horizontal padding consumed by "padding: 0 6px"
): number => {
  const effective = Math.max(20, colWidth - padding);
  const lines = countWrappedLines(text, effective);
  const h = lines * LINE_H + CELL_V_PAD;
  return Math.min(MAX_ROW_H, Math.max(DEFAULT_ROW_H, h));
};

// Measure unwrapped text width (for horizontal auto-fit). Returns pixel width.
export const measureTextWidth = (text: string): number => {
  if (!text) return 0;
  const g = ctx();
  // Take the longest line if multiple lines exist
  const lines = text.split(/\r?\n/);
  let max = 0;
  for (const line of lines) {
    const w = g.measureText(line).width;
    if (w > max) max = w;
  }
  return Math.ceil(max);
};
