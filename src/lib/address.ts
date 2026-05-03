// Address utilities: row/col <-> A1 notation, range parsing, style-key shifting.

export const colLetter = (c: number): string => {
  let s = "";
  let n = c;
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
};

export const colIndex = (letters: string): number => {
  let n = 0;
  for (const ch of letters.toUpperCase()) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n - 1;
};

export const toA1 = (r: number, c: number): string => `${colLetter(c)}${r + 1}`;

export const fromA1 = (a1: string): { r: number; c: number } | null => {
  const m = /^([A-Za-z]+)(\d+)$/.exec(a1);
  if (!m) return null;
  return { r: parseInt(m[2], 10) - 1, c: colIndex(m[1]) };
};

export type Range = { r1: number; c1: number; r2: number; c2: number };

export const normRange = (r: Range): Range => ({
  r1: Math.min(r.r1, r.r2),
  c1: Math.min(r.c1, r.c2),
  r2: Math.max(r.r1, r.r2),
  c2: Math.max(r.c1, r.c2),
});

export const parseRange = (spec: string): Range | null => {
  // "A1:B5" or "A1"
  const [a, b] = spec.split(":");
  const A = fromA1(a);
  if (!A) return null;
  const B = b ? fromA1(b) : A;
  if (!B) return null;
  return normRange({ r1: A.r, c1: A.c, r2: B.r, c2: B.c });
};

export const shiftStyleKeys = (
  styles: Record<string, any>,
  op: "insertRow" | "deleteRow" | "insertCol" | "deleteCol",
  index: number
): Record<string, any> => {
  const out: Record<string, any> = {};
  for (const [key, v] of Object.entries(styles)) {
    const a = fromA1(key);
    if (!a) continue;
    let { r, c } = a;
    if (op === "insertRow") {
      if (r >= index) r += 1;
    } else if (op === "deleteRow") {
      if (r === index) continue;
      if (r > index) r -= 1;
    } else if (op === "insertCol") {
      if (c >= index) c += 1;
    } else if (op === "deleteCol") {
      if (c === index) continue;
      if (c > index) c -= 1;
    }
    out[toA1(r, c)] = v;
  }
  return out;
};
