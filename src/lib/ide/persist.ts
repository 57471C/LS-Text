import { isTauriRuntime } from "./tauri";
import type { SessionDump } from "./types";

const KEY = "ls-text.v1";

export async function loadSession(): Promise<SessionDump | null> {
  try {
    if (isTauriRuntime()) {
      const { LazyStore } = await import("@tauri-apps/plugin-store");
      const store = new LazyStore("session.json");
      const dump = await store.get<SessionDump>("session");
      if (dump?.version !== 1) return null;
      return dump;
    }
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionDump;
    if (parsed?.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveSession(dump: SessionDump) {
  try {
    if (isTauriRuntime()) {
      const { LazyStore } = await import("@tauri-apps/plugin-store");
      const store = new LazyStore("session.json");
      await store.set("session", dump);
      await store.save();
      return;
    }
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(KEY, JSON.stringify(dump));
  } catch {
    /* quota / plugin unavailable */
  }
}
