// Excel-style Home ribbon matching reference image exactly

import { useProjectStore } from "../stores/projectStore";
import type { CellStyle } from "../lib/schema";
import { toA1, normRange } from "../lib/address";
import { AlignLeft, AlignCenter, AlignRight, ChevronDown, Plus, Trash2, Paintbrush } from "lucide-react";
import { ColorPicker } from "./ColorPicker";
import { useState, useRef, useEffect } from "react";

// Vertical divider between sections
const Divider = () => (
  <div style={{ width: 1, height: 50, background: "#e1dfdd", margin: "0 6px" }} />
);

// Tool button with icon
const ToolBtn = ({
  onClick,
  active,
  title,
  children,
  label,
}: {
  onClick: () => void;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
  label?: string;
}) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 28,
      height: 44,
      padding: "2px 4px",
      background: active ? "#e8f4f8" : "transparent",
      border: "1px solid",
      borderColor: active ? "#bdd7ee" : "transparent",
      borderRadius: 4,
      cursor: "pointer",
    }}
  >
    <div style={{ color: active ? "#217346" : "#323130", fontSize: 13 }}>{children}</div>
    {label && <span style={{ fontSize: 10, color: "#605e5c", marginTop: 2 }}>{label}</span>}
  </button>
);

// Font color button with "A" and underline
const FontColorBtn = ({
  color,
  onChange,
}: {
  color: string;
  onChange: (v: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    if (open) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <button
        onClick={() => setOpen(!open)}
        title="Font Color"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "2px 4px",
          background: "transparent",
          border: "1px solid transparent",
          borderRadius: 4,
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: "#323130" }}>A</span>
        <div style={{ width: 14, height: 3, background: color, borderRadius: 1, marginTop: 1 }} />
      </button>
      <span style={{ fontSize: 10, color: "#605e5c", marginTop: 2 }}>Font Color</span>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, zIndex: 1000 }}>
          <ColorPicker value={color} onChange={onChange} onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
};

// Dropdown button
const DropdownBtn = ({ label, onClick }: { label: string; onClick?: () => void }) => (
  <button
    onClick={onClick}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 4,
      padding: "4px 8px",
      background: "#faf9f8",
      border: "1px solid #e1dfdd",
      borderRadius: 4,
      fontSize: 12,
      color: "#323130",
      cursor: "pointer",
    }}
  >
    {label}
    <ChevronDown size={14} />
  </button>
);

// Icon button for alignment/tools
const IconBtn = ({
  onClick,
  active,
  title,
  children,
  label,
}: {
  onClick: () => void;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
  label?: string;
}) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 24,
      height: 40,
      padding: "2px 3px",
      background: active ? "#e8f4f8" : "transparent",
      border: "1px solid",
      borderColor: active ? "#bdd7ee" : "transparent",
      borderRadius: 4,
      cursor: "pointer",
    }}
  >
    <div style={{ color: active ? "#217346" : "#323130" }}>{children}</div>
    {label && <span style={{ fontSize: 9, color: "#605e5c", marginTop: 1 }}>{label}</span>}
  </button>
);

// Section container with label
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 4px" }}>
    <div style={{ display: "flex", alignItems: "flex-start", gap: 2, height: 50 }}>
      {children}
    </div>
    <span style={{ fontSize: 11, color: "#605e5c", marginTop: 4 }}>{title}</span>
  </div>
);

