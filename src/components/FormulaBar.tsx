// Excel-style Formula bar with rounded name box

import { useEffect, useRef } from "react";
import { useProjectStore } from "../stores/projectStore";
import { toA1 } from "../lib/address";
import { getRawValue } from "../lib/engine";

export const FormulaBar = () => {
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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: 36,
        background: "#ffffff",
        borderBottom: "1px solid #e1dfdd",
        padding: "0 12px",
        gap: 8,
      }}
    >
      {/* Name Box - pill shaped */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 50,
          height: 24,
          background: "#f3f2f1",
          border: "1px solid #e1dfdd",
          borderRadius: 12,
          padding: "0 10px",
          fontSize: 12,
          fontWeight: 600,
          color: "#323130",
        }}
      >
        {toA1(active.r, active.c)}
      </div>

      {/* fx label */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "#605e5c",
          fontStyle: "italic",
          fontFamily: "Georgia, serif",
        }}
      >
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
        style={{
          flex: 1,
          height: 24,
          padding: "0 10px",
          background: "#f3f2f1",
          border: "1px solid #e1dfdd",
          borderRadius: 12,
          fontSize: 13,
          fontFamily: "Segoe UI, system-ui, sans-serif",
          color: "#323130",
          outline: "none",
        }}
      />
    </div>
  );
};
