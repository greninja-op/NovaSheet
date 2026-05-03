import { z } from "zod";

// --- Theme / Styling Tokens ---

export const ProjectThemeSchema = z.object({
  themeName: z.string(),
  colors: z.object({
    primary: z.string(),
    secondary: z.string(),
    surface: z.string(),
    text: z.string(),
  }),
  visuals: z.enum(["minimal", "glassmorphism", "neo-brutalism"]),
  fontFamily: z.string(),
});
export type ProjectTheme = z.infer<typeof ProjectThemeSchema>;

export const NumberFmtSchema = z.enum([
  "general",
  "currency",
  "percent",
  "date",
  "text",
]);
export type NumberFmt = z.infer<typeof NumberFmtSchema>;

export const CellStyleSchema = z.object({
  bg: z.string().optional(),
  fg: z.string().optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  align: z.enum(["left", "center", "right"]).optional(),
  fmt: NumberFmtSchema.optional(),
});
export type CellStyle = z.infer<typeof CellStyleSchema>;

export const ConditionalRuleSchema = z.object({
  range: z.string(),
  op: z.enum([">", "<", "=="]),
  value: z.number(),
  style: CellStyleSchema,
});
export type ConditionalRule = z.infer<typeof ConditionalRuleSchema>;

// --- Template (Blueprint) ---

export const TemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  theme: ProjectThemeSchema,
  columns: z
    .array(
      z.object({
        key: z.string(),
        header: z.string(),
        width: z.number().optional(),
        style: CellStyleSchema.optional(),
      })
    )
    .default([]),
  formulas: z
    .array(z.object({ cell: z.string(), formula: z.string() }))
    .optional(),
  conditional: z.array(ConditionalRuleSchema).optional(),
  charts: z
    .array(
      z.object({
        type: z.enum(["pie", "bar"]),
        labelRange: z.string(),
        valueRange: z.string(),
        title: z.string(),
      })
    )
    .optional(),
});
export type Template = z.infer<typeof TemplateSchema>;

// --- Project (Active Sheet) ---

export const CellValueSchema = z.union([z.string(), z.number(), z.null()]);
export type CellValue = z.infer<typeof CellValueSchema>;

export const ProjectSchema = z.object({
  id: z.string(),
  projectName: z.string(),
  isTemplate: z.boolean().default(false),
  sheetData: z.array(z.array(CellValueSchema)),
  styles: z.record(z.string(), CellStyleSchema),
  templateConfig: TemplateSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Project = z.infer<typeof ProjectSchema>;

// --- File envelope (.arum) ---

export const ArumFileSchema = z.object({
  schemaVersion: z.literal(1),
  kind: z.enum(["arum", "arum-template"]),
  payload: ProjectSchema,
});
export type ArumFile = z.infer<typeof ArumFileSchema>;

// --- Defaults ---

export const DEFAULT_THEME: ProjectTheme = {
  themeName: "Clean Minimal",
  colors: {
    primary: "#4f8cff",
    secondary: "#8a93a1",
    surface: "#111418",
    text: "#e6e8eb",
  },
  visuals: "minimal",
  fontFamily: "Segoe UI, system-ui, sans-serif",
};

export const DEFAULT_ROWS = 5000;
export const DEFAULT_COLS = 200; // A..GR
