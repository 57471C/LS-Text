import { isTauriRuntime } from "./tauri";
import type { SessionDump } from "./types";

const KEY = "ls-text.v1";

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

export async function loadSession(): Promise<SessionDump | null> {
  try {
    if (isTauriRuntime()) {
      const { LazyStore } = await import("@tauri-apps/plugin-store");
      const store = new LazyStore("session.json");
      const dump = await store.get<SessionDump>("session");
      if (dump?.version !== 1 && dump?.version !== 2) return null;
      return slim(dump);
    }
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionDump;
    if (parsed?.version !== 1 && parsed?.version !== 2) return null;
    return slim(parsed);
  } catch {
    return null;
  }
}

export async function saveSession(dump: SessionDump) {
  const payload = slim(dump);
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
