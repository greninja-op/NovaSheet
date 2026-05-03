// Virtualized grid with decoupled layout: corner + column header strip + row
// index strip + body scroller. Only the body scrolls; the two strips are
// transform-synced to the body's scroll position. This eliminates the prior
// in-flow header layout bug.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useProjectStore, type Coord, type Sel } from "../stores/projectStore";
import { colLetter, normRange, toA1 } from "../lib/address";
import { getDisplayValue, getRawValue } from "../lib/engine";
import { formatValue } from "../lib/format";
import type { CellStyle } from "../lib/schema";
import { ContextMenu, type CtxItem } from "./ContextMenu";
import { computeFill } from "../lib/autofill";
import { copySelection, readClipboardMatrix } from "../lib/clipboard";
import {
  COL_W,
  HEADER_H,
  INDEX_W,
  DEFAULT_ROW_H as ROW_H,
  MIN_COL_W,
  MAX_COL_W,
} from "../lib/measure";

const inRange = (r: number, c: number, sel: Sel) => {
  const n = normRange({
    r1: sel.start.r,
    c1: sel.start.c,
    r2: sel.end.r,
    c2: sel.end.c,
  });
  return r >= n.r1 && r <= n.r2 && c >= n.c1 && c <= n.c2;
};

export const SheetGrid = () => {
  const rows = useProjectStore((s) => s.rows);
  const cols = useProjectStore((s) => s.cols);
  const styles = useProjectStore((s) => s.styles);
  const active = useProjectStore((s) => s.active);
  const selection = useProjectStore((s) => s.selection);
  const editing = useProjectStore((s) => s.editing);
  const version = useProjectStore((s) => s.version);
  const colWidths = useProjectStore((s) => s.colWidths);
  const widthsVersion = useProjectStore((s) => s.widthsVersion);
  const setColWidth = useCallback((c: number, w: number) => {
    useProjectStore.setState((s) => ({
      colWidths: { ...s.colWidths, [c]: Math.max(MIN_COL_W, Math.min(MAX_COL_W, w)) },
      widthsVersion: s.widthsVersion + 1,
    }));
  }, []);
  const engine = useProjectStore((s) => s.engine);

  const setActive = useProjectStore((s) => s.setActive);
  const setSelection = useProjectStore((s) => s.setSelection);
  const beginEdit = useProjectStore((s) => s.beginEdit);
  const updateDraft = useProjectStore((s) => s.updateDraft);
  const commitEdit = useProjectStore((s) => s.commitEdit);
  const cancelEdit = useProjectStore((s) => s.cancelEdit);
  const clearRange = useProjectStore((s) => s.clearRange);
  const insertRowAt = useProjectStore((s) => s.insertRowAt);
  const deleteRowAt = useProjectStore((s) => s.deleteRowAt);
  const insertColAt = useProjectStore((s) => s.insertColAt);
  const deleteColAt = useProjectStore((s) => s.deleteColAt);

  const bodyRef = useRef<HTMLDivElement>(null);
  const colHeadInner = useRef<HTMLDivElement>(null);
  const rowIdxInner = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  const rowVirt = useVirtualizer({
    count: rows,
    getScrollElement: () => bodyRef.current,
    estimateSize: () => ROW_H,
    overscan: 20,
  });
  const estimateColSize = useCallback(
    (i: number) => colWidths[i] ?? COL_W,
    [colWidths]
  );
  const colVirt = useVirtualizer({
    count: cols,
    horizontal: true,
    getScrollElement: () => bodyRef.current,
    estimateSize: estimateColSize,
    overscan: 12,
  });
  // Invalidate column virtualizer when widths change.
  useEffect(() => {
    colVirt.measure();
  }, [widthsVersion, colVirt]);

  const totalH = rowVirt.getTotalSize();
  const totalW = colVirt.getTotalSize();
  const rowItems = rowVirt.getVirtualItems();
  const colItems = colVirt.getVirtualItems();

  // Sync header/row-idx to body scroll
  const onBodyScroll = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    if (colHeadInner.current) {
      colHeadInner.current.scrollLeft = el.scrollLeft;
    }
    if (rowIdxInner.current) {
      rowIdxInner.current.scrollTop = el.scrollTop;
    }
  }, []);
  useEffect(() => {
    onBodyScroll();
  }, [onBodyScroll, totalH, totalW]);

  // ---- Auto-fill state ----
  type Filling = { source: Sel; target: Coord };
  const [filling, setFilling] = useState<Filling | null>(null);

  // ---- Context menu state ----
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; r: number; c: number } | null>(null);

  // ---- Resize state ----
  const [colResize, setColResize] = useState<{ c: number; startX: number; startW: number } | null>(null);
  const [rowResize, setRowResize] = useState<{ r: number; startY: number; startH: number } | null>(null);

  // ---- Mouse selection ----
  const [dragging, setDragging] = useState<null | { anchor: Coord }>(null);
  const onCellMouseDown = (
    r: number,
    c: number,
    e: React.MouseEvent
  ) => {
    if (e.button === 2) return;
    if (editing) commitEdit("none");
    if (e.shiftKey) {
      setSelection({ start: active, end: { r, c } });
    } else {
      setActive({ r, c });
      setDragging({ anchor: { r, c } });
    }
  };
  const onCellMouseEnter = (r: number, c: number) => {
    if (dragging) setSelection({ start: dragging.anchor, end: { r, c } });
    else if (filling) setFilling({ ...filling, target: { r, c } });
  };

  const onContextMenu = (ev: React.MouseEvent, r: number, c: number) => {
    ev.preventDefault();
    setCtxMenu({ x: ev.clientX, y: ev.clientY, r, c });
  };

  // Helper: read cell raw (formula-aware) for autofill
  const getRawSerialized = useCallback(
    (e: ReturnType<typeof engine>, r: number, c: number) => {
      const raw = getRawValue(e, r, c);
      if (raw === "") return null;
      if (raw.startsWith("=")) return raw;
      const n = Number(raw);
      return Number.isNaN(n) ? raw : n;
    },
    []
  );

  const commitFill = useCallback(() => {
    if (!filling) return;
    const src = normRange({
      r1: filling.source.start.r,
      c1: filling.source.start.c,
      r2: filling.source.end.r,
      c2: filling.source.end.c,
    });
    const tgt = filling.target;
    const e = engine();
    const dy = tgt.r - src.r2;
    const dx = tgt.c - src.c2;
    const isVertical = Math.abs(dy) >= Math.abs(dx) && dy !== 0;
    const st = useProjectStore.getState();
    if (isVertical) {
      const dir: "down" | "up" = dy >= 0 ? "down" : "up";
      const toLen = Math.abs(dy);
      if (toLen === 0) return setFilling(null);
      for (let c = src.c1; c <= src.c2; c++) {
        const sourceVals: any[] = [];
        for (let r = src.r1; r <= src.r2; r++) {
          sourceVals.push(getRawSerialized(e, r, c));
        }
        const projected = computeFill(sourceVals, toLen, dir);
        for (let i = 0; i < toLen; i++) {
          const rr = dir === "down" ? src.r2 + 1 + i : src.r1 - 1 - i;
          st.setCell(rr, c, projected[i] as any);
        }
      }
      setSelection(
        dir === "down"
          ? { start: { r: src.r1, c: src.c1 }, end: { r: src.r2 + toLen, c: src.c2 } }
          : { start: { r: src.r1 - toLen, c: src.c1 }, end: { r: src.r2, c: src.c2 } }
      );
    } else if (dx !== 0) {
      const dir: "right" | "left" = dx >= 0 ? "right" : "left";
      const toLen = Math.abs(dx);
      for (let r = src.r1; r <= src.r2; r++) {
        const sourceVals: any[] = [];
        for (let c = src.c1; c <= src.c2; c++) {
          sourceVals.push(getRawSerialized(e, r, c));
        }
        const projected = computeFill(sourceVals, toLen, dir);
        for (let i = 0; i < toLen; i++) {
          const cc = dir === "right" ? src.c2 + 1 + i : src.c1 - 1 - i;
          st.setCell(r, cc, projected[i] as any);
        }
      }
      setSelection(
        dir === "right"
          ? { start: { r: src.r1, c: src.c1 }, end: { r: src.r2, c: src.c2 + toLen } }
          : { start: { r: src.r1, c: src.c1 - toLen }, end: { r: src.r2, c: src.c2 } }
      );
    }
    setFilling(null);
  }, [filling, engine, getRawSerialized, setSelection]);

  useEffect(() => {
    const up = () => {
      setDragging(null);
      if (filling) commitFill();
      setColResize(null);
      setRowResize(null);
    };
    const move = (e: MouseEvent) => {
      if (colResize) {
        const delta = e.clientX - colResize.startX;
        const newW = Math.max(MIN_COL_W, Math.min(MAX_COL_W, colResize.startW + delta));
        setColWidth(colResize.c, newW);
      }
      if (rowResize) {
        const delta = e.clientY - rowResize.startY;
        const _newH = Math.max(ROW_H, rowResize.startH + delta);
        void _newH; // Row height resizing not yet implemented
      }
    };
    window.addEventListener("mouseup", up);
    window.addEventListener("mousemove", move);
    return () => {
      window.removeEventListener("mouseup", up);
      window.removeEventListener("mousemove", move);
    };
  }, [filling, commitFill, colResize, rowResize, setColWidth]);

  // ---- Copy / Cut / Paste ----
  const doCopy = useCallback(async () => {
    await copySelection(engine(), selection);
  }, [engine, selection]);
  const doCut = useCallback(async () => {
    await copySelection(engine(), selection);
    clearRange(selection);
  }, [engine, selection, clearRange]);
  const doPaste = useCallback(async () => {
    const matrix = await readClipboardMatrix();
    if (!matrix.length || !matrix[0].length) return;
    const st = useProjectStore.getState();
    const r0 = active.r;
    const c0 = active.c;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        st.setCell(r0 + r, c0 + c, matrix[r][c] as any);
      }
    }
    setSelection({
      start: { r: r0, c: c0 },
      end: {
        r: r0 + matrix.length - 1,
        c: c0 + matrix[0].length - 1,
      },
    });
  }, [active, setSelection]);

  // ---- Keyboard ----
  const onKey = (e: React.KeyboardEvent) => {
    if (editing) return;
    const k = e.key;
    const meta = e.ctrlKey || e.metaKey;

    if (meta) {
      const lk = k.toLowerCase();
      if (lk === "c") { e.preventDefault(); doCopy(); return; }
      if (lk === "x") { e.preventDefault(); doCut(); return; }
      if (lk === "v") { e.preventDefault(); doPaste(); return; }
      if (lk === "a") {
        e.preventDefault();
        setActive({ r: 0, c: 0 });
        setSelection({ start: { r: 0, c: 0 }, end: { r: rows - 1, c: cols - 1 } });
        return;
      }
      if (lk === "b" || lk === "i" || lk === "u") {
        e.preventDefault();
        const cur = styles[toA1(active.r, active.c)] ?? {};
        const keyMap = { b: "bold", i: "italic", u: "underline" } as const;
        const prop = keyMap[lk as "b" | "i" | "u"];
        useProjectStore
          .getState()
          .setStyleRange(selection, { [prop]: !(cur as any)[prop] } as any);
        return;
      }
      if (lk === "home") {
        e.preventDefault();
        setActive({ r: 0, c: 0 });
        return;
      }
    }

    const move = (dr: number, dc: number) => {
      e.preventDefault();
      const next = { r: active.r + dr, c: active.c + dc };
      setActive(next, e.shiftKey);
      const tr = Math.max(0, Math.min(rows - 1, next.r));
      const tc = Math.max(0, Math.min(cols - 1, next.c));
      rowVirt.scrollToIndex(tr, { align: "auto" });
      colVirt.scrollToIndex(tc, { align: "auto" });
    };

    switch (k) {
      case "ArrowUp":    return move(-1, 0);
      case "ArrowDown":  return move(1, 0);
      case "ArrowLeft":  return move(0, -1);
      case "ArrowRight": return move(0, 1);
      case "Tab":
        e.preventDefault();
        return move(0, e.shiftKey ? -1 : 1);
      case "Enter":
        if (e.shiftKey) return move(-1, 0);
        return move(1, 0);
      case "F2":
        e.preventDefault();
        beginEdit(active, getRawValue(engine(), active.r, active.c));
        return;
      case "Delete":
      case "Backspace":
        e.preventDefault();
        clearRange(selection);
        return;
      case "Home":
        e.preventDefault();
        setActive({ r: active.r, c: 0 });
        return;
      case "End":
        e.preventDefault();
        setActive({ r: active.r, c: cols - 1 });
        return;
      case "PageDown":
        e.preventDefault();
        return move(20, 0);
      case "PageUp":
        e.preventDefault();
        return move(-20, 0);
      case "Escape":
        e.preventDefault();
        return;
    }

    if (k.length === 1 && !meta) {
      beginEdit(active, k);
      e.preventDefault();
    }
  };

  // ---- Edit input lifecycle ----
  useEffect(() => {
    if (editing && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editing]);

  const ctxItems: CtxItem[] = ctxMenu
    ? [
        { kind: "item", label: "Cut", onClick: () => doCut() },
        { kind: "item", label: "Copy", onClick: () => doCopy() },
        { kind: "item", label: "Paste", onClick: () => doPaste() },
        { kind: "sep" },
        { kind: "item", label: "Insert Row Above", onClick: () => insertRowAt(ctxMenu.r) },
        { kind: "item", label: "Insert Row Below", onClick: () => insertRowAt(ctxMenu.r + 1) },
        { kind: "item", label: "Delete Row", onClick: () => deleteRowAt(ctxMenu.r) },
        { kind: "sep" },
        { kind: "item", label: "Insert Column Left", onClick: () => insertColAt(ctxMenu.c) },
        { kind: "item", label: "Insert Column Right", onClick: () => insertColAt(ctxMenu.c + 1) },
        { kind: "item", label: "Delete Column", onClick: () => deleteColAt(ctxMenu.c) },
        { kind: "sep" },
        { kind: "item", label: "Clear Contents", onClick: () => clearRange(selection) },
      ]
    : [];

  // ---- Fill handle anchor ----
  const sel = useMemo(
    () =>
      normRange({
        r1: selection.start.r,
        c1: selection.start.c,
        r2: selection.end.r,
        c2: selection.end.c,
      }),
    [selection]
  );
  const handlePos = useMemo(() => {
    const nextRow = Math.min(rows, sel.r2 + 1);
    const top = (nextRow) * ROW_H;
    const left = colVirt.getOffsetForIndex?.(sel.c2 + 1);
    const leftPos = Array.isArray(left) ? left[0] : (sel.c2 + 1) * COL_W;
    return {
      left: leftPos - 4,
      top: top - 4,
    };
  }, [sel, rows, colVirt]);
  const onHandleDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFilling({
      source: selection,
      target: { r: sel.r2, c: sel.c2 },
    });
  };

  // Filling preview rectangle (for dashed outline)
  const fillPreview = useMemo(() => {
    if (!filling) return null;
    const src = sel;
    const t = filling.target;
    const dy = t.r - src.r2;
    const dx = t.c - src.c2;
    const isVertical = Math.abs(dy) >= Math.abs(dx) && dy !== 0;
    if (isVertical) {
      if (dy > 0) return { r1: src.r2 + 1, c1: src.c1, r2: t.r, c2: src.c2 };
      if (dy < 0) return { r1: t.r, c1: src.c1, r2: src.r1 - 1, c2: src.c2 };
    } else if (dx !== 0) {
      if (dx > 0) return { r1: src.r1, c1: src.c2 + 1, r2: src.r2, c2: t.c };
      if (dx < 0) return { r1: src.r1, c1: t.c, r2: src.r2, c2: src.c1 - 1 };
    }
    return null;
  }, [filling, sel]);

  void version;
  const e = engine();

  return (
    <div
      tabIndex={0}
      onKeyDown={onKey}
      className="w-full h-full outline-none relative"
      style={{
        display: "grid",
        gridTemplateRows: `${HEADER_H}px minmax(0, 1fr)`,
        gridTemplateColumns: `${INDEX_W}px minmax(0, 1fr)`,
      }}
      onContextMenu={(e) => {
        if (!(e.target as HTMLElement).closest("textarea")) {
          e.preventDefault();
        }
      }}
    >
      {/* Corner */}
      <div
        style={{
          gridColumn: 1,
          gridRow: 1,
          background: "var(--af-header-bg)",
          borderRight: "1px solid var(--af-border)",
          borderBottom: "1px solid var(--af-border)",
          zIndex: 3,
        }}
      />

      {/* Column header strip */}
      <div
        ref={colHeadInner}
        style={{
          gridColumn: 2,
          gridRow: 1,
          overflow: "hidden",
          borderBottom: "1px solid var(--af-border)",
          background: "var(--af-header-bg)",
          zIndex: 2,
          willChange: "transform",
        }}
      >
        <div
          style={{
            position: "relative",
            width: totalW,
            height: HEADER_H,
            willChange: "transform",
          }}
        >
          {colItems.map((ci) => {
            const c = ci.index;
            return (
              <div
                key={c}
                onContextMenu={(ev) => onContextMenu(ev, 0, c)}
                onMouseDown={(ev) => {
                  if (ev.button === 2) return;
                  // Check if clicking on resize handle area (right 6px)
                  const rect = (ev.target as HTMLElement).getBoundingClientRect();
                  const isResize = ev.clientX > rect.right - 6;
                  if (isResize) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    setColResize({ c, startX: ev.clientX, startW: ci.size });
                    return;
                  }
                  setActive({ r: 0, c });
                  setSelection({
                    start: { r: 0, c },
                    end: { r: rows - 1, c },
                  });
                }}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  transform: `translateX(${ci.start}px)`,
                  width: ci.size,
                  height: HEADER_H,
                  boxSizing: "border-box",
                  borderRight: "1px solid var(--af-border)",
                  background: "transparent",
                  color: "var(--af-header-fg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                {colLetter(c)}
                {/* Resize handle */}
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    width: 6,
                    height: "100%",
                    cursor: "col-resize",
                    zIndex: 10,
                  }}
                  title="Drag to resize column"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Row index strip */}
      <div
        ref={rowIdxInner}
        style={{
          gridColumn: 1,
          gridRow: 2,
          overflow: "hidden",
          borderRight: "1px solid var(--af-border)",
          background: "var(--af-header-bg)",
          zIndex: 2,
          willChange: "transform",
        }}
      >
        <div
          style={{
            position: "relative",
            width: INDEX_W,
            height: totalH,
            willChange: "transform",
          }}
        >
          {rowItems.map((ri) => {
            const r = ri.index;
            const isSelRow = r >= sel.r1 && r <= sel.r2;
            return (
              <div
                key={r}
                onContextMenu={(ev) => onContextMenu(ev, r, 0)}
                onMouseDown={(ev) => {
                  if (ev.button === 2) return;
                  // Check if clicking on resize handle area (bottom 6px)
                  const rect = (ev.target as HTMLElement).getBoundingClientRect();
                  const isResize = ev.clientY > rect.bottom - 6;
                  if (isResize) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    setRowResize({ r, startY: ev.clientY, startH: ri.size });
                    return;
                  }
                  setActive({ r, c: 0 });
                  setSelection({
                    start: { r, c: 0 },
                    end: { r, c: cols - 1 },
                  });
                }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  transform: `translateY(${ri.start}px)`,
                  width: INDEX_W,
                  height: ri.size,
                  boxSizing: "border-box",
                  borderBottom: "1px solid var(--af-border)",
                  background: isSelRow
                    ? "var(--af-surface-2)"
                    : "transparent",
                  color: isSelRow
                    ? "var(--af-fg)"
                    : "var(--af-header-fg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                {r + 1}
                {/* Row resize handle */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    width: "100%",
                    height: 6,
                    cursor: "row-resize",
                    zIndex: 10,
                  }}
                  title="Drag to resize row"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Body scroller */}
      <div
        ref={bodyRef}
        onScroll={onBodyScroll}
        style={{
          gridColumn: 2,
          gridRow: 2,
          overflow: "auto",
          background: "var(--af-bg)",
          willChange: "transform",
        }}
      >
        <div
          style={{
            position: "relative",
            width: totalW,
            height: totalH,
            willChange: "transform",
          }}
        >
          {rowItems.map((ri) => {
            const r = ri.index;
            return colItems.map((ci) => {
              const c = ci.index;
              const a1 = toA1(r, c);
              const cellStyle: CellStyle | undefined = styles[a1];
              const isActive = active.r === r && active.c === c;
              const inSel = inRange(r, c, selection);
              const inFill =
                fillPreview &&
                r >= fillPreview.r1 &&
                r <= fillPreview.r2 &&
                c >= fillPreview.c1 &&
                c <= fillPreview.c2;
              const display = formatValue(
                getDisplayValue(e, r, c),
                cellStyle?.fmt
              );
              const isEditing =
                editing && editing.at.r === r && editing.at.c === c;

              return (
                <div
                  key={`${r}-${c}`}
                  onMouseDown={(ev) => onCellMouseDown(r, c, ev)}
                  onMouseEnter={() => onCellMouseEnter(r, c)}
                  onDoubleClick={() =>
                    beginEdit({ r, c }, getRawValue(e, r, c))
                  }
                  onContextMenu={(ev) => onContextMenu(ev, r, c)}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    transform: `translate(${ci.start}px, ${ri.start}px)`,
                    width: ci.size,
                    height: ri.size,
                    boxSizing: "border-box", /* crucial for border scroll consistency */
                    borderRight: "1px solid var(--af-grid-line)",
                    borderBottom: "1px solid var(--af-grid-line)",
                    background: inSel
                      ? "var(--af-cell-selected)"
                      : cellStyle?.bg,
                    color: cellStyle?.fg,
                    fontWeight: cellStyle?.bold ? 700 : undefined,
                    fontStyle: cellStyle?.italic ? "italic" : undefined,
                    textDecoration: cellStyle?.underline
                      ? "underline"
                      : undefined,
                    textAlign: cellStyle?.align,
                    padding: isEditing ? 0 : "3px 6px",
                    lineHeight: "18px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    overflow: "hidden",
                    fontSize: 12,
                    outline:
                      isActive && !isEditing
                        ? "2px solid var(--af-cell-active-border)"
                        : inFill
                        ? "1px dashed var(--af-cell-active-border)"
                        : undefined,
                    outlineOffset: -1,
                    zIndex: isActive ? 5 : 1,
                    cursor: "default", /* Explicitly using arrow cursor instead of plus (cell) */
                  }}
                >
                  {isEditing ? (
                    <textarea
                      ref={editInputRef}
                      value={editing!.draft}
                      onChange={(ev) => updateDraft(ev.target.value)}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter" && !ev.shiftKey) {
                          ev.preventDefault();
                          commitEdit(ev.shiftKey ? "none" : "down");
                          (bodyRef.current?.parentElement as HTMLElement | null)?.focus?.();
                        } else if (ev.key === "Tab") {
                          ev.preventDefault();
                          commitEdit("right");
                          (bodyRef.current?.parentElement as HTMLElement | null)?.focus?.();
                        } else if (ev.key === "Escape") {
                          ev.preventDefault();
                          cancelEdit();
                          (bodyRef.current?.parentElement as HTMLElement | null)?.focus?.();
                        }
                      }}
                      onBlur={() => commitEdit("none")}
                      spellCheck={false}
                      rows={1}
                      style={{
                        width: "100%",
                        height: "100%",
                        minHeight: ri.size - 2,
                        background: "var(--af-bg)",
                        border: "none",
                        outline: "none",
                        boxShadow: "none",
                        fontFamily: "inherit",
                        fontSize: 12,
                        fontWeight: cellStyle?.bold ? 700 : undefined,
                        fontStyle: cellStyle?.italic ? "italic" : undefined,
                        textDecoration: cellStyle?.underline ? "underline" : undefined,
                        textAlign: cellStyle?.align,
                        padding: "3px 6px",
                        margin: 0,
                        color: cellStyle?.fg ?? "var(--af-fg)",
                        boxSizing: "border-box",
                        resize: "none",
                        overflow: "hidden",
                        lineHeight: "18px",
                        whiteSpace: "pre",
                        wordWrap: "normal",
                      }}
                    />
                  ) : (
                    display
                  )}
                </div>
              );
            });
          })}

          {/* Fill handle */}
          {!editing && (
            <div
              onMouseDown={onHandleDown}
              title="Auto-fill"
              style={{
                position: "absolute",
                left: handlePos.left,
                top: handlePos.top,
                width: 8,
                height: 8,
                background: "var(--af-cell-active-border)",
                border: "1px solid white",
                cursor: "crosshair",
                zIndex: 40,
              }}
            />
          )}
        </div>
      </div>

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={ctxItems}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  );
};
