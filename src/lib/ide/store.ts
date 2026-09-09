import { create } from "zustand";
import { basename, joinPath, parentPath } from "@/lib/utils";
import {
  VirtualFileSystem,
  NativeFileSystem,
  pickNativeFolder,
} from "./fs";
import { languageLabel } from "./languages";
import { loadSession, saveSession } from "./persist";
import { createSeedSnapshot } from "./seed";
import { isTauriRuntime, openExternalTerminal, pickTauriFolder } from "./tauri";
import { TauriDiskFS } from "./tauri-fs";
import { readDataTransfer } from "./drop";
import type {
  CursorPos,
  DirEntry,
  EditorSettings,
  FileSystemAdapter,
  PromptState,
  RevealPos,
  Tab,
  TextCounts,
} from "./types";

export const FONT_MIN = 11;
export const FONT_MAX = 24;
export const FONT_DEFAULT = 13;

const EMPTY_COUNTS: TextCounts = {
  words: 0,
  chars: 0,
  selWords: 0,
  selChars: 0,
  hasSelection: false,
};

export function countText(s: string) {
  const chars = s.length;
  const trimmed = s.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  return { words, chars };
}

const DEFAULT_SETTINGS: EditorSettings = {
  fontSize: FONT_DEFAULT,
  tabSize: 2,
  wordWrap: false,
  autoSave: true,
  theme: "dark",
};

