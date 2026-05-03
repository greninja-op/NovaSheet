import { create } from "zustand";
import {
  DEFAULT_COLS,
  DEFAULT_ROWS,
  DEFAULT_THEME,
  type CellStyle,
  type CellValue,
  type Project,
} from "../lib/schema";
import {
  createEngine,
  destroyEngine,
  dumpRaw,
  type Engine,
  setCell as engSetCell,
  setRange as engSetRange,
  insertRow as engInsertRow,
  deleteRow as engDeleteRow,
  insertCol as engInsertCol,
  deleteCol as engDeleteCol,
} from "../lib/engine";
import { shiftStyleKeys, toA1, normRange } from "../lib/address";
import { measureTextWidth, COL_W, MIN_COL_W, MAX_COL_W } from "../lib/measure";
import { formatValue } from "../lib/format";
import { getDisplayValue } from "../lib/engine";

export type Coord = { r: number; c: number };
export type Sel = { start: Coord; end: Coord };

type State = {
  id: string;
  projectName: string;
  filePath: string | null; // absolute path (when saved/opened)
  dirty: boolean;
  rows: number;
  cols: number;
  styles: Record<string, CellStyle>;
  active: Coord;
  selection: Sel;
  editing: { at: Coord; draft: string } | null;
  version: number; // bumped whenever engine changes -> triggers grid rerender
  theme: typeof DEFAULT_THEME;
  _engine: Engine | null;
  _keystrokes: number;
  colWidths: Record<number, number>;
  widthsVersion: number;
};

type Actions = {
  engine: () => Engine;
  newBlank: () => void;
  loadProject: (p: Project, filePath?: string | null) => void;
  toProject: () => Project;
  setCell: (r: number, c: number, raw: string | number | null) => void;
  setRangeMatrix: (topLeft: Coord, matrix: CellValue[][]) => void;
  clearRange: (sel: Sel) => void;
  insertRowAt: (r: number) => void;
  deleteRowAt: (r: number) => void;
  insertColAt: (c: number) => void;
  deleteColAt: (c: number) => void;
  setStyleRange: (sel: Sel, patch: Partial<CellStyle>) => void;
  clearStyleRange: (sel: Sel) => void;
  setActive: (a: Coord, extendSel?: boolean) => void;
  setSelection: (s: Sel) => void;
  beginEdit: (at: Coord, initial?: string) => void;
  updateDraft: (draft: string) => void;
  commitEdit: (advance?: "down" | "right" | "none") => void;
  cancelEdit: () => void;
  setFilePath: (p: string | null) => void;
  markSaved: () => void;
  setProjectName: (n: string) => void;
};

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

const emptyMatrix = (rows: number, cols: number): CellValue[][] =>
  Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null as CellValue)
  );

// Seed matrix for HyperFormula initialisation. Keeps init O(1) regardless of
// the render viewport size — HF expands on first write to any larger cell.
const ENGINE_SEED_ROWS = 32;
const ENGINE_SEED_COLS = 32;
const engineSeed = (): CellValue[][] => emptyMatrix(ENGINE_SEED_ROWS, ENGINE_SEED_COLS);

// Column-index keyed map shifter.
const shiftColKeys = (
  m: Record<number, number>,
  op: "insertCol" | "deleteCol",
  idx: number
): Record<number, number> => {
  const out: Record<number, number> = {};
  for (const k of Object.keys(m)) {
    let c = Number(k);
    if (op === "insertCol") {
      if (c >= idx) c += 1;
    } else {
      if (c === idx) continue;
      if (c > idx) c -= 1;
    }
    out[c] = m[Number(k)];
  }
  return out;
};

