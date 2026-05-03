// Excel-style Home ribbon matching reference image exactly

import { useProjectStore } from "../stores/projectStore";
import type { CellStyle } from "../lib/schema";
import { toA1, normRange } from "../lib/address";
import { AlignLeft, AlignCenter, AlignRight, ChevronDown, Plus, Trash2, Paintbrush } from "lucide-react";

// Vertical divider between sections
const Divider = () => (
  <div className="w-px h-12 bg-gray-200 mx-2" />
);

// Dropdown button
const DropdownBtn = ({ label, onClick }: { label: string; onClick?: () => void }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-50"
  >
    {label}
    <ChevronDown size={12} />
  </button>
);

// Icon button for formatting tools
const FormatBtn = ({
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
    className={`flex flex-col items-center justify-center min-w-6 h-10 p-1 rounded transition-colors ${
      active 
        ? "bg-gray-100 border border-blue-500" 
        : "border border-transparent hover:bg-gray-50"
    }`}
  >
    <div className={`text-sm ${active ? "text-blue-600" : "text-gray-700"}`}>{children}</div>
    {label && <span className="text-[9px] text-gray-500 mt-0.5">{label}</span>}
  </button>
);

// Section container with label
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="flex flex-col items-center px-2">
    <div className="flex items-start gap-1 h-12">
      {children}
    </div>
    <span className="text-[10px] text-gray-500 mt-1">{title}</span>
  </div>
);

export const RibbonNew = () => {
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
  const clearAll = () => clearStyleRange(sel);

  return (
    <div className="flex items-start bg-white rounded-2xl shadow-sm border border-gray-100 px-3 py-2 min-h-[85px] gap-1">
      {/* Font Section */}
      <Section title="Font">
        <div className="flex flex-col gap-1">
          <div className="flex gap-1">
            <FormatBtn onClick={() => toggle("bold")} active={!!activeStyle.bold} title="Bold">
              <b className="text-blue-600">B</b>
            </FormatBtn>
            <FormatBtn onClick={() => toggle("italic")} active={!!activeStyle.italic} title="Italic">
              <span className="italic">I</span>
            </FormatBtn>
            <FormatBtn onClick={() => toggle("underline")} active={!!activeStyle.underline} title="Underline">
              <u>U</u>
            </FormatBtn>
            <DropdownBtn label="Font Family" />
          </div>
          <div className="flex gap-1 items-center">
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-700 font-semibold">AT</span>
              <ChevronDown size={12} className="text-gray-500" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold text-gray-700">A</span>
              <div className="w-3 h-0.5 bg-red-500"></div>
            </div>
          </div>
        </div>
      </Section>

      <Divider />

      {/* Alignment Section */}
      <Section title="Alignment">
        <div className="flex flex-col gap-1">
          <div className="flex gap-1">
            <FormatBtn onClick={() => setAlign("left")} active={activeStyle.align === "left"} title="Align Left">
              <AlignLeft size={16} strokeWidth={1.5} />
            </FormatBtn>
            <FormatBtn onClick={() => setAlign("center")} active={activeStyle.align === "center"} title="Align Center">
              <AlignCenter size={16} strokeWidth={1.5} />
            </FormatBtn>
            <FormatBtn onClick={() => setAlign("right")} active={activeStyle.align === "right"} title="Align Right">
              <AlignRight size={16} strokeWidth={1.5} />
            </FormatBtn>
          </div>
          <div className="flex gap-1">
            <FormatBtn onClick={() => {}} title="Top Align">
              <div className="w-3 h-3 border-t-2 border-gray-600"></div>
            </FormatBtn>
            <FormatBtn onClick={() => {}} title="Middle Align">
              <div className="w-3 h-3 border-t border-b border-gray-600"></div>
            </FormatBtn>
            <FormatBtn onClick={() => {}} title="Bottom Align">
              <div className="w-3 h-3 border-b-2 border-gray-600"></div>
            </FormatBtn>
            <FormatBtn onClick={() => {}} title="Text Orientation">
              <span className="text-sm transform rotate-90 inline-block">T</span>
            </FormatBtn>
            <FormatBtn onClick={() => {}} title="Wrap Text">
              <span className="text-xs">↵</span>
            </FormatBtn>
          </div>
        </div>
      </Section>

      <Divider />

      {/* Number Section */}
      <Section title="Number">
        <div className="flex flex-col gap-1">
          <DropdownBtn label="Number Format" />
          <div className="flex gap-1">
            <FormatBtn onClick={() => {}} title="Currency">
              <span className="text-sm">$</span>
            </FormatBtn>
            <FormatBtn onClick={() => {}} title="Percent">
              <span className="text-sm">%</span>
            </FormatBtn>
            <FormatBtn onClick={() => {}} title="Comma">
              <span className="text-sm">,</span>
            </FormatBtn>
            <FormatBtn onClick={() => {}} title="Increase Decimal">
              <span className="text-sm">.0</span>
            </FormatBtn>
            <FormatBtn onClick={() => {}} title="Decrease Decimal">
              <span className="text-sm">.00</span>
            </FormatBtn>
          </div>
        </div>
      </Section>

      <Divider />

      {/* Styles Section */}
      <Section title="Styles">
        <div className="flex gap-1">
          <FormatBtn onClick={() => {}} title="Conditional Formatting">
            <span className="text-lg">💡</span>
          </FormatBtn>
          <FormatBtn onClick={() => {}} title="Table Styles">
            <div className="grid grid-cols-3 gap-0.5">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="w-1 h-1 bg-emerald-500 rounded-sm"></div>
              ))}
            </div>
          </FormatBtn>
        </div>
      </Section>

      <Divider />

      {/* Cells Section */}
      <Section title="Cells">
        <div className="flex gap-1">
          <FormatBtn onClick={() => {}} title="Insert">
            <Plus size={16} strokeWidth={1.5} />
          </FormatBtn>
          <FormatBtn onClick={() => {}} title="Delete">
            <Trash2 size={16} strokeWidth={1.5} />
          </FormatBtn>
          <FormatBtn onClick={clearAll} title="Format">
            <Paintbrush size={16} strokeWidth={1.5} />
          </FormatBtn>
        </div>
      </Section>

      {/* Range indicator */}
      <div className="ml-auto text-[10px] text-gray-500 px-2 self-center">
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
