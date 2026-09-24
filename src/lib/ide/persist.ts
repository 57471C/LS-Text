import { isTauriRuntime } from "./tauri";
import type { SessionDump } from "./types";

const KEY = "ls-text.v1";
export const BOOT_KEY = "ls-text.boot";

function slim(dump: SessionDump): SessionDump {
  return {
    version: 2,
    explorerOpen: dump.explorerOpen,
    previewOpen: dump.previewOpen,
    settings: dump.settings,
    workspaceKind: dump.workspaceKind,
    workspaceName: dump.workspaceName,
    workspacePath: dump.workspacePath,
  };
}

/** Sync theme/font for the index.html first-paint script. Webview localStorage is readable before React. */
export function rememberBoot(settings?: SessionDump["settings"]) {
  if (typeof localStorage === "undefined" || !settings) return;
  try {
    localStorage.setItem(
      BOOT_KEY,
      JSON.stringify({
        theme: settings.theme === "light" ? "light" : "dark",
        fontSize: settings.fontSize,
      }),
    );
  } catch {
    /* quota */
  }
}

export async function loadSession(): Promise<SessionDump | null> {
  try {
    if (isTauriRuntime()) {
      const { LazyStore } = await import("@tauri-apps/plugin-store");
      const store = new LazyStore("session.json");
      const dump = await store.get<SessionDump>("session");
      if (dump?.version !== 1 && dump?.version !== 2) return null;
      const session = slim(dump);
      rememberBoot(session.settings);
      return session;
    }
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionDump;
    if (parsed?.version !== 1 && parsed?.version !== 2) return null;
    const session = slim(parsed);
    rememberBoot(session.settings);
    return session;
  } catch {
    return null;
  }
}

export async function saveSession(dump: SessionDump) {
  const payload = slim(dump);
  rememberBoot(payload.settings);
  try {
    if (isTauriRuntime()) {
      const { LazyStore } = await import("@tauri-apps/plugin-store");
      const store = new LazyStore("session.json");
      await store.set("session", payload);
      await store.save();
      return;
    }
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* quota / plugin unavailable */
  }
}
