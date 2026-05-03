// Auto-fill: detect pattern in source range, project values for target range.
// Source values are *raw* (string|number|null), formulas preserved as "=...".

import type { CellValue } from "./schema";

const isFormula = (v: CellValue): v is string =>
  typeof v === "string" && v.startsWith("=");

// Shift A1 refs in a formula by (dr, dc). Naive but covers SUM/IF/refs/ranges.
const shiftFormula = (f: string, dr: number, dc: number): string => {
  return f.replace(
    /(\$?)([A-Za-z]+)(\$?)(\d+)/g,
    (_m, ad, letters, an, num) => {
      const colAbs = ad === "$";
      const rowAbs = an === "$";
      let c = 0;
      for (const ch of letters.toUpperCase()) c = c * 26 + (ch.charCodeAt(0) - 64);
      c -= 1;
      let r = parseInt(num, 10) - 1;
      if (!colAbs) c += dc;
      if (!rowAbs) r += dr;
      let cs = "";
      let n = c;
      while (n >= 0) {
        cs = String.fromCharCode(65 + (n % 26)) + cs;
        n = Math.floor(n / 26) - 1;
      }
      return `${ad}${cs}${an}${r + 1}`;
    }
  );
};

const numericStep = (vals: CellValue[]): number | null => {
  if (vals.length < 2) return null;
  const nums = vals.map((v) => (typeof v === "number" ? v : Number(v)));
  if (nums.some((n) => Number.isNaN(n))) return null;
  const step = nums[1] - nums[0];
  for (let i = 2; i < nums.length; i++) {
    if (Math.abs(nums[i] - nums[i - 1] - step) > 1e-9) return null;
  }
  return step;
};

export type FillDir = "down" | "up" | "right" | "left";

// Given source values (in fill direction order) and target length, produce
// the values to paste. dr/dc indicate per-step displacement of the *target*
// start cell from the *source* start cell, used for shifting formulas.
export const computeFill = (
  source: CellValue[],
  targetLen: number,
  dir: FillDir
): CellValue[] => {
  if (source.length === 0 || targetLen <= 0) return [];

  // All formulas: copy with relative-ref shift.
  if (source.every(isFormula)) {
    const out: CellValue[] = [];
    for (let i = 0; i < targetLen; i++) {
      const src = source[i % source.length] as string;
      const stepIdx = Math.floor(i / source.length) + 1;
      const dr = dir === "down" ? source.length * stepIdx
              : dir === "up"   ? -(source.length * stepIdx)
              : 0;
      const dc = dir === "right" ? source.length * stepIdx
              : dir === "left"  ? -(source.length * stepIdx)
              : 0;
      // For each cell within the cycle, also shift by its position within the cycle.
      const within = i % source.length;
      const wdr = dir === "down" ? within : dir === "up" ? -within : 0;
      const wdc = dir === "right" ? within : dir === "left" ? -within : 0;
      // We want target_i to be source_(within) shifted by full steps (dr/dc above
      // already accounts for full cycles); ignore within for refs because the
      // base formula already references its own row/col.
      void wdr; void wdc;
      out.push(shiftFormula(src, dr, dc));
    }
    return out;
  }

  // Numeric series with constant step.
  const step = numericStep(source);
  if (step !== null) {
    const last = Number(source[source.length - 1]);
    const sign = dir === "up" || dir === "left" ? -1 : 1;
    const out: CellValue[] = [];
    for (let i = 0; i < targetLen; i++) out.push(last + sign * step * (i + 1));
    return out;
  }

  // Fallback: cycle copy.
  const out: CellValue[] = [];
  for (let i = 0; i < targetLen; i++) out.push(source[i % source.length]);
  return out;
};
