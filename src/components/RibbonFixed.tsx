// Excel-style Home ribbon with floating pill design

import { useProjectStore } from "../stores/projectStore";
import type { CellStyle } from "../lib/schema";
import { toA1 } from "../lib/address";
import { AlignLeft, AlignCenter, AlignRight, ChevronDown, Plus, Trash2, Paintbrush, WrapText, ArrowUpDown } from "lucide-react";

// Vertical divider between sections
const Divider = () => (
  <div className="w-px bg-gray-200 h-12 self-center mx-3" />
);

// Dropdown button
const DropdownBtn = ({ label, onClick }: { label: string; onClick?: () => void }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
  >
    {label}
    <ChevronDown size={12} className="text-gray-500" />
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
    className={`flex flex-col items-center justify-center min-w-[36px] h-12 px-1.5 rounded-lg transition-colors ${
      active 
        ? "bg-blue-50 border border-blue-500 text-blue-700" 
        : "border border-transparent hover:bg-gray-100 text-gray-700"
    }`}
  >
    <div className={`text-base font-semibold flex items-center justify-center mb-0.5`}>{children}</div>
    {label && <span className="text-[10px] text-gray-600 font-medium leading-tight text-center">{label}</span>}
  </button>
);

// Section container with anchored label
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="flex flex-col h-full justify-between items-center pt-1 pb-1">
    <div className="flex items-center gap-1.5 flex-1">
      {children}
    </div>
    <span className="text-[11px] font-medium text-gray-400 mt-1">{title}</span>
  </div>
);

export const RibbonFixed = () => {
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
    <div className="flex items-center bg-white rounded-2xl shadow-md border border-gray-100 px-6 py-3 w-full gap-2">
      {/* Font Section */}
      <Section title="Font">
        <div className="flex items-center gap-1">
          <FormatBtn onClick={() => toggle("bold")} active={!!activeStyle.bold} label="Bold">
            <span className="font-extrabold text-[#1f2937]">B</span>
          </FormatBtn>
          <FormatBtn onClick={() => toggle("italic")} active={!!activeStyle.italic} label="Italic">
            <span className="italic font-serif text-[#1f2937] pr-1">I</span>
          </FormatBtn>
          <FormatBtn onClick={() => toggle("underline")} active={!!activeStyle.underline} label="Underline">
            <span className="underline font-semibold text-[#1f2937]">U</span>
          </FormatBtn>
        </div>
        <div className="flex flex-col justify-center gap-1.5 ml-2">
          <DropdownBtn label="Font Family" />
          <div className="flex items-center gap-4 px-1 pb-0.5">
            <button className="flex items-center gap-1 hover:bg-gray-100 px-1 rounded">
              <span className="text-sm font-bold text-gray-700 tracking-tighter">AT</span>
              <ChevronDown size={10} className="text-gray-500" />
            </button>
            <button className="flex items-center gap-1 hover:bg-gray-100 px-1 rounded">
              <div className="flex flex-col items-center leading-none">
                <span className="text-[13px] font-bold text-gray-700">A</span>
                <div className="w-[14px] h-[3px] bg-red-500 rounded-sm mt-[1px]"></div>
              </div>
              <ChevronDown size={10} className="text-gray-500" />
            </button>
          </div>
        </div>
      </Section>

      <Divider />

      {/* Alignment Section */}
      <Section title="Alignment">
        <FormatBtn onClick={() => setAlign("left")} active={activeStyle.align === "left"} label="Left">
          <AlignLeft size={18} strokeWidth={2} />
        </FormatBtn>
        <FormatBtn onClick={() => setAlign("center")} active={activeStyle.align === "center"} label="Center">
          <AlignCenter size={18} strokeWidth={2} />
        </FormatBtn>
        <FormatBtn onClick={() => setAlign("right")} active={activeStyle.align === "right"} label="Right">
          <AlignRight size={18} strokeWidth={2} />
        </FormatBtn>
        <FormatBtn onClick={() => {}} title="Vertical Align" label="Vertical Align">
          <ArrowUpDown size={18} strokeWidth={2} />
        </FormatBtn>
        <FormatBtn onClick={() => {}} title="Wrap Text" label="Wrap Text">
          <WrapText size={18} strokeWidth={2} />
        </FormatBtn>
      </Section>

      <Divider />

      {/* Number Section */}
      <Section title="Number">
        <div className="flex flex-col gap-1.5">
          <DropdownBtn label="Number Format" />
          <div className="flex items-center gap-1.5 justify-center">
            <button className="text-[14px] font-semibold text-gray-700 hover:bg-gray-100 w-6 h-6 rounded flex items-center justify-center">$</button>
            <button className="text-[14px] font-semibold text-gray-700 hover:bg-gray-100 w-6 h-6 rounded flex items-center justify-center">%</button>
            <button className="text-[14px] font-semibold flex items-center gap-0.5 text-gray-700 hover:bg-gray-100 px-1.5 h-6 rounded italic font-serif">
              <span>f</span>
              <span className="text-[10px] font-sans not-italic">x</span>
            </button>
            <button className="text-[14px] font-semibold text-gray-700 hover:bg-gray-100 w-6 h-6 rounded flex items-center justify-center">.0</button>
            <button className="text-[14px] font-semibold text-gray-700 hover:bg-gray-100 w-7 h-6 rounded flex items-center justify-center">.00</button>
          </div>
        </div>
      </Section>

      <Divider />

      {/* Styles Section */}
      <Section title="Styles">
        <FormatBtn onClick={() => {}} label="Conditional Formatting">
          <span className="text-xl">💡</span>
        </FormatBtn>
        <FormatBtn onClick={() => {}} label="Table Styles">
          <div className="grid grid-cols-3 gap-[2px]">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="w-[5px] h-[5px] bg-emerald-600 rounded-[1px]"></div>
            ))}
          </div>
        </FormatBtn>
      </Section>

      <Divider />

      {/* Cells Section */}
      <Section title="Cells">
        <FormatBtn onClick={() => {}} label="Insert">
          <Plus size={18} strokeWidth={2} />
        </FormatBtn>
        <FormatBtn onClick={() => {}} label="Delete">
          <Trash2 size={18} strokeWidth={2} />
        </FormatBtn>
        <FormatBtn onClick={clearAll} label="Format">
          <Paintbrush size={18} strokeWidth={2} />
        </FormatBtn>
      </Section>
    </div>
  );
};
