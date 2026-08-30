import { basename, joinPath, parentPath } from "@/lib/utils";
import type { FileSystemAdapter } from "./types";

export interface ShellState {
  cwd: string;
  home: string;
}

export interface ShellResult {
  lines: string[];
  cwd: string;
  clear?: boolean;
}

function vis(path: string, home: string) {
  if (path === home) return "~";
  if (path.startsWith(home + "/")) return "~" + path.slice(home.length);
  return path;
}

export function promptOf(state: ShellState) {
  return `ls-text ${vis(state.cwd, state.home)} %`;
}

export async function runShell(
  input: string,
  state: ShellState,
  fs: FileSystemAdapter,
): Promise<ShellResult> {
  const raw = input.trim();
  if (!raw) return { lines: [], cwd: state.cwd };

  const [cmd, ...rest] = tokenize(raw);
  const arg = rest.join(" ");
  const resolve = (p?: string) => {
    if (!p || p === ".") return state.cwd;
    if (p === "~") return state.home;
    if (p.startsWith("~/")) return joinPath(state.home, p.slice(2));
    if (p.startsWith("/")) return p;
    return joinPath(state.cwd, p);
  };

  try {
    switch (cmd) {
      case "help":
        return {
          cwd: state.cwd,
          lines: [
            "ls  cd  pwd  cat  echo  mkdir  touch  rm  mv  tree  clear  date  whoami  uname  ghostty  help",
            "This shell is bound to the workspace. Native LS.Text launches Ghostty / Windows Terminal.",
          ],
        };
      case "clear":
        return { cwd: state.cwd, lines: [], clear: true };
      case "pwd":
        return { cwd: state.cwd, lines: [state.cwd] };
      case "whoami":
        return { cwd: state.cwd, lines: ["scratch"] };
      case "date":
        return { cwd: state.cwd, lines: [new Date().toString()] };
      case "uname":
        return { cwd: state.cwd, lines: ["LS.Text scratchpad"] };
      case "echo":
        return { cwd: state.cwd, lines: [arg] };
      case "cd": {
        const dest = resolve(rest[0] || "~");
        if (dest === "/" || dest === state.home) return { cwd: dest, lines: [] };
        const parent = parentPath(dest);
        const entries = await fs.list(parent);
        const hit = entries.find((e) => e.path === dest && e.kind === "dir");
        if (!hit && dest !== fs.rootPath) {
          return { cwd: state.cwd, lines: [`cd: no such directory: ${dest}`] };
        }
        return { cwd: dest, lines: [] };
      }
      case "ls": {
        const dest = resolve(rest[0]);
        const entries = await fs.list(dest);
        if (entries.length === 0) return { cwd: state.cwd, lines: [""] };
        const names = entries.map((e) => (e.kind === "dir" ? e.name + "/" : e.name));
        return { cwd: state.cwd, lines: [names.join("  ")] };
      }
      case "cat": {
        if (!rest[0]) return { cwd: state.cwd, lines: ["cat: missing file"] };
        const path = resolve(rest[0]);
        const text = await fs.read(path);
        return { cwd: state.cwd, lines: text.split("\n") };
      }
      case "mkdir": {
        if (!rest[0]) return { cwd: state.cwd, lines: ["mkdir: missing operand"] };
        await fs.mkdir(resolve(rest[0]));
        return { cwd: state.cwd, lines: [] };
      }
      case "touch": {
        if (!rest[0]) return { cwd: state.cwd, lines: ["touch: missing operand"] };
        const path = resolve(rest[0]);
        try {
          const existing = await fs.read(path);
          await fs.write(path, existing);
        } catch {
          await fs.write(path, "");
        }
        return { cwd: state.cwd, lines: [] };
      }
      case "rm": {
        if (!rest[0]) return { cwd: state.cwd, lines: ["rm: missing operand"] };
        await fs.remove(resolve(rest[0]));
        return { cwd: state.cwd, lines: [] };
      }
      case "mv": {
        if (rest.length < 2) return { cwd: state.cwd, lines: ["mv: missing operand"] };
        await fs.rename(resolve(rest[0]), resolve(rest[1]));
        return { cwd: state.cwd, lines: [] };
      }
      case "tree": {
        const lines = await tree(fs, resolve(rest[0]), "", true);
        return { cwd: state.cwd, lines };
      }
      case "ghostty":
      case "wt":
      case "alacritty":
      case "kitty":
        return {
          cwd: state.cwd,
          lines: [
            `launching ${cmd}…`,
            `  working-directory  ${state.cwd}`,
            "  browser preview    integrated shell (this panel)",
            "  native build       Ghostty → Alacritty/Kitty → Terminal.app / wt.exe",
          ],
        };
      default:
        return { cwd: state.cwd, lines: [`${cmd}: command not found`] };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { cwd: state.cwd, lines: [`${cmd}: ${msg}`] };
  }
}

function tokenize(s: string) {
  const out: string[] = [];
  let cur = "";
  let quote: string | null = null;
  for (const ch of s) {
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (cur) out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

async function tree(
  fs: FileSystemAdapter,
  path: string,
  prefix: string,
  isRoot: boolean,
): Promise<string[]> {
  const name = isRoot ? basename(path) || path : basename(path);
  const lines = [isRoot ? name : prefix + name];
  try {
    const entries = await fs.list(path);
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const last = i === entries.length - 1;
      const branch = prefix + (isRoot ? "" : "") + (last ? "└── " : "├── ");
      const nextPrefix = prefix + (last ? "    " : "│   ");
      if (e.kind === "dir") {
        const child = await tree(fs, e.path, nextPrefix, false);
        if (child.length) {
          child[0] = branch + basename(e.path);
          lines.push(...child);
        }
      } else {
        lines.push(branch + e.name);
      }
    }
  } catch {
    /* not a dir */
  }
  return lines;
}
