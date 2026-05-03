// High-level file operation helpers wired into the projectStore.

import { useProjectStore } from "../stores/projectStore";
import {
  promptOpenPath,
  promptSavePath,
  readArum,
  writeArum,
} from "./io/arum";
import { importCsv, promptCsvPath } from "./io/csv";
import { clearBackup } from "./io/autosave";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { message } from "@tauri-apps/plugin-dialog";

export const updateWindowTitle = async () => {
  try {
    const s = useProjectStore.getState();
    const base = s.projectName || "Untitled";
    const dirty = s.dirty ? "* " : "";
    await getCurrentWindow().setTitle(`${dirty}${base} — Arum-Flow`);
  } catch {
    /* dev w/o tauri */
  }
};

export const saveProject = async (saveAs = false): Promise<boolean> => {
  const st = useProjectStore.getState();
  let path = st.filePath;
  if (saveAs || !path) {
    path = await promptSavePath(st.projectName + ".arum");
    if (!path) return false;
  }
  try {
    const project = st.toProject();
    await writeArum(path, project);
    useProjectStore.setState({ filePath: path });
    st.markSaved();
    await clearBackup(st.id);
    await updateWindowTitle();
    return true;
  } catch (e: any) {
    await message(`Save failed:\n${e?.message ?? e}`, {
      title: "Save Failed",
      kind: "error",
    });
    return false;
  }
};

export const openProject = async (): Promise<boolean> => {
  const path = await promptOpenPath();
  if (!path) return false;
  try {
    const project = await readArum(path);
    useProjectStore.getState().loadProject(project, path);
    await clearBackup(project.id);
    await updateWindowTitle();
    return true;
  } catch {
    return false;
  }
};

export const importCsvIntoSheet = async (): Promise<boolean> => {
  const path = await promptCsvPath();
  if (!path) return false;
  try {
    const { matrix, rows, cols } = await importCsv(path);
    const st = useProjectStore.getState();
    st.newBlank();
    if (rows && cols) {
      st.setRangeMatrix({ r: 0, c: 0 }, matrix as any);
    }
    useProjectStore.setState({
      projectName:
        path
          .replace(/\\/g, "/")
          .split("/")
          .pop()
          ?.replace(/\.[^.]+$/, "") ?? "Imported",
      filePath: null,
      dirty: true,
    });
    await updateWindowTitle();
    await message(`Imported ${rows} rows × ${cols} cols.`, {
      title: "CSV Imported",
      kind: "info",
    });
    return true;
  } catch (e: any) {
    await message(`Import failed:\n${e?.message ?? e}`, {
      title: "Import Failed",
      kind: "error",
    });
    return false;
  }
};
