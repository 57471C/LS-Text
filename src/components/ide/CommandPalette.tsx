import { Command } from "cmdk";
import { useEffect, useState } from "react";
import { useIde } from "@/lib/ide/store";
import { basename, modLabel } from "@/lib/utils";

export function CommandPalette() {
  const open = useIde((s) => s.paletteOpen);
  const [files, setFiles] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const mod = modLabel();

  useEffect(() => {
    if (!open) return;
    setQuery("");
    void useIde.getState().allFiles().then(setFiles);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        useIde.getState().togglePalette(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const commands = [
    { id: "new", label: "New scratch buffer", hint: `${mod}+N`, run: () => useIde.getState().newScratch() },
    { id: "open", label: "Open folder", hint: `${mod}+O`, run: () => void useIde.getState().openFolder() },
    { id: "save", label: "Save file", hint: `${mod}+S`, run: () => void useIde.getState().saveTab() },
    { id: "term", label: "Toggle terminal", hint: `${mod}+\``, run: () => void useIde.getState().launchTerminal() },
    { id: "explorer", label: "Toggle explorer", hint: `${mod}+B`, run: () => useIde.getState().toggleExplorer() },
    { id: "goto", label: "Go to line", hint: `${mod}+G`, run: () => useIde.getState().openGoto() },
    { id: "search", label: "Search workspace", hint: `${mod}+Shift+F`, run: () => useIde.getState().toggleSearch(true) },
    { id: "reopen", label: "Reopen closed tab", hint: `${mod}+Shift+T`, run: () => useIde.getState().reopenClosedTab() },
    { id: "zen", label: "Toggle zen mode", hint: `${mod}+K Z`, run: () => useIde.getState().toggleZen() },
    { id: "font-up", label: "Larger text", hint: `${mod}+=`, run: () => useIde.getState().bumpFont(1) },
    { id: "font-down", label: "Smaller text", hint: `${mod}+-`, run: () => useIde.getState().bumpFont(-1) },
    { id: "font-reset", label: "Reset text size", hint: `${mod}+0`, run: () => useIde.getState().resetFont() },
    { id: "preview", label: "Toggle markdown preview", hint: `${mod}+Shift+V`, run: () => useIde.getState().togglePreview() },
    { id: "settings", label: "Open settings", hint: `${mod}+,`, run: () => useIde.getState().toggleSettings() },
    { id: "reset", label: "Restore sample workspace", hint: "", run: () => void useIde.getState().resetWorkspace() },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-bg/60 px-3 pt-[12vh]"
      onMouseDown={() => useIde.getState().togglePalette(false)}
    >
      <Command
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-elevated shadow-(--shadow-float)"
        onMouseDown={(e) => e.stopPropagation()}
        label="Command palette"
      >
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Go to file or run a command…"
          className="h-12 w-full border-b border-border bg-transparent px-4 text-sm text-fg outline-none placeholder:text-subtle"
        />
        <Command.List className="max-h-80 overflow-auto p-1">
          <Command.Empty className="px-3 py-6 text-center text-sm text-subtle">
            Nothing matches.
          </Command.Empty>
          <Command.Group heading="Commands">
            {commands.map((c) => (
              <Command.Item
                key={c.id}
                value={`cmd ${c.label}`}
                onSelect={() => {
                  useIde.getState().togglePalette(false);
                  c.run();
                }}
                className="flex h-9 cursor-pointer items-center justify-between rounded-md px-2 text-sm text-fg"
              >
                <span>{c.label}</span>
                {c.hint ? <span className="font-mono text-[11px] text-subtle">{c.hint}</span> : null}
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Group heading="Files">
            {files.map((path) => (
              <Command.Item
                key={path}
                value={`file ${basename(path)} ${path}`}
                onSelect={() => {
                  useIde.getState().togglePalette(false);
                  void useIde.getState().openPath(path);
                }}
                className="flex h-9 cursor-pointer items-center justify-between gap-3 rounded-md px-2 text-sm text-fg"
              >
                <span className="truncate">{basename(path)}</span>
                <span className="truncate font-mono text-[11px] text-subtle">{path}</span>
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
