import type { CellValue, NumberFmt } from "./schema";

export const formatValue = (v: CellValue, fmt?: NumberFmt): string => {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "string") {
    if (fmt === "currency" || fmt === "percent" || fmt === "date") {
      const n = Number(v);
      if (!Number.isNaN(n)) return formatNumber(n, fmt);
    }
    return v;
  }
  if (typeof v === "number") {
    return formatNumber(v, fmt);
  }
  return String(v);
};

const formatNumber = (n: number, fmt?: NumberFmt): string => {
  switch (fmt) {
    case "currency":
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(n);
    case "percent":
      return new Intl.NumberFormat(undefined, {
        style: "percent",
        maximumFractionDigits: 2,
      }).format(n);
    case "date": {
      // HyperFormula serial date -> JS Date (origin 1899-12-30).
      const ms = (n - 25569) * 86400 * 1000;
      const d = new Date(ms);
      if (isNaN(d.getTime())) return String(n);
      return d.toLocaleDateString();
    }
    case "text":
      return String(n);
    case "general":
    default: {
      // Trim trailing zeros gracefully
      if (Number.isInteger(n)) return n.toString();
      return Number(n.toFixed(9)).toString();
    }
  }
};
