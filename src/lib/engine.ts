// HyperFormula wrapper.
// Keeps a single HF instance per open project, exposes focused helpers.

import { HyperFormula, type SimpleCellAddress } from "hyperformula";
import type { CellValue } from "./schema";

export const SHEET_NAME = "Sheet1";

export type Engine = {
  hf: HyperFormula;
  sheetId: number;
};

export const createEngine = (data: CellValue[][]): Engine => {
  const hf = HyperFormula.buildFromArray(data, {
    licenseKey: "gpl-v3",
    precisionRounding: 9,
    smartRounding: true,
  });
  // buildFromArray creates a default sheet named "Sheet1"
  const sheetId = hf.getSheetId(SHEET_NAME) ?? 0;
  return { hf, sheetId };
};

export const destroyEngine = (e: Engine | null) => {
  if (e) {
    try {
      e.hf.destroy();
    } catch {
      /* no-op */
    }
  }
};

export const addr = (e: Engine, r: number, c: number): SimpleCellAddress => ({
  sheet: e.sheetId,
  row: r,
  col: c,
});

// Get the *displayed* (computed) value for a cell.
// For formula cells this returns the evaluated result; for plain cells, the value.
export const getDisplayValue = (
  e: Engine,
  r: number,
  c: number
): CellValue => {
  const v = e.hf.getCellValue(addr(e, r, c));
  if (v === null || v === undefined) return null;
  if (typeof v === "object") {
    // CellError
    const anyV = v as any;
    if (anyV.type) return `#${String(anyV.type).toUpperCase()}!`;
    return String(v);
  }
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  return v as CellValue;
};

// Get raw formula/value for editing (returns "=SUM(...)" for formula cells).
export const getRawValue = (e: Engine, r: number, c: number): string => {
  const v = e.hf.getCellFormula(addr(e, r, c));
  if (v !== undefined) return v; // formula string
  const raw = e.hf.getCellValue(addr(e, r, c));
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "object") return "";
  return String(raw);
};

export const setCell = (
  e: Engine,
  r: number,
  c: number,
  raw: string | number | null
) => {
  e.hf.setCellContents(addr(e, r, c), [[raw as any]]);
};

export const setRange = (
  e: Engine,
  topLeft: { r: number; c: number },
  matrix: (string | number | null)[][]
) => {
  e.hf.setCellContents(
    { sheet: e.sheetId, row: topLeft.r, col: topLeft.c },
    matrix as any
  );
};

export const insertRow = (e: Engine, index: number, count = 1) => {
  e.hf.addRows(e.sheetId, [index, count]);
};
export const deleteRow = (e: Engine, index: number, count = 1) => {
  e.hf.removeRows(e.sheetId, [index, count]);
};
export const insertCol = (e: Engine, index: number, count = 1) => {
  e.hf.addColumns(e.sheetId, [index, count]);
};
export const deleteCol = (e: Engine, index: number, count = 1) => {
  e.hf.removeColumns(e.sheetId, [index, count]);
};

// Copy HF's internal data (formulas preserved) as a raw matrix for serialization.
export const dumpRaw = (e: Engine): CellValue[][] => {
  const dims = e.hf.getSheetDimensions(e.sheetId);
  const rows: CellValue[][] = [];
  for (let r = 0; r < dims.height; r++) {
    const row: CellValue[] = [];
    for (let c = 0; c < dims.width; c++) {
      const f = e.hf.getCellFormula({ sheet: e.sheetId, row: r, col: c });
      if (f !== undefined) {
        row.push(f);
      } else {
        const v = e.hf.getCellValue({ sheet: e.sheetId, row: r, col: c });
        if (v === null || v === undefined) row.push(null);
        else if (typeof v === "object") row.push(null);
        else if (typeof v === "boolean") row.push(v ? "TRUE" : "FALSE");
        else row.push(v as CellValue);
      }
    }
    rows.push(row);
  }
  return rows;
};
