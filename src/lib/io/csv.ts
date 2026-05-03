// CSV import via Tauri FS + PapaParse.

import Papa from "papaparse";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import type { CellValue } from "../schema";

export const promptCsvPath = async (): Promise<string | null> => {
  const picked = await open({
    multiple: false,
    filters: [{ name: "CSV", extensions: ["csv", "tsv", "txt"] }],
  });
  if (!picked) return null;
  return Array.isArray(picked) ? picked[0] : (picked as string);
};

export const importCsv = async (
  path: string
): Promise<{ matrix: CellValue[][]; rows: number; cols: number }> => {
  let text = await readTextFile(path);
  // Strip UTF-8 BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const result = Papa.parse<string[]>(text, {
    header: false,
    dynamicTyping: false, // we coerce ourselves to keep formula strings intact
    skipEmptyLines: false,
  });

  const matrix: CellValue[][] = result.data.map((row) =>
    row.map((cell) => {
      if (cell === "" || cell == null) return null as CellValue;
      const trimmed = String(cell).trim();
      if (trimmed.startsWith("=")) return trimmed; // preserve formula
      const n = Number(trimmed);
      if (!Number.isNaN(n) && trimmed !== "") return n;
      return cell;
    })
  );

  const rows = matrix.length;
  const cols = matrix.reduce((m, r) => Math.max(m, r.length), 0);
  return { matrix, rows, cols };
};
