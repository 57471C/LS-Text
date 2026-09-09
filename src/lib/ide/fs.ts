import { basename, joinPath, parentPath } from "@/lib/utils";
import { createSeedSnapshot } from "./seed";
import type { DirEntry, FileSystemAdapter, VirtualSnapshot } from "./types";

function normalize(path: string) {
  if (!path || path === "/") return "/";
  const parts = path.split("/").filter((p) => p && p !== ".");
  const out: string[] = [];
  for (const p of parts) {
    if (p === "..") out.pop();
    else out.push(p);
  }
  return "/" + out.join("/");
}

function sortEntries(entries: DirEntry[]) {
  return entries.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

export class VirtualFileSystem implements FileSystemAdapter {
  kind = "virtual" as const;
  name: string;
  rootPath: string;
  files: Map<string, string>;
  dirs: Set<string>;

  constructor(snapshot?: VirtualSnapshot) {
    const snap = snapshot ?? createSeedSnapshot();
    this.name = snap.name;
    this.rootPath = snap.rootPath;
    this.files = new Map(Object.entries(snap.files));
    this.dirs = new Set(snap.dirs);
  }

  snapshot(): VirtualSnapshot {
    return {
      name: this.name,
      rootPath: this.rootPath,
      files: Object.fromEntries(this.files),
      dirs: [...this.dirs],
    };
  }

  listSync(path: string): DirEntry[] {
    const dir = normalize(path);
    const prefix = dir === "/" ? "/" : dir + "/";
    const seen = new Set<string>();
    const entries: DirEntry[] = [];

    const consider = (full: string, kind: DirEntry["kind"]) => {
      if (!full.startsWith(prefix)) return;
      const rest = full.slice(prefix.length);
      const name = rest.split("/")[0];
      if (!name || seen.has(name)) return;
      const childPath = joinPath(dir, name);
      if (kind === "file" && rest.includes("/")) return;
      if (kind === "dir" && rest.split("/").length === 1) {
        seen.add(name);
        entries.push({ name, path: childPath, kind: "dir" });
        return;
      }
      if (kind === "file" && rest === name) {
        seen.add(name);
        entries.push({ name, path: childPath, kind: "file" });
      }
    };

    for (const d of this.dirs) consider(d, "dir");
    for (const f of this.files.keys()) consider(f, "file");
    return sortEntries(entries);
  }

  async list(path: string): Promise<DirEntry[]> {
    return this.listSync(path);
  }

  async read(path: string): Promise<string> {
    const p = normalize(path);
    if (!this.files.has(p)) throw new Error(`File not found: ${p}`);
    return this.files.get(p) ?? "";
  }

  async write(path: string, content: string): Promise<void> {
    const p = normalize(path);
    this.ensureParent(p);
    this.files.set(p, content);
  }

  async mkdir(path: string): Promise<void> {
    const p = normalize(path);
    this.ensureParent(p);
    this.dirs.add(p);
  }

  async remove(path: string): Promise<void> {
    const p = normalize(path);
    this.files.delete(p);
    this.dirs.delete(p);
    const prefix = p + "/";
    for (const f of [...this.files.keys()]) {
      if (f.startsWith(prefix)) this.files.delete(f);
    }
    for (const d of [...this.dirs]) {
      if (d.startsWith(prefix)) this.dirs.delete(d);
    }
  }

  async rename(from: string, to: string): Promise<void> {
    const src = normalize(from);
    const dest = normalize(to);
    if (this.files.has(src)) {
      const content = this.files.get(src) ?? "";
      this.files.delete(src);
      this.ensureParent(dest);
      this.files.set(dest, content);
      return;
    }
    if (this.dirs.has(src)) {
      const prefix = src + "/";
      this.dirs.delete(src);
      this.dirs.add(dest);
      for (const d of [...this.dirs]) {
        if (d.startsWith(prefix)) {
          this.dirs.delete(d);
          this.dirs.add(dest + d.slice(src.length));
        }
      }
      for (const f of [...this.files.keys()]) {
        if (f.startsWith(prefix) || f === src) {
          const content = this.files.get(f) ?? "";
          this.files.delete(f);
          this.files.set(dest + f.slice(src.length), content);
        }
      }
    }
  }

  async listAllFiles(): Promise<string[]> {
    return [...this.files.keys()].sort();
  }

  private ensureParent(path: string) {
    let dir = parentPath(path);
    while (dir && dir !== "/") {
      this.dirs.add(dir);
      dir = parentPath(dir);
    }
    if (this.rootPath) this.dirs.add(this.rootPath);
  }
}

type AnyDirHandle = {
  kind: "directory";
  name: string;
  values: () => AsyncIterable<{ kind: "file" | "directory"; name: string }>;
  getDirectoryHandle: (
    name: string,
    opts?: { create?: boolean },
  ) => Promise<AnyDirHandle>;
  getFileHandle: (
    name: string,
    opts?: { create?: boolean },
  ) => Promise<AnyFileHandle>;
  removeEntry: (name: string, opts?: { recursive?: boolean }) => Promise<void>;
};

type AnyFileHandle = {
  kind: "file";
  name: string;
  getFile: () => Promise<File>;
  createWritable: () => Promise<{
    write: (data: string) => Promise<void>;
    close: () => Promise<void>;
  }>;
};

export function nativeFsSupported() {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export class NativeFileSystem implements FileSystemAdapter {
  kind = "native" as const;
  name: string;
  rootPath: string;
  private root: AnyDirHandle;
  private dirCache = new Map<string, AnyDirHandle>();

  constructor(root: AnyDirHandle) {
    this.root = root;
    this.name = root.name;
    this.rootPath = `/${root.name}`;
    this.dirCache.set(this.rootPath, root);
    this.dirCache.set("/", root);
  }

  async list(path: string): Promise<DirEntry[]> {
    const dir = await this.resolveDir(path);
    const entries: DirEntry[] = [];
    for await (const entry of dir.values()) {
      entries.push({
        name: entry.name,
        path: joinPath(this.toVirtual(path), entry.name),
        kind: entry.kind === "directory" ? "dir" : "file",
      });
    }
    return sortEntries(entries);
  }

  async read(path: string): Promise<string> {
    const { dir, name } = await this.split(path);
    const handle = await dir.getFileHandle(name);
    const file = await handle.getFile();
    return file.text();
  }

  async write(path: string, content: string): Promise<void> {
    const { dir, name } = await this.split(path);
    const handle = await dir.getFileHandle(name, { create: true });
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  async mkdir(path: string): Promise<void> {
    const { dir, name } = await this.split(path);
    await dir.getDirectoryHandle(name, { create: true });
  }

  async remove(path: string): Promise<void> {
    const { dir, name } = await this.split(path);
    await dir.removeEntry(name, { recursive: true });
  }

  async rename(from: string, to: string): Promise<void> {
    const content = await this.read(from);
    await this.write(to, content);
    await this.remove(from);
  }

  async listAllFiles(): Promise<string[]> {
    const out: string[] = [];
    const walk = async (dirPath: string) => {
      const entries = await this.list(dirPath);
      for (const e of entries) {
        if (e.kind === "dir") await walk(e.path);
        else out.push(e.path);
      }
    };
    await walk(this.rootPath);
    return out;
  }

  private toVirtual(path: string) {
    const p = normalize(path);
    if (p === "/" || p === "") return this.rootPath;
    if (p.startsWith(this.rootPath)) return p;
    return joinPath(this.rootPath, p.replace(/^\//, ""));
  }

  private async resolveDir(path: string): Promise<AnyDirHandle> {
    const p = this.toVirtual(path);
    const cached = this.dirCache.get(p);
    if (cached) return cached;
    const rel = p.slice(this.rootPath.length).replace(/^\//, "");
    if (!rel) return this.root;
    const parts = rel.split("/").filter(Boolean);
    let current = this.root;
    let acc = this.rootPath;
    for (const part of parts) {
      current = await current.getDirectoryHandle(part);
      acc = joinPath(acc, part);
      this.dirCache.set(acc, current);
    }
    return current;
  }

  private async split(path: string) {
    const p = this.toVirtual(path);
    return { dir: await this.resolveDir(parentPath(p)), name: basename(p) };
  }
}

export async function pickNativeFolder(): Promise<NativeFileSystem | null> {
  if (!nativeFsSupported()) return null;
  const picker = (
    window as unknown as {
      showDirectoryPicker: (opts: { mode: string }) => Promise<AnyDirHandle>;
    }
  ).showDirectoryPicker;
  const handle = await picker({ mode: "readwrite" });
  return new NativeFileSystem(handle);
}
