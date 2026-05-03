// Excel-style Formula bar matching reference image exactly

import { useEffect, useRef } from "react";
import { useProjectStore } from "../stores/projectStore";
import { toA1 } from "../lib/address";
import { getRawValue } from "../lib/engine";

export const FormulaBarNew = () => {
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
    <div className="flex items-center bg-white rounded-2xl shadow-sm border border-gray-100 px-3 py-2 h-10 gap-2">
      {/* Name Box */}
      <div className="flex items-center justify-center min-w-12 h-6 bg-white border border-gray-300 rounded-full px-3 text-xs font-semibold text-gray-700">
        {toA1(active.r, active.c)}
      </div>

      {/* fx label */}
      <div className="text-xs font-medium text-gray-600 italic" style={{ fontFamily: "Georgia, serif" }}>
        fx
      </div>

      {/* Formula input */}
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
        className="flex-1 h-6 px-2 bg-white border border-gray-300 rounded-full text-xs text-gray-700 outline-none"
      />
    </div>
  );
};
