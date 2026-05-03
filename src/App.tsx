import { useEffect, useRef, useState } from "react";
import { Titlebar } from "./components/Titlebar";
import { RibbonTabsFixed, type TabId } from "./components/RibbonTabsFixed";
import { RibbonFixed } from "./components/RibbonFixed";
import { FormulaBarFixed } from "./components/FormulaBarFixed";
import { SheetGrid } from "./components/SheetGrid";
import { useProjectStore } from "./stores/projectStore";
import {
  openProject,
  saveProject,
  updateWindowTitle,
} from "./lib/fileOps";
import {
  askRestore,
  clearBackup,
  findRecoverable,
  writeBackup,
} from "./lib/io/autosave";

function App() {
  const newBlank = useProjectStore((s) => s.newBlank);
  const projectName = useProjectStore((s) => s.projectName);
  const dirty = useProjectStore((s) => s.dirty);
  const id = useProjectStore((s) => s.id);
  const initRan = useRef(false);
  const [activeTab, setActiveTab] = useState<TabId>("home");

  // First-launch initialization: empty project + recovery prompt
  useEffect(() => {
    if (initRan.current) return;
    initRan.current = true;
    (async () => {
      newBlank();
      const recoverable = await findRecoverable();
      if (recoverable) {
        const yes = await askRestore(recoverable.projectName || "Untitled");
        if (yes) {
          useProjectStore.getState().loadProject(recoverable, null);
        } else {
          await clearBackup(recoverable.id);
        }
      }
      await updateWindowTitle();
    })();
  }, [newBlank]);

  // Window title sync
  useEffect(() => {
    updateWindowTitle();
  }, [projectName, dirty]);

  // Auto-save: every 2 minutes OR after 50 keystrokes since last save
  useEffect(() => {
    const tick = async () => {
      const st = useProjectStore.getState();
      if (!st.dirty) return;
      const project = st.toProject();
      await writeBackup(project);
    };
    const interval = setInterval(tick, 120_000);
    const unsub = useProjectStore.subscribe((s, prev) => {
      if (s._keystrokes !== prev._keystrokes && s._keystrokes >= 50) {
        // reset counter so we don't fire repeatedly until next 50
        useProjectStore.setState({ _keystrokes: 0 });
        tick();
      }
    });
    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [id]);

  // Global keyboard shortcuts (Save / Open / New)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (!meta) return;
      const k = e.key.toLowerCase();
      if (k === "s") {
        e.preventDefault();
        saveProject(e.shiftKey);
      } else if (k === "o") {
        e.preventDefault();
        openProject();
      } else if (k === "n") {
        e.preventDefault();
        useProjectStore.getState().newBlank();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Disable native context menu globally (we render our own)
  useEffect(() => {
    const onCtx = (e: MouseEvent) => e.preventDefault();
    window.addEventListener("contextmenu", onCtx);
    return () => window.removeEventListener("contextmenu", onCtx);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#E5E7EB] font-sans text-gray-800 overflow-hidden">
      <Titlebar />
      
      {/* Top Controls Container */}
      <div className="px-4 pt-4 flex flex-col gap-3 shrink-0 overflow-x-auto scrollbar-hide">
        <RibbonTabsFixed activeTab={activeTab} onTabChange={setActiveTab} />
        <RibbonFixed />
        <FormulaBarFixed />
      </div>
      
      {/* Spreadsheet Grid container */}
      <div className="mx-4 mt-3 mb-4 flex-1 bg-white rounded-[20px] shadow-sm border border-gray-200 overflow-hidden relative">
        <SheetGrid />
      </div>
    </div>
  );
}

export default App;
