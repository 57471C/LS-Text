import { basename } from "@/lib/utils";
import { isTauriRuntime } from "./tauri";
import type { Tab } from "./types";

export function hashOpenPath(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.location.hash.replace(/^#/, "");
  const params = new URLSearchParams(raw.includes("=") ? raw : "");
  const open = params.get("open");
  return open ? decodeURIComponent(open) : null;
}

export function bufferIsVacant(tabs: Tab[]) {
  return tabs.every(
    (t) => t.isUntitled && t.content === "" && t.content === t.originalContent,
  );
}

export async function openFileInNewWindow(path: string | null): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const label = `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const hash = path ? `open=${encodeURIComponent(path)}` : "scratch=1";
  new WebviewWindow(label, {
    url: `/#${hash}`,
    title: path ? basename(path) : "LS.Text",
    width: 1100,
    height: 720,
    minWidth: 720,
    minHeight: 480,
    focus: true,
  });
  return true;
}