export const Ribbon = () => {
  const styles = useProjectStore((s) => s.styles);
  const sel = useProjectStore((s) => s.selection);
  const active = useProjectStore((s) => s.active);
  const setStyleRange = useProjectStore((s) => s.setStyleRange);
  const clearStyleRange = useProjectStore((s) => s.clearStyleRange);

  const activeStyle: CellStyle = styles[toA1(active.r, active.c)] ?? {};
  const toggle = (k: keyof CellStyle) => {
    setStyleRange(sel, { [k]: !activeStyle[k] } as Partial<CellStyle>);
  };
  const setAlign = (a: "left" | "center" | "right") => setStyleRange(sel, { align: a });
  const setColor = (key: "bg" | "fg", value: string) => setStyleRange(sel, { [key]: value });
  const clearAll = () => clearStyleRange(sel);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        padding: "6px 12px",
        background: "#faf9f8",
        borderBottom: "1px solid #e1dfdd",
        minHeight: 85,
        gap: 4,
      }}
    >
      {/* Font Section */}
      <Section title="Font">
        <ToolBtn onClick={() => toggle("bold")} active={!!activeStyle.bold} title="Bold" label="Bold">
          <b>B</b>
        </ToolBtn>
        <ToolBtn onClick={() => toggle("italic")} active={!!activeStyle.italic} title="Italic" label="Italic">
          <i>I</i>
        </ToolBtn>
        <ToolBtn onClick={() => toggle("underline")} active={!!activeStyle.underline} title="Underline" label="Underline">
          <u>U</u>
        </ToolBtn>
        <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: 4 }}>
          <span style={{ fontSize: 12, color: "#323130", fontWeight: 600 }}>AT</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ width: 16, height: 3, background: "#217346", borderRadius: 1 }} />
            <div style={{ width: 16, height: 3, background: activeStyle.fg || "#323130", borderRadius: 1 }} />
          </div>
        </div>
        <FontColorBtn color={activeStyle.fg ?? "#323130"} onChange={(v) => setColor("fg", v)} />
      </Section>

      <Divider />

      {/* Alignment Section */}
      <Section title="Alignment">
        <IconBtn onClick={() => setAlign("left")} active={activeStyle.align === "left"} title="Align Left" label="Left">
          <AlignLeft size={16} />
        </IconBtn>
        <IconBtn onClick={() => setAlign("center")} active={activeStyle.align === "center"} title="Align Center" label="Center">
          <AlignCenter size={16} />
        </IconBtn>
        <IconBtn onClick={() => setAlign("right")} active={activeStyle.align === "right"} title="Align Right" label="Right">
          <AlignRight size={16} />
        </IconBtn>
        <IconBtn onClick={() => {}} title="Vertical Align" label="Vertical">
          <span style={{ fontSize: 14 }}>↕</span>
        </IconBtn>
        <IconBtn onClick={() => {}} title="Wrap Text" label="Wrap">
          <span style={{ fontSize: 12 }}>↵</span>
        </IconBtn>
      </Section>

      <Divider />

      {/* Number Section */}
      <Section title="Number">
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
          <DropdownBtn label="Number Format" />
          <div style={{ display: "flex", gap: 4 }}>
            <ToolBtn onClick={() => {}} title="Currency" label="">
              <span style={{ fontSize: 16 }}>$</span>
            </ToolBtn>
            <ToolBtn onClick={() => {}} title="Percent" label="">
              <span style={{ fontSize: 16 }}>%</span>
            </ToolBtn>
            <ToolBtn onClick={() => {}} title="Function" label="">
              <span style={{ fontSize: 16, fontStyle: "italic" }}>ƒ</span>
            </ToolBtn>
            <ToolBtn onClick={() => {}} title="More" label="">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 3px)", gap: 1 }}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} style={{ width: 3, height: 3, background: "#605e5c", borderRadius: "50%" }} />
                ))}
              </div>
            </ToolBtn>
          </div>
        </div>
      </Section>

      <Divider />

      {/* Styles Section */}
      <Section title="Styles">
        <IconBtn onClick={() => {}} title="Conditional Formatting" label="Conditional">
          <span style={{ fontSize: 18 }}>💡</span>
        </IconBtn>
        <IconBtn onClick={() => {}} title="Table Styles" label="Table">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 4px)", gap: 1 }}>
            {[...Array(9)].map((_, i) => (
              <div key={i} style={{ width: 4, height: 4, background: "#217346", borderRadius: 1 }} />
            ))}
          </div>
        </IconBtn>
      </Section>

      <Divider />

      {/* Cells Section */}
      <Section title="Cells">
        <IconBtn onClick={() => {}} title="Insert" label="Insert">
          <Plus size={16} />
        </IconBtn>
        <IconBtn onClick={() => {}} title="Delete" label="Delete">
          <Trash2 size={16} />
        </IconBtn>
        <IconBtn onClick={clearAll} title="Format" label="Format">
          <Paintbrush size={16} />
        </IconBtn>
      </Section>

      {/* Range indicator */}
      <div style={{ marginLeft: "auto", fontSize: 11, color: "#605e5c", padding: "8px", alignSelf: "center" }}>
        {(() => {
          const n = normRange({
            r1: sel.start.r,
            c1: sel.start.c,
            r2: sel.end.r,
            c2: sel.end.c,
          });
          return n.r1 === n.r2 && n.c1 === n.c2
            ? toA1(n.r1, n.c1)
            : `${toA1(n.r1, n.c1)}:${toA1(n.r2, n.c2)}`;
        })()}
      </div>
    </div>
  );
};