function uid() {
  return `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

const INITIAL_TAB: Tab = {
  id: "scratch-1",
  path: "__scratch__/untitled-1",
  name: "untitled-1",
  content: "",
  originalContent: "",
  isUntitled: true,
  language: "Plain Text",
};

function createInitialFs() {
  return new VirtualFileSystem(createSeedSnapshot());
}

function seedChildren(fs: VirtualFileSystem) {
  return { [fs.rootPath]: fs.listSync(fs.rootPath) };
}

function makeUntitled(n: number): Tab {
  const name = `untitled-${n}`;
  return {
    id: uid(),
    path: `__scratch__/${name}`,
    name,
    content: "",
    originalContent: "",
    isUntitled: true,
    language: "Plain Text",
  };
}

export interface IdeStore {
  ready: boolean;
  fs: FileSystemAdapter;
  tabs: Tab[];
  activeTabId: string | null;
  expandedDirs: string[];
  children: Record<string, DirEntry[]>;
  explorerOpen: boolean;
  terminalOpen: boolean;
  previewOpen: boolean;
  settingsOpen: boolean;
  paletteOpen: boolean;
  searchOpen: boolean;
  zenMode: boolean;
  closedTabs: Tab[];
  reveal: RevealPos | null;
  counts: TextCounts;
  settings: EditorSettings;
  cursor: CursorPos;
  prompt: PromptState | null;
  terminalCwd: string;
  terminalNotice: string | null;
  status: string;

  hydrate: () => Promise<void>;
  persistNow: () => void;
  setActiveTab: (id: string) => void;
  openPath: (path: string) => Promise<void>;
  closeTab: (id: string, force?: boolean) => void;
  closeActive: () => void;
  discardAndClose: () => void;
  saveAndClose: () => Promise<void>;
  reopenClosedTab: () => void;
  newScratch: () => void;
  updateContent: (id: string, content: string) => void;
  saveTab: (id?: string) => Promise<void>;
  saveAs: (id: string, destPath: string) => Promise<void>;
  toggleExplorer: () => void;
  toggleTerminal: () => void;
  togglePreview: () => void;
  toggleSettings: () => void;
  togglePalette: (open?: boolean) => void;
  toggleSearch: (open?: boolean) => void;
  toggleZen: () => void;
  bumpFont: (delta: number) => void;
  resetFont: () => void;
  jumpTo: (path: string, line: number, col: number) => Promise<void>;
  gotoLine: (line: number) => void;
  openGoto: () => void;
  ingestDrop: (dt: DataTransfer) => Promise<void>;
  clearReveal: () => void;
  setSettings: (partial: Partial<EditorSettings>) => void;
  setCursor: (cursor: CursorPos) => void;
  setCounts: (counts: TextCounts) => void;
  expandDir: (path: string) => Promise<void>;
  collapseDir: (path: string) => void;
  toggleDir: (path: string) => Promise<void>;
  openFolder: () => Promise<void>;
  resetWorkspace: () => Promise<void>;
  requestPrompt: (prompt: PromptState) => void;
  closePrompt: () => void;
  submitPrompt: (value?: string) => Promise<void>;
  refreshDir: (path: string) => Promise<void>;
  launchTerminal: () => Promise<void>;
  setTerminalCwd: (path: string) => void;
  allFiles: () => Promise<string[]>;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist(get: () => IdeStore) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => get().persistNow(), 400);
}

function scheduleAutoSave(get: () => IdeStore, id: string) {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    const s = get();
    if (!s.settings.autoSave) return;
    const tab = s.tabs.find((t) => t.id === id);
    if (!tab || tab.isUntitled || tab.content === tab.originalContent) return;
    void s.saveTab(id);
  }, 500);
}

export const useIde = create<IdeStore>((set, get) => {
  const initialFs = createInitialFs();
  return {
  ready: true,
  fs: initialFs,
  tabs: [INITIAL_TAB],
  activeTabId: INITIAL_TAB.id,
  expandedDirs: [initialFs.rootPath],
  children: seedChildren(initialFs),
  explorerOpen: true,
  terminalOpen: false,
  previewOpen: true,
  settingsOpen: false,
  paletteOpen: false,
  searchOpen: false,
  zenMode: false,
  closedTabs: [],
  reveal: null,
  counts: EMPTY_COUNTS,
  settings: DEFAULT_SETTINGS,
  cursor: { line: 1, col: 1 },
  prompt: null,
  terminalCwd: initialFs.rootPath,
  terminalNotice: null,
  status: "Scratchpad workspace",

  hydrate: async () => {
    const dump = await loadSession();
    if (!dump) {
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        set({ explorerOpen: false });
      }
      return;
    }
    let fs: FileSystemAdapter;
    if (
      dump.workspaceKind === "native" &&
      dump.workspacePath &&
      isTauriRuntime()
    ) {
      fs = new TauriDiskFS(dump.workspacePath);
    } else if (dump.virtual) {
      fs = new VirtualFileSystem(dump.virtual);
    } else {
      fs = createInitialFs();
    }

    let tabs = dump.tabs ?? [];
    let activeTabId = dump.activeTabId ?? null;
    if (tabs.length === 0) {
      const first = makeUntitled(1);
      tabs = [first];
      activeTabId = first.id;
    }

    const settings = { ...DEFAULT_SETTINGS, ...dump.settings };
    settings.fontSize = Math.min(
      FONT_MAX,
      Math.max(FONT_MIN, settings.fontSize || FONT_DEFAULT),
    );
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = settings.theme;
      document.documentElement.style.setProperty(
        "--editor-font-size",
        `${settings.fontSize}px`,
      );
    }

    set({
      ready: true,
      fs,
      tabs,
      activeTabId,
      expandedDirs: dump.expandedDirs?.length ? dump.expandedDirs : [fs.rootPath],
      explorerOpen:
        dump.explorerOpen ??
        (typeof window !== "undefined" ? window.innerWidth >= 768 : true),
      terminalOpen: dump.terminalOpen ?? false,
      previewOpen: dump.previewOpen ?? true,
      settings,
      children:
        fs instanceof VirtualFileSystem ? seedChildren(fs) : {},
      terminalCwd: dump.terminalCwd ?? fs.rootPath,
      status: fs.kind === "virtual" ? "Scratchpad workspace" : fs.name,
    });
    if (fs.kind === "native") {
      void get().refreshDir(fs.rootPath);
    }
  },

  persistNow: () => {
    const s = get();
    void saveSession({
      version: 1,
      tabs: s.tabs,
      activeTabId: s.activeTabId,
      expandedDirs: s.expandedDirs,
      explorerOpen: s.explorerOpen,
      terminalOpen: s.terminalOpen,
      previewOpen: s.previewOpen,
      settings: s.settings,
      terminalCwd: s.terminalCwd,
      virtual: s.fs.snapshot?.(),
      workspaceKind: s.fs.kind,
      workspaceName: s.fs.name,
      workspacePath: s.fs.kind === "native" ? s.fs.rootPath : undefined,
    });
  },

  setActiveTab: (id) => {
    set({ activeTabId: id, paletteOpen: false });
    schedulePersist(get);
  },

  openPath: async (path) => {
    const s = get();
    const existing = s.tabs.find((t) => t.path === path);
    if (existing) {
      set({ activeTabId: existing.id, paletteOpen: false });
      return;
    }
    const content = await s.fs.read(path);
    const tab: Tab = {
      id: uid(),
      path,
      name: basename(path),
      content,
      originalContent: content,
      isUntitled: false,
      language: languageLabel(basename(path)),
    };
    set({ tabs: [...s.tabs, tab], activeTabId: tab.id, paletteOpen: false });
    schedulePersist(get);
  },

  closeTab: (id, force = false) => {
    const s = get();
    const idx = s.tabs.findIndex((t) => t.id === id);
    if (idx < 0) return;
    const closed = s.tabs[idx]!;
    if (!force && isDirty(closed)) {
      set({
        prompt: {
          kind: "close-dirty",
          path: closed.path,
          value: closed.name,
          tabId: closed.id,
        },
      });
      return;
    }
    const nextTabs = s.tabs.filter((t) => t.id !== id);
    let nextActive = s.activeTabId;
    if (s.activeTabId === id) {
      const neighbor = nextTabs[idx] ?? nextTabs[idx - 1] ?? null;
      nextActive = neighbor?.id ?? null;
    }
    const closedTabs = [{ ...closed }, ...s.closedTabs].slice(0, 20);
    if (nextTabs.length === 0) {
      const scratch = makeUntitled(1);
      set({ tabs: [scratch], activeTabId: scratch.id, closedTabs, prompt: null });
    } else {
      set({ tabs: nextTabs, activeTabId: nextActive, closedTabs, prompt: null });
    }
    schedulePersist(get);
  },

  closeActive: () => {
    const id = get().activeTabId;
    if (id) get().closeTab(id);
  },

  discardAndClose: () => {
    const id = get().prompt?.tabId;
    set({ prompt: null });
    if (id) get().closeTab(id, true);
  },

  saveAndClose: async () => {
    const id = get().prompt?.tabId ?? get().activeTabId;
    if (!id) return;
    const tab = get().tabs.find((t) => t.id === id);
    if (!tab) return;
    if (tab.isUntitled) {
      set({
        prompt: {
          kind: "save-as",
          path: get().fs.rootPath,
          value: `${tab.name}.md`,
          tabId: id,
          closeAfter: true,
        },
      });
      return;
    }
    set({ prompt: null });
    await get().saveTab(id);
    get().closeTab(id, true);
  },

  reopenClosedTab: () => {
    const s = get();
    const [closed, ...rest] = s.closedTabs;
    if (!closed) {
      set({ status: "No closed tabs" });
      return;
    }
    const existing = s.tabs.find((t) => !t.isUntitled && t.path === closed.path);
    if (existing && !closed.isUntitled) {
      set({ activeTabId: existing.id, closedTabs: rest, searchOpen: false, paletteOpen: false });
      schedulePersist(get);
      return;
    }
    let restored: Tab = { ...closed, id: uid() };
    if (restored.isUntitled) {
      const used = s.tabs.filter((t) => t.isUntitled).map((t) => t.name);
      if (used.includes(restored.name)) {
        let n = 1;
        while (used.includes(`untitled-${n}`)) n += 1;
        restored = {
          ...restored,
          name: `untitled-${n}`,
          path: `__scratch__/untitled-${n}`,
        };
      }
    }
    set({
      tabs: [...s.tabs, restored],
      activeTabId: restored.id,
      closedTabs: rest,
      paletteOpen: false,
      searchOpen: false,
    });
    schedulePersist(get);
  },

  newScratch: () => {
    const used = get()
      .tabs.filter((t) => t.isUntitled)
      .map((t) => t.name);
    let n = 1;
    while (used.includes(`untitled-${n}`)) n += 1;
    const tab = makeUntitled(n);
    set({ tabs: [...get().tabs, tab], activeTabId: tab.id, paletteOpen: false });
    schedulePersist(get);
  },

  updateContent: (id, content) => {
    set({
      tabs: get().tabs.map((t) => (t.id === id ? { ...t, content } : t)),
    });
    schedulePersist(get);
    scheduleAutoSave(get, id);
  },

  saveTab: async (id) => {
    const s = get();
    const tab = s.tabs.find((t) => t.id === (id ?? s.activeTabId));
    if (!tab) return;
    if (tab.isUntitled) {
      set({
        prompt: {
          kind: "save-as",
          path: s.fs.rootPath,
          value: `${tab.name}.md`,
        },
      });
      return;
    }
    await s.fs.write(tab.path, tab.content);
    set({
      tabs: get().tabs.map((t) =>
        t.id === tab.id ? { ...t, originalContent: t.content } : t,
      ),
      status: `Saved ${tab.name}`,
    });
    schedulePersist(get);
  },

  saveAs: async (id, destPath) => {
    const s = get();
    const tab = s.tabs.find((t) => t.id === id);
    if (!tab) return;
    await s.fs.write(destPath, tab.content);
    set({
      tabs: get().tabs.map((t) =>
        t.id === id
          ? {
              ...t,
              path: destPath,
              name: basename(destPath),
              isUntitled: false,
              originalContent: t.content,
              language: languageLabel(basename(destPath)),
            }
          : t,
      ),
      status: `Saved ${basename(destPath)}`,
    });
    await get().refreshDir(parentPath(destPath));
    schedulePersist(get);
  },

  toggleExplorer: () => {
    set({ explorerOpen: !get().explorerOpen });
    schedulePersist(get);
  },

  toggleTerminal: () => {
    set({ terminalOpen: !get().terminalOpen });
    schedulePersist(get);
  },

  togglePreview: () => {
    set({ previewOpen: !get().previewOpen });
    schedulePersist(get);
  },

  toggleSettings: () => set({ settingsOpen: !get().settingsOpen }),

  togglePalette: (open) =>
    set({
      paletteOpen: open ?? !get().paletteOpen,
      settingsOpen: false,
      searchOpen: false,
    }),

  toggleSearch: (open) =>
    set({
      searchOpen: open ?? !get().searchOpen,
      paletteOpen: false,
      settingsOpen: false,
    }),

  toggleZen: () => {
    const next = !get().zenMode;
    set({
      zenMode: next,
      settingsOpen: next ? false : get().settingsOpen,
      paletteOpen: next ? false : get().paletteOpen,
      searchOpen: next ? false : get().searchOpen,
      status: next ? "Zen" : "Scratchpad workspace",
    });
  },

  bumpFont: (delta) => {
    const next = Math.min(
      FONT_MAX,
      Math.max(FONT_MIN, get().settings.fontSize + delta),
    );
    get().setSettings({ fontSize: next });
    set({ status: `${next}px` });
  },

  resetFont: () => {
    get().setSettings({ fontSize: FONT_DEFAULT });
    set({ status: `${FONT_DEFAULT}px` });
  },

  jumpTo: async (path, line, col) => {
    const existing = get().tabs.find((t) => t.path === path);
    if (existing) {
      set({
        activeTabId: existing.id,
        reveal: { line, col, nonce: Date.now() },
        searchOpen: false,
        paletteOpen: false,
      });
      return;
    }
    await get().openPath(path);
    set({
      reveal: { line, col, nonce: Date.now() },
      searchOpen: false,
      paletteOpen: false,
    });
  },

  clearReveal: () => set({ reveal: null }),

  gotoLine: (line) => {
    const n = Math.max(1, Math.floor(line));
    if (!Number.isFinite(n)) return;
    set({
      reveal: { line: n, col: 1, nonce: Date.now() },
      prompt: null,
    });
  },

  openGoto: () => {
    const s = get();
    set({
      prompt: {
        kind: "goto-line",
        path: s.tabs.find((t) => t.id === s.activeTabId)?.path ?? "",
        value: String(s.cursor.line),
      },
      paletteOpen: false,
      searchOpen: false,
    });
  },

  ingestDrop: async (dt) => {
    try {
      const { directoryHandle, files } = await readDataTransfer(dt);
      if (directoryHandle) {
        const native = new NativeFileSystem(directoryHandle as never);
        set({
          fs: native,
          children: {},
          expandedDirs: [native.rootPath],
          terminalCwd: native.rootPath,
          status: `Opened ${native.name}`,
        });
        await get().refreshDir(native.rootPath);
        schedulePersist(get);
        if (files.length === 0) return;
      }
      if (files.length === 0) {
        set({ status: "Nothing to import" });
        return;
      }
      const root = get().fs.rootPath;
      let last = "";
      for (const file of files) {
        const dest = joinPath(root, file.relativePath);
        let dir = parentPath(dest);
        const stack: string[] = [];
        while (dir && dir !== "/" && dir !== root) {
          stack.push(dir);
          dir = parentPath(dir);
        }
        for (const d of stack.reverse()) {
          try {
            await get().fs.mkdir(d);
          } catch {
            /* exists */
          }
        }
        await get().fs.write(dest, file.text);
        last = dest;
      }
      await get().refreshDir(root);
      if (last) await get().openPath(last);
      set({
        status:
          files.length === 1
            ? `Opened ${basename(last)}`
            : `Imported ${files.length} files`,
      });
      schedulePersist(get);
    } catch (err) {
      set({
        status: err instanceof Error ? err.message : "Drop failed",
      });
    }
  },

  setSettings: (partial) => {
    const settings = { ...get().settings, ...partial };
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = settings.theme;
      document.documentElement.style.setProperty(
        "--editor-font-size",
        `${settings.fontSize}px`,
      );
    }
    set({ settings });
    schedulePersist(get);
  },

  setCursor: (cursor) => set({ cursor }),
  setCounts: (counts) => set({ counts }),

  expandDir: async (path) => {
    const s = get();
    if (!s.children[path]) {
      const entries = await s.fs.list(path);
      set({ children: { ...get().children, [path]: entries } });
    }
    if (!get().expandedDirs.includes(path)) {
      set({ expandedDirs: [...get().expandedDirs, path] });
      schedulePersist(get);
    }
  },

  collapseDir: (path) => {
    set({ expandedDirs: get().expandedDirs.filter((p) => p !== path) });
    schedulePersist(get);
  },

  toggleDir: async (path) => {
    if (get().expandedDirs.includes(path)) get().collapseDir(path);
    else await get().expandDir(path);
  },

  openFolder: async () => {
    try {
      const tauriPath = await pickTauriFolder();
      if (tauriPath) {
        const native = new TauriDiskFS(tauriPath);
        set({
          fs: native,
          children: {},
          expandedDirs: [native.rootPath],
          terminalCwd: native.rootPath,
          status: `Opened ${native.name}`,
        });
        await get().refreshDir(native.rootPath);
        schedulePersist(get);
        return;
      }
      const native = await pickNativeFolder();
      if (!native) {
        set({
          status: isTauriRuntime()
            ? "Folder picker cancelled"
            : "Folder picker needs Chrome/Edge, or a native build",
          prompt: null,
        });
        return;
      }
      set({
        fs: native,
        children: {},
        expandedDirs: [native.rootPath],
        terminalCwd: native.rootPath,
        status: `Opened ${native.name}`,
      });
      await get().refreshDir(native.rootPath);
      schedulePersist(get);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Folder picker cancelled";
      set({ status: message });
    }
  },

  resetWorkspace: async () => {
    const fs = new VirtualFileSystem(createSeedSnapshot());
    const scratch = makeUntitled(1);
    set({
      fs,
      children: {},
      expandedDirs: [fs.rootPath],
      tabs: [scratch],
      activeTabId: scratch.id,
      terminalCwd: fs.rootPath,
      status: "Restored scratchpad workspace",
    });
    await get().refreshDir(fs.rootPath);
    schedulePersist(get);
  },

  requestPrompt: (prompt) => set({ prompt }),
  closePrompt: () => set({ prompt: null }),

  submitPrompt: async (value) => {
    const s = get();
    const prompt = s.prompt;
    if (!prompt) return;
    const name = (value ?? prompt.value ?? "").trim();
    try {
      if (prompt.kind === "new-file") {
        if (!name) return;
        const path = joinPath(prompt.path, name);
        await s.fs.write(path, "");
        await get().refreshDir(prompt.path);
        await get().openPath(path);
      } else if (prompt.kind === "new-folder") {
        if (!name) return;
        const path = joinPath(prompt.path, name);
        await s.fs.mkdir(path);
        await get().refreshDir(prompt.path);
        await get().expandDir(path);
      } else if (prompt.kind === "rename") {
        if (!name) return;
        const dest = joinPath(parentPath(prompt.path), name);
        await s.fs.rename(prompt.path, dest);
        set({
          tabs: get().tabs.map((t) =>
            t.path === prompt.path
              ? {
                  ...t,
                  path: dest,
                  name,
                  language: languageLabel(name),
                }
              : t,
          ),
        });
        await get().refreshDir(parentPath(prompt.path));
      } else if (prompt.kind === "delete") {
        await s.fs.remove(prompt.path);
        const remaining = get().tabs.filter((t) => t.path !== prompt.path);
        set({
          tabs:
            remaining.length > 0
              ? remaining
              : [makeUntitled(1)],
          activeTabId:
            remaining.find((t) => t.id === get().activeTabId)?.id ??
            remaining[0]?.id ??
            null,
        });
        if (get().tabs.length === 1 && get().tabs[0]?.isUntitled && remaining.length === 0) {
          set({ activeTabId: get().tabs[0].id });
        }
        await get().refreshDir(parentPath(prompt.path));
      } else if (prompt.kind === "save-as") {
        if (!name) return;
        const id = prompt.tabId ?? s.activeTabId;
        if (!id) return;
        const dest = name.startsWith("/") ? name : joinPath(prompt.path, name);
        await get().saveAs(id, dest);
        if (prompt.closeAfter) get().closeTab(id, true);
      } else if (prompt.kind === "goto-line") {
        const line = parseInt(name, 10);
        if (!Number.isFinite(line)) return;
        get().gotoLine(line);
        return;
      }
      set({ prompt: null, status: "Updated workspace" });
      schedulePersist(get);
    } catch (err) {
      set({
        status: err instanceof Error ? err.message : "File operation failed",
      });
    }
  },

  refreshDir: async (path) => {
    try {
      const entries = await get().fs.list(path);
      set({ children: { ...get().children, [path]: entries } });
      for (const dir of get().expandedDirs) {
        if (dir !== path && dir.startsWith(path + "/")) {
          try {
            const child = await get().fs.list(dir);
            set({ children: { ...get().children, [dir]: child } });
          } catch {
            /* removed */
          }
        }
      }
    } catch {
      /* ignore */
    }
  },

  launchTerminal: async () => {
    const s = get();
    const active = s.tabs.find((t) => t.id === s.activeTabId);
    const target = active && !active.isUntitled ? parentPath(active.path) : s.fs.rootPath;
    const mode = await openExternalTerminal(target);
    if (mode === "native") {
      set({
        terminalOpen: true,
        terminalNotice: `Launched system terminal in ${target}`,
        status: "External terminal launched",
      });
    } else {
      set({
        terminalOpen: true,
        terminalCwd: target,
        terminalNotice: `ghostty → ${target}  ·  browser preview uses the integrated shell`,
        status: "Integrated terminal",
      });
    }
    schedulePersist(get);
  },

  setTerminalCwd: (path) => set({ terminalCwd: path }),

  allFiles: async () => get().fs.listAllFiles(),
  };
});

export function activeTab() {
  const s = useIde.getState();
  return s.tabs.find((t) => t.id === s.activeTabId) ?? null;
}

export function isDirty(tab: Tab) {
  return tab.content !== tab.originalContent;
}
