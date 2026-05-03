// Native .arum file format: serialize/deserialize + Save/Open via Tauri.

import { save, open, message } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { ArumFileSchema, type ArumFile, type Project } from "../schema";

export const serializeProject = (p: Project): string => {
  const file: ArumFile = { schemaVersion: 1, kind: "arum", payload: p };
  return JSON.stringify(file, null, 2);
};

export const deserializeProject = (
  text: string
): { project: Project; kind: ArumFile["kind"] } => {
  const parsed = JSON.parse(text);
  const file = ArumFileSchema.parse(parsed);
  return { project: file.payload, kind: file.kind };
};

const ARUM_FILTER = [{ name: "Arum-Flow Project", extensions: ["arum"] }];

export const promptSavePath = async (
  defaultPath?: string
): Promise<string | null> => {
  const path = await save({
    filters: ARUM_FILTER,
    defaultPath: defaultPath ?? "untitled.arum",
  });
  return (path as string) ?? null;
};

export const promptOpenPath = async (): Promise<string | null> => {
  const picked = await open({
    multiple: false,
    filters: ARUM_FILTER,
  });
  if (!picked) return null;
  return Array.isArray(picked) ? picked[0] : (picked as string);
};

export const writeArum = async (path: string, project: Project) => {
  await writeTextFile(path, serializeProject(project));
};

export const readArum = async (path: string): Promise<Project> => {
  const txt = await readTextFile(path);
  try {
    const { project } = deserializeProject(txt);
    return project;
  } catch (e: any) {
    await message(`Could not parse .arum file:\n${e?.message ?? e}`, {
      title: "Open Failed",
      kind: "error",
    });
    throw e;
  }
};
