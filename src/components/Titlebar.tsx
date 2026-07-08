// Custom titlebar for the frameless Tauri window.

import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useProjectStore } from "../stores/projectStore";

export const Titlebar = () => {
  const projectName = useProjectStore((s) => s.projectName);
  const dirty = useProjectStore((s) => s.dirty);
  const [maxed, setMaxed] = useState(false);

  useEffect(() => {
    const w = getCurrentWindow();
    w.isMaximized().then(setMaxed).catch(() => {});
    const un = w.onResized(() => {
      w.isMaximized().then(setMaxed).catch(() => {});
    });
    return () => {
      un.then((f) => f());
    };
  }, []);

  const onMin = () => getCurrentWindow().minimize();
  const onMax = () => getCurrentWindow().toggleMaximize();
  const onClose = () => getCurrentWindow().close();

  return (
    <div
      data-tauri-drag-region
      className="flex h-10 items-center justify-between bg-gray-50 border-b border-gray-200 select-none relative z-50 text-gray-700"
    >
      <div
        data-tauri-drag-region
        className="flex items-center gap-2 px-4 text-xs"
      >
        <span
          data-tauri-drag-region
          className="font-semibold text-gray-800"
        >
          Arum-Flow
        </span>
        <span data-tauri-drag-region className="text-gray-400">
          —
        </span>
        <span data-tauri-drag-region className="truncate max-w-[60ch]">
          {dirty ? "● " : ""}
          {projectName || "Untitled"}
        </span>
      </div>
      <div className="flex h-full">
        <button
          onClick={onMin}
          className="h-full w-12 hover:bg-black/5 flex items-center justify-center transition-colors"
          title="Minimize"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect y="4.5" width="10" height="1" fill="currentColor" />
          </svg>
        </button>
        <button
          onClick={onMax}
          className="h-full w-12 hover:bg-[var(--af-surface-2)] flex items-center justify-center"
          title={maxed ? "Restore" : "Maximize"}
        >
          {maxed ? (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect
                x="0.5"
                y="2.5"
                width="7"
                height="7"
                fill="none"
                stroke="currentColor"
              />
              <rect
                x="2.5"
                y="0.5"
                width="7"
                height="7"
                fill="none"
                stroke="currentColor"
              />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect
                x="0.5"
                y="0.5"
                width="9"
                height="9"
                fill="none"
                stroke="currentColor"
              />
            </svg>
          )}
        </button>
        <button
          onClick={onClose}
          className="h-full w-12 hover:bg-[var(--af-danger)] hover:text-white flex items-center justify-center"
          title="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" />
            <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  );
};