export const useProjectStore = create<State & Actions>()((set, get) => ({
  id: crypto.randomUUID(),
  projectName: "Untitled",
  filePath: null,
  dirty: false,
  rows: DEFAULT_ROWS,
  cols: DEFAULT_COLS,
  styles: {},
  active: { r: 0, c: 0 },
  selection: { start: { r: 0, c: 0 }, end: { r: 0, c: 0 } },
  editing: null,
  version: 0,
  theme: DEFAULT_THEME,
  _engine: null,
  _keystrokes: 0,
  colWidths: {},
  widthsVersion: 0,

  engine: () => {
    let e = get()._engine;
    if (!e) {
      e = createEngine(engineSeed());
      set({ _engine: e });
    }
    return e;
  },

  newBlank: () => {
    destroyEngine(get()._engine);
    const rows = DEFAULT_ROWS;
    const cols = DEFAULT_COLS;
    const e = createEngine(engineSeed());
    set({
      id: crypto.randomUUID(),
      projectName: "Untitled",
      filePath: null,
      dirty: false,
      rows,
      cols,
      styles: {},
      active: { r: 0, c: 0 },
      selection: { start: { r: 0, c: 0 }, end: { r: 0, c: 0 } },
      editing: null,
      _engine: e,
      version: get().version + 1,
      _keystrokes: 0,
      colWidths: {},
      widthsVersion: get().widthsVersion + 1,
    });
  },

  loadProject: (p, filePath = null) => {
    destroyEngine(get()._engine);
    const data = p.sheetData ?? [];
    const rows = Math.max(DEFAULT_ROWS, data.length);
    const cols = Math.max(
      DEFAULT_COLS,
      data.reduce((m, r) => Math.max(m, r.length), 0)
    );
    const seed: CellValue[][] =
      data.length === 0
        ? engineSeed()
        : data.map((row) => row.slice());
    const e = createEngine(seed);
    set({
      id: p.id,
      projectName: p.projectName,
      filePath,
      dirty: false,
      rows,
      cols,
      styles: { ...p.styles },
      active: { r: 0, c: 0 },
      selection: { start: { r: 0, c: 0 }, end: { r: 0, c: 0 } },
      editing: null,
      theme: p.templateConfig?.theme ?? DEFAULT_THEME,
      _engine: e,
      version: get().version + 1,
      _keystrokes: 0,
      colWidths: {},
      widthsVersion: get().widthsVersion + 1,
    });
    // Measure all loaded cells for column auto-width.
    const st = get();
    const colWidths: Record<number, number> = {};
    for (let r = 0; r < data.length; r++) {
      for (let c = 0; c < (data[r]?.length ?? 0); c++) {
        const a1 = toA1(r, c);
        const display = formatValue(
          getDisplayValue(e, r, c),
          st.styles[a1]?.fmt
        );
        const textW = measureTextWidth(display ?? "");
        const desired = Math.min(MAX_COL_W, Math.max(MIN_COL_W, textW + 24));
        if (desired > COL_W) {
          if (!colWidths[c] || colWidths[c] < desired) colWidths[c] = desired;
        }
      }
    }
    if (Object.keys(colWidths).length) {
      set((s) => ({
        colWidths,
        widthsVersion: s.widthsVersion + 1,
      }));
    }
  },

  toProject: (): Project => {
    const s = get();
    const e = s.engine();
    return {
      id: s.id,
      projectName: s.projectName,
      isTemplate: false,
      sheetData: dumpRaw(e),
      styles: s.styles,
      templateConfig: {
        id: s.id + "-tpl",
        name: s.projectName,
        theme: s.theme,
        columns: [],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  setCell: (r, c, raw) => {
    const e = get().engine();
    // Normalize: leading "=" -> formula string, pure numeric -> number
    let val: string | number | null = raw as any;
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (trimmed === "") val = null;
      else if (!trimmed.startsWith("=")) {
        const n = Number(trimmed);
        if (!Number.isNaN(n) && trimmed !== "") val = n;
      }
    }
    engSetCell(e, r, c, val);

    // Recompute column width based on this cell's content.
    const st = get();
    const a1 = toA1(r, c);
    const display = formatValue(
      getDisplayValue(e, r, c),
      st.styles[a1]?.fmt
    );
    const textW = measureTextWidth(display ?? "");
    const desired = Math.min(MAX_COL_W, Math.max(MIN_COL_W, textW + 24));
    const colWidths = { ...st.colWidths };
    if (desired <= COL_W) {
      // If shrinking, check if other cells in column still need width
      // For simplicity, we don't aggressively shrink to avoid layout thrash
    } else {
      const current = colWidths[c] ?? COL_W;
      if (desired > current) colWidths[c] = desired;
    }

    set((s) => ({
      dirty: true,
      version: s.version + 1,
      _keystrokes: s._keystrokes + 1,
      colWidths,
      widthsVersion: s.widthsVersion + 1,
    }));
  },

  setRangeMatrix: (topLeft, matrix) => {
    const e = get().engine();
    engSetRange(e, topLeft, matrix);
    const st = get();
    const colWidths = { ...st.colWidths };
    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix[i].length; j++) {
        const r = topLeft.r + i;
        const c = topLeft.c + j;
        const a1 = toA1(r, c);
        const display = formatValue(
          getDisplayValue(e, r, c),
          st.styles[a1]?.fmt
        );
        const textW = measureTextWidth(display ?? "");
        const desired = Math.min(MAX_COL_W, Math.max(MIN_COL_W, textW + 24));
        const current = colWidths[c] ?? COL_W;
        if (desired > current) colWidths[c] = desired;
      }
    }
    set((s) => ({
      dirty: true,
      version: s.version + 1,
      colWidths,
      widthsVersion: s.widthsVersion + 1,
    }));
  },

  clearRange: (sel) => {
    const n = normRange({
      r1: sel.start.r,
      c1: sel.start.c,
      r2: sel.end.r,
      c2: sel.end.c,
    });
    const e = get().engine();
    const matrix: (string | number | null)[][] = [];
    for (let r = n.r1; r <= n.r2; r++) {
      const row: (string | number | null)[] = [];
      for (let c = n.c1; c <= n.c2; c++) row.push(null);
      matrix.push(row);
    }
    engSetRange(e, { r: n.r1, c: n.c1 }, matrix);
    const st = get();
    const styles = { ...st.styles };
    for (let r = n.r1; r <= n.r2; r++)
      for (let c = n.c1; c <= n.c2; c++) {
        delete styles[toA1(r, c)];
      }
    set((s) => ({
      styles,
      dirty: true,
      version: s.version + 1,
    }));
  },

  insertRowAt: (r) => {
    const e = get().engine();
    engInsertRow(e, r, 1);
    set((st) => ({
      rows: st.rows + 1,
      styles: shiftStyleKeys(st.styles, "insertRow", r),
      dirty: true,
      version: st.version + 1,
    }));
  },
  deleteRowAt: (r) => {
    const e = get().engine();
    engDeleteRow(e, r, 1);
    set((st) => ({
      rows: Math.max(1, st.rows - 1),
      styles: shiftStyleKeys(st.styles, "deleteRow", r),
      dirty: true,
      version: st.version + 1,
      active: { r: Math.min(st.active.r, st.rows - 2), c: st.active.c },
    }));
  },
  insertColAt: (c) => {
    const e = get().engine();
    engInsertCol(e, c, 1);
    set((st) => ({
      cols: st.cols + 1,
      styles: shiftStyleKeys(st.styles, "insertCol", c),
      colWidths: shiftColKeys(st.colWidths, "insertCol", c),
      widthsVersion: st.widthsVersion + 1,
      dirty: true,
      version: st.version + 1,
    }));
  },
  deleteColAt: (c) => {
    const e = get().engine();
    engDeleteCol(e, c, 1);
    set((st) => ({
      cols: Math.max(1, st.cols - 1),
      styles: shiftStyleKeys(st.styles, "deleteCol", c),
      colWidths: shiftColKeys(st.colWidths, "deleteCol", c),
      widthsVersion: st.widthsVersion + 1,
      dirty: true,
      version: st.version + 1,
      active: { r: st.active.r, c: Math.min(st.active.c, st.cols - 2) },
    }));
  },

  setStyleRange: (sel, patch) => {
    const n = normRange({
      r1: sel.start.r,
      c1: sel.start.c,
      r2: sel.end.r,
      c2: sel.end.c,
    });
    const styles = { ...get().styles };
    for (let r = n.r1; r <= n.r2; r++) {
      for (let c = n.c1; c <= n.c2; c++) {
        const k = toA1(r, c);
        styles[k] = { ...(styles[k] ?? {}), ...patch };
      }
    }
    set((st) => ({ styles, dirty: true, version: st.version + 1 }));
  },

  clearStyleRange: (sel) => {
    const n = normRange({
      r1: sel.start.r,
      c1: sel.start.c,
      r2: sel.end.r,
      c2: sel.end.c,
    });
    const styles = { ...get().styles };
    for (let r = n.r1; r <= n.r2; r++) {
      for (let c = n.c1; c <= n.c2; c++) delete styles[toA1(r, c)];
    }
    set({ styles, dirty: true });
  },

  setActive: (a, extendSel) => {
    const st = get();
    const r = clamp(a.r, 0, st.rows - 1);
    const c = clamp(a.c, 0, st.cols - 1);
    const newActive = { r, c };
    set({
      active: newActive,
      selection: extendSel
        ? { start: st.selection.start, end: newActive }
        : { start: newActive, end: newActive },
      editing: null,
    });
  },

  setSelection: (s) => set({ selection: s }),

  beginEdit: (at, initial) => {
    set({ editing: { at, draft: initial ?? "" } });
  },
  updateDraft: (draft) =>
    set((st) => (st.editing ? { editing: { ...st.editing, draft } } : {})),
  commitEdit: (advance = "down") => {
    const st = get();
    if (!st.editing) return;
    const { at, draft } = st.editing;
    st.setCell(at.r, at.c, draft === "" ? null : draft);
    if (advance === "down") st.setActive({ r: at.r + 1, c: at.c });
    else if (advance === "right") st.setActive({ r: at.r, c: at.c + 1 });
    else set({ editing: null });
  },
  cancelEdit: () => set({ editing: null }),

  setFilePath: (p) => set({ filePath: p }),
  markSaved: () => set({ dirty: false, _keystrokes: 0 }),
  setProjectName: (n) => set({ projectName: n, dirty: true }),
}));
