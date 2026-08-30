import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isMacPlatform() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad/.test(navigator.platform);
}

export function modLabel() {
  return isMacPlatform() ? "⌘" : "Ctrl";
}

function slash(path: string) {
  return path.includes("\\") ? "\\" : "/";
}

export function parentPath(path: string) {
  const s = slash(path);
  const trimmed = path.replace(/[\\/]+$/, "");
  const i = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  if (i <= 0) return s === "\\" ? trimmed : "/";
  if (s === "\\" && /^[A-Za-z]:$/.test(trimmed.slice(0, i))) {
    return trimmed.slice(0, i + 1);
  }
  return trimmed.slice(0, i);
}

export function basename(path: string) {
  const trimmed = path.replace(/[\\/]+$/, "");
  const i = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  return i < 0 ? trimmed : trimmed.slice(i + 1);
}

export function joinPath(dir: string, name: string) {
  const s = slash(dir);
  if (!dir || dir === "/" || dir === s) return `${s === "\\" ? "" : "/"}${name}`;
  return `${dir.replace(/[\\/]+$/, "")}${s}${name}`;
}

export function extname(name: string) {
  const i = name.lastIndexOf(".");
  if (i <= 0) return "";
  return name.slice(i + 1).toLowerCase();
}
