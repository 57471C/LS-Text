export function isTauriRuntime() {
  if (typeof window === "undefined") return false;
  const w = window as unknown as {
    __TAURI_INTERNALS__?: unknown;
    __TAURI__?: unknown;
  };
  return Boolean(w.__TAURI_INTERNALS__ || w.__TAURI__);
}

export async function openExternalTerminal(
  path: string | null,
): Promise<"native" | "web"> {
  if (!isTauriRuntime()) return "web";
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("open_external_terminal", { path });
  return "native";
}

export async function pickTauriFolder(): Promise<string | null> {
  if (!isTauriRuntime()) return null;
  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({ directory: true, multiple: false });
  return typeof selected === "string" ? selected : null;
}
