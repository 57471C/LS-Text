import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toggleBase64InEditor } from "@/lib/ide/base64";
import { isDirty, useIde } from "@/lib/ide/store";
import { isTauriRuntime } from "@/lib/ide/tauri";
import { ActivityBar } from "./ActivityBar";
import { CommandPalette } from "./CommandPalette";
import { DragHandle } from "./DragHandle";
import { EditorPane } from "./EditorPane";
import { FileTree } from "./FileTree";
import { PromptDialog } from "./PromptDialog";
import { SearchPanel } from "./SearchPanel";
import { SettingsPanel } from "./SettingsPanel";
import { StatusBar } from "./StatusBar";
import { TabBar } from "./TabBar";

export function IdeShell() {
  const explorerOpen = useIde((s) => s.explorerOpen);
  const [explorerWidth, setExplorerWidth] = useState(240);
  const [dropHover, setDropHover] = useState(false);
  const dragDepth = useRef(0);

  useLayoutEffect(() => {
    useIde.getState().hydrate();
  }, []);

  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (!useIde.getState().tabs.some(isDirty)) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  useEffect(() => {
    if (!isTauriRuntime()) return;
    let gone = false;
    let unlisten: (() => void) | undefined;
    void import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
      if (gone) return;
      void getCurrentWindow()
        .onCloseRequested((event) => {
          if (!useIde.getState().tabs.some(isDirty)) return;
          event.preventDefault();
          const dirty = useIde.getState().tabs.find(isDirty);
          if (dirty) useIde.getState().closeTab(dirty.id);
        })
        .then((fn) => {
          if (gone) fn();
          else unlisten = fn;
        });
    });
    return () => {
      gone = true;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const s = useIde.getState();
        if (s.searchOpen) s.toggleSearch(false);
        else if (s.paletteOpen) s.togglePalette(false);
        else if (s.settingsOpen) s.toggleSettings();
        else if (s.prompt) s.closePrompt();
        return;
      }
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const k = e.key.toLowerCase();

      if (k === "s" && !e.shiftKey) {
        e.preventDefault();
        void useIde.getState().saveTab();
      } else if (k === "w") {
        e.preventDefault();
        if (!useIde.getState().prompt) useIde.getState().closeActive();
      } else if (k === "p" && !e.shiftKey) {
        e.preventDefault();
        useIde.getState().togglePalette();
      } else if (k === "o") {
        e.preventDefault();
        void useIde.getState().openFolder();
      } else if (k === "n") {
        e.preventDefault();
        useIde.getState().newScratch();
      } else if (k === "b" && e.shiftKey) {
        e.preventDefault();
        toggleBase64InEditor();
      } else if (k === "b") {
        e.preventDefault();
        useIde.getState().toggleExplorer();
      } else if (k === "`") {
        e.preventDefault();
        void useIde.getState().launchTerminal();
      } else if (k === ",") {
        e.preventDefault();
        useIde.getState().toggleSettings();
      } else if (k === "v" && e.shiftKey) {
        e.preventDefault();
        useIde.getState().togglePreview();
      } else if (k === "f" && e.shiftKey) {
        e.preventDefault();
        useIde.getState().toggleSearch();
      } else if (k === "t" && e.shiftKey) {
        e.preventDefault();
        useIde.getState().reopenClosedTab();
      } else if (k === "=" || k === "+" || e.code === "NumpadAdd") {
        e.preventDefault();
        useIde.getState().bumpFont(1);
      } else if (k === "-" || e.code === "NumpadSubtract") {
        e.preventDefault();
        useIde.getState().bumpFont(-1);
      } else if (k === "0" && !e.shiftKey) {
        e.preventDefault();
        useIde.getState().resetFont();
      } else if (k === "g" && !e.shiftKey) {
        e.preventDefault();
        useIde.getState().openGoto();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, []);

  const showExplorer = explorerOpen;

  return (
    <div
      className="relative flex h-dvh min-h-0 flex-col overflow-hidden bg-bg text-fg md:flex-row"
      onDragEnter={(e) => {
        e.preventDefault();
        dragDepth.current += 1;
        if (e.dataTransfer.types.includes("Files")) setDropHover(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDropHover(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        dragDepth.current = 0;
        setDropHover(false);
        void useIde.getState().ingestDrop(e.dataTransfer);
      }}
    >
      <ActivityBar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1">
            {showExplorer && (
              <>
                <div
                  className="hidden min-h-0 shrink-0 md:block"
                  style={{ width: explorerWidth }}
                >
                  <FileTree />
                </div>
                <DragHandle
                  axis="x"
                  onDrag={(delta) =>
                    setExplorerWidth((w) => Math.min(420, Math.max(160, w + delta)))
                  }
                  className="hidden md:block"
                />
              </>
            )}
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
              {showExplorer && (
                <div className="absolute inset-0 z-20 border-b border-border md:hidden">
                  <FileTree />
                </div>
              )}
              <TabBar />
              <div className="flex min-h-0 flex-1 flex-col">
                <EditorPane />
              </div>
            </div>
          </div>
        <StatusBar />
      </div>
      <CommandPalette />
      <SearchPanel />
      <SettingsPanel />
      <PromptDialog />
      {dropHover && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-bg/70">
          <p className="rounded-xl border border-accent bg-elevated px-6 py-4 text-sm text-fg shadow-(--shadow-float)">
            Drop files or a folder to open
          </p>
        </div>
      )}
    </div>
  );
}
