import { invoke } from "@tauri-apps/api/core";
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
  // UNC: \\server\share or //server/share
  if (/^\\\\[^\\/]+[\\/]/.test(path) || /^\/\/[^\\/]+[\\/]/.test(path)) return true;
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
  return invoke<string>("read_text", { path });
}

export async function writeOsFile(path: string, content: string) {
  const dir = parentPath(path);
  if (dir && dir !== path) {
    try {
      await invoke("write_text", { path, contents: content });
      return;
    } catch {
      /* fall through with explicit write below */
    }
  }
  await invoke("write_text", { path, contents: content });
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
    return readOsFile(path);
  }

  async write(path: string, content: string): Promise<void> {
    await writeOsFile(path, content);
  }

  async mkdir(path: string): Promise<void> {
    const { mkdir } = await import("@tauri-apps/plugin-fs");
    await mkdir(path, { recursive: true });
  }

  async remove(path: string): Promise<void> {
    const { remove } = await import("@tauri-apps/plugin-fs");
    await remove(path, { recursive: true });
  }

  async rename(from: string, to: string): Promise<void> {
    const { rename } = await import("@tauri-apps/plugin-fs");
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
