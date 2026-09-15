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

export async function desktopHomeDir(): Promise<string | null> {
  if (!isTauriRuntime()) return null;
  const { homeDir } = await import("@tauri-apps/api/path");
  return homeDir();
}

export async function getLaunchPaths(): Promise<string[]> {
  if (!isTauriRuntime()) return [];
  const { invoke } = await import("@tauri-apps/api/core");
  const paths = await invoke<string[]>("launch_paths");
  return Array.isArray(paths) ? paths : [];
}

export async function listenOpenFiles(
  onPaths: (paths: string[]) => void,
): Promise<() => void> {
  if (!isTauriRuntime()) return () => {};
  const { listen } = await import("@tauri-apps/api/event");
  const unlisten = await listen<string[]>("open-files", (event) => {
    const paths = Array.isArray(event.payload) ? event.payload : [];
    if (paths.length) onPaths(paths);
  });
  return unlisten;
}

export async function listenNativeFileDrop(handlers: {
  onHover?: (hover: boolean) => void;
  onDrop: (paths: string[]) => void;
}): Promise<() => void> {
  if (!isTauriRuntime()) return () => {};
  const { getCurrentWebview } = await import("@tauri-apps/api/webview");
  const unlisten = await getCurrentWebview().onDragDropEvent((event) => {
    const kind = event.payload.type;
    if (kind === "enter" || kind === "over") handlers.onHover?.(true);
    else if (kind === "leave") handlers.onHover?.(false);
    else if (kind === "drop") {
      handlers.onHover?.(false);
      const paths = event.payload.paths ?? [];
      if (paths.length) handlers.onDrop(paths);
    }
  });
  return unlisten;
}
