import { invoke } from "@tauri-apps/api/core";
import {
  mkdir,
  readTextFile,
  remove,
  rename,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { basename, joinPath, parentPath } from "@/lib/utils";
import type { DirEntry, FileSystemAdapter } from "./types";

interface RustDirEntry {
  name: string;
  path: string;
  is_dir: boolean;
}

export function isOsPath(path: string) {
  if (!path || path.startsWith("__scratch__")) return false;
  if (/^[A-Za-z]:[\\/]/.test(path)) return true;
  if (path.startsWith("\\\\")) return true;
  return (
    path.startsWith("/Users/") ||
    path.startsWith("/home/") ||
    path.startsWith("/tmp/") ||
    path.startsWith("/var/") ||
    path.startsWith("/private/var/") ||
    path.startsWith("/private/tmp/")
  );
}

export async function readOsFile(path: string) {
  return readTextFile(path);
}

export async function writeOsFile(path: string, content: string) {
  const dir = parentPath(path);
  if (dir && dir !== path) {
    try {
      await mkdir(dir, { recursive: true });
    } catch {
      /* exists */
    }
  }
  await writeTextFile(path, content);
}

export class TauriDiskFS implements FileSystemAdapter {
  kind = "native" as const;
  name: string;
  rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
    this.name = basename(rootPath) || rootPath;
  }

  async list(path: string): Promise<DirEntry[]> {
    const entries = await invoke<RustDirEntry[]>("list_dir", { path });
    return entries.map((e) => ({
      name: e.name,
      path: e.path,
      kind: e.is_dir ? "dir" : "file",
    }));
  }

  async read(path: string): Promise<string> {
    return readTextFile(path);
  }

  async write(path: string, content: string): Promise<void> {
    await writeOsFile(path, content);
  }

  async mkdir(path: string): Promise<void> {
    await mkdir(path, { recursive: true });
  }

  async remove(path: string): Promise<void> {
    await remove(path, { recursive: true });
  }

  async rename(from: string, to: string): Promise<void> {
    await rename(from, to);
  }

  async listAllFiles(): Promise<string[]> {
    const out: string[] = [];
    const walk = async (dir: string) => {
      const entries = await this.list(dir);
      for (const e of entries) {
        if (e.kind === "dir") await walk(e.path);
        else out.push(e.path);
      }
    };
    await walk(this.rootPath);
    return out;
  }
}

export function joinUnder(root: string, relative: string) {
  return joinPath(root, relative.replace(/^[\\/]+/, ""));
}
