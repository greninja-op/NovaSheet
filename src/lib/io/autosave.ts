// Auto-save + crash recovery using Tauri FS at %LOCALAPPDATA%/ArumFlow/autosave.

import {
  BaseDirectory,
  exists,
  mkdir,
  readDir,
  readTextFile,
  remove,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { ask } from "@tauri-apps/plugin-dialog";
import { serializeProject, deserializeProject } from "./arum";
import type { Project } from "../schema";

const ROOT = "ArumFlow";
const AUTOSAVE_DIR = `${ROOT}/autosave`;

const ensureDirs = async () => {
  if (!(await exists(ROOT, { baseDir: BaseDirectory.AppLocalData }))) {
    await mkdir(ROOT, { baseDir: BaseDirectory.AppLocalData, recursive: true });
  }
  if (!(await exists(AUTOSAVE_DIR, { baseDir: BaseDirectory.AppLocalData }))) {
    await mkdir(AUTOSAVE_DIR, {
      baseDir: BaseDirectory.AppLocalData,
      recursive: true,
    });
  }
};

const backupPath = (projectId: string) =>
  `${AUTOSAVE_DIR}/${projectId}.arum.bak`;

export const writeBackup = async (project: Project) => {
  try {
    await ensureDirs();
    await writeTextFile(backupPath(project.id), serializeProject(project), {
      baseDir: BaseDirectory.AppLocalData,
    });
  } catch (e) {
    console.warn("autosave failed", e);
  }
};

export const clearBackup = async (projectId: string) => {
  try {
    if (
      await exists(backupPath(projectId), {
        baseDir: BaseDirectory.AppLocalData,
      })
    ) {
      await remove(backupPath(projectId), {
        baseDir: BaseDirectory.AppLocalData,
      });
    }
  } catch (e) {
    console.warn("clear autosave failed", e);
  }
};

export const findRecoverable = async (): Promise<Project | null> => {
  try {
    await ensureDirs();
    const entries = await readDir(AUTOSAVE_DIR, {
      baseDir: BaseDirectory.AppLocalData,
    });
    const baks = entries.filter(
      (e) => e.isFile && e.name?.endsWith(".arum.bak")
    );
    if (baks.length === 0) return null;
    // Read first; if multiple, we just take the first (single-window app for now).
    const first = baks[0];
    if (!first?.name) return null;
    const txt = await readTextFile(`${AUTOSAVE_DIR}/${first.name}`, {
      baseDir: BaseDirectory.AppLocalData,
    });
    const { project } = deserializeProject(txt);
    return project;
  } catch (e) {
    console.warn("recover scan failed", e);
    return null;
  }
};

export const askRestore = async (
  projectName: string
): Promise<boolean> => {
  return await ask(
    `A previous session for "${projectName}" was not saved cleanly.\n\nRestore it now?`,
    { title: "Restore previous session?", kind: "warning" }
  );
};
