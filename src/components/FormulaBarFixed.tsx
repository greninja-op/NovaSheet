// Excel-style Formula bar with seamless pill design

import { useEffect, useRef } from "react";
import { useProjectStore } from "../stores/projectStore";
import { toA1 } from "../lib/address";
import { getRawValue } from "../lib/engine";

export const FormulaBarFixed = () => {
  const active = useProjectStore((s) => s.active);
  const editing = useProjectStore((s) => s.editing);
  const version = useProjectStore((s) => s.version);
  const beginEdit = useProjectStore((s) => s.beginEdit);
  const updateDraft = useProjectStore((s) => s.updateDraft);
  const commitEdit = useProjectStore((s) => s.commitEdit);
  const cancelEdit = useProjectStore((s) => s.cancelEdit);
  const engine = useProjectStore((s) => s.engine);

  const inputRef = useRef<HTMLInputElement>(null);

  const e = engine();
  const cellRaw = editing
    ? editing.draft
    : getRawValue(e, active.r, active.c);
  void version;

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      const v = inputRef.current.value;
      inputRef.current.setSelectionRange(v.length, v.length);
    }
  }, [editing?.at.r, editing?.at.c]);

  const onFocus = () => {
    if (!editing) {
      beginEdit(active, getRawValue(e, active.r, active.c));
    }
  };

  const onKey = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      commitEdit("down");
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      cancelEdit();
    } else if (ev.key === "Tab") {
      ev.preventDefault();
      commitEdit("right");
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* Name Box & fx Pill */}
      <div className="flex items-center bg-white rounded-full shadow-sm border border-white/50 px-4 py-1 h-12 gap-5 shrink-0">
        <div className="flex items-center justify-center min-w-10 text-[15px] text-gray-800">
          {toA1(active.r, active.c)}
        </div>
        <div className="text-xl text-gray-600 italic font-serif">
          fx
        </div>
      </div>

      {/* Formula Input Pill */}
      <div className="flex-1 flex items-center bg-white rounded-full shadow-sm border border-white/50 px-5 py-1 h-12">
        <input
          ref={inputRef}
          value={cellRaw}
          onFocus={onFocus}
          onChange={(ev) => {
            if (!editing) beginEdit(active, ev.target.value);
            else updateDraft(ev.target.value);
          }}
          onKeyDown={onKey}
          spellCheck={false}
          placeholder="Column Name"
          className="flex-1 h-full bg-transparent border-none outline-none ring-0 text-[15px] text-gray-700"
        />
      </div>
    </div>
  );
};
