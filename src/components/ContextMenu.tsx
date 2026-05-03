// Right-click context menu for the grid.

import { useEffect, useRef } from "react";

export type CtxItem =
  | { kind: "item"; label: string; onClick: () => void; disabled?: boolean }
  | { kind: "sep" };

export const ContextMenu = ({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: CtxItem[];
  onClose: () => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{ top: y, left: x }}
      className="fixed z-50 min-w-[210px] bg-[var(--af-surface-2)] border border-[var(--af-border)] rounded shadow-lg py-1 text-sm"
    >
      {items.map((it, i) =>
        it.kind === "sep" ? (
          <div key={i} className="my-1 border-t border-[var(--af-border)]" />
        ) : (
          <button
            key={i}
            disabled={it.disabled}
            onClick={() => {
              it.onClick();
              onClose();
            }}
            className="block w-full text-left px-3 py-1.5 hover:bg-[var(--af-surface)] disabled:opacity-40 disabled:hover:bg-transparent"
          >
            {it.label}
          </button>
        )
      )}
    </div>
  );
};
