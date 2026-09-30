import { joinPath, parentPath } from "@/lib/utils";
import { isTauriRuntime } from "./tauri";
import { isOsPath } from "./tauri-fs";
import { useIde } from "./store";

function suggestedName() {
  const s = useIde.getState();
  const tab = s.tabs.find((t) => t.id === s.activeTabId);
  if (!tab) return "untitled.md";
  if (tab.isUntitled) return tab.name.includes(".") ? tab.name : `${tab.name}.md`;
  return tab.name;
}

function fallbackDir() {
  const s = useIde.getState();
  const tab = s.tabs.find((t) => t.id === s.activeTabId);
  const last = s.settings.lastSaveDir;
  if (last && (s.fs.kind === "native" || isOsPath(last) === isOsPath(s.fs.rootPath))) {
    return last;
  }
  if (tab && !tab.isUntitled) return parentPath(tab.path);
  return s.fs.rootPath;
}

function rememberDir(dest: string) {
  const dir = parentPath(dest);
  if (dir) useIde.getState().setSettings({ lastSaveDir: dir });
}

export async function saveActive() {
  const s = useIde.getState();
  const tab = s.tabs.find((t) => t.id === s.activeTabId);
  if (!tab) return;
  if (tab.isUntitled) {
    await saveActiveAs();
    return;
  }
  await s.saveTab();
}

export async function saveActiveAs() {
  const s = useIde.getState();
  const tab = s.tabs.find((t) => t.id === s.activeTabId);
  if (!tab) return;
  const name = suggestedName();
  const dir = fallbackDir();

  if (isTauriRuntime()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const dest = await save({
      defaultPath: joinPath(dir, name),
      title: "Save as",
    });
    if (!dest) return;
    await s.saveAs(tab.id, dest);
    rememberDir(dest);
    return;
  }

  s.requestPrompt({
    kind: "save-as",
    path: dir,
    value: name,
    tabId: tab.id,
  });
}
