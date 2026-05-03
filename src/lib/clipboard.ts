// Clipboard: Ctrl+C / Ctrl+X / Ctrl+V for ranges.
// Writes TSV to system clipboard so paste works in Excel etc. Also keeps an
// internal copy (with preserved formulas) for lossless paste within the app.

import type { CellValue } from "./schema";
import { getRawValue } from "./engine";
import { normRange } from "./address";
import type { Engine } from "./engine";
import type { Sel } from "../stores/projectStore";
import {
  readText as tauriReadText,
  writeText as tauriWriteText,
} from "@tauri-apps/plugin-clipboard-manager";

const isTauri = () =>
  typeof window !== "undefined" &&
  "__TAURI_INTERNALS__" in window;

const writeClipboard = async (text: string): Promise<void> => {
  if (isTauri()) {
    await tauriWriteText(text);
    return;
  }
  await navigator.clipboard.writeText(text);
};

const readClipboard = async (): Promise<string> => {
  if (isTauri()) {
    const v = await tauriReadText();
    return v ?? "";
  }
  return await navigator.clipboard.readText();
};

export type InternalClip = {
  /** Monotonic stamp, matched against TSV fingerprint to decide lossless vs lossy. */
  stamp: number;
  /** Raw cell values incl. "=..." formulas in fill-order rows. */
  matrix: CellValue[][];
  /** The TSV text we wrote to the OS clipboard last time. */
  tsvFingerprint: string;
};

let _internal: InternalClip | null = null;

export const getInternalClip = (): InternalClip | null => _internal;

const toTsv = (matrix: CellValue[][]): string =>
  matrix
    .map((row) =>
      row
        .map((v) => {
          if (v === null || v === undefined) return "";
          const s = String(v);
          // TSV: replace tabs and newlines to avoid corrupting structure.
          return s.replace(/\t/g, " ").replace(/\r?\n/g, " ");
        })
        .join("\t")
    )
    .join("\n");

export const copySelection = async (e: Engine, sel: Sel) => {
  const n = normRange({
    r1: sel.start.r,
    c1: sel.start.c,
    r2: sel.end.r,
    c2: sel.end.c,
  });
  const matrix: CellValue[][] = [];
  for (let r = n.r1; r <= n.r2; r++) {
    const row: CellValue[] = [];
    for (let c = n.c1; c <= n.c2; c++) {
      const raw = getRawValue(e, r, c);
      if (raw === "") row.push(null);
      else if (raw.startsWith("=")) row.push(raw);
      else {
        const num = Number(raw);
        row.push(Number.isNaN(num) ? raw : num);
      }
    }
    matrix.push(row);
  }
  const tsv = toTsv(matrix);
  _internal = { stamp: Date.now(), matrix, tsvFingerprint: tsv };
  try {
    await writeClipboard(tsv);
  } catch {
    /* clipboard may be unavailable; internal copy still works */
  }
};

export const parseTsv = (text: string): CellValue[][] => {
  // Strip trailing newline so we don't get a phantom empty row
  const t = text.replace(/\r\n?/g, "\n").replace(/\n$/, "");
  if (t === "") return [[]];
  return t.split("\n").map((line) =>
    line.split("\t").map((cell) => {
      if (cell === "") return null as CellValue;
      if (cell.startsWith("=")) return cell;
      const n = Number(cell);
      return Number.isNaN(n) ? cell : n;
    })
  );
};

export const readClipboardMatrix = async (): Promise<CellValue[][]> => {
  let text = "";
  try {
    text = await readClipboard();
  } catch {
    text = "";
  }
  if (_internal && text === _internal.tsvFingerprint) {
    // Internal content is authoritative — preserves formula strings exactly.
    return _internal.matrix.map((r) => r.slice());
  }
  return parseTsv(text);
};
