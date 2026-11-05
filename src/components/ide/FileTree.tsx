export function FileTree() {
  const root = useIde((s) => s.fs.rootPath);
  const name = useIde((s) => s.fs.name);
  const kind = useIde((s) => s.fs.kind);
  const children = useIde((s) => s.children[root] ?? EMPTY);
  const workspaceError = useIde((s) => s.workspaceError);

  useEffect(() => {
    void useIde.getState().expandDir(root);
  }, [root]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-panel">
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
        <div className="min-w-0">
          <div className="truncate text-[11px] font-medium tracking-wide text-muted uppercase">
            Explorer
          </div>
          <div className="truncate text-xs text-fg">{name}</div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-sm text-muted hover:bg-elevated hover:text-fg"
            title="New file"
            onClick={() =>
              useIde.getState().requestPrompt({
                kind: "new-file",
                path: root,
                value: "untitled.md",
              })
            }
          >
            <FilePlus className="size-3.5" />
          </button>
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-sm text-muted hover:bg-elevated hover:text-fg"
            title="New folder"
            onClick={() =>
              useIde.getState().requestPrompt({
                kind: "new-folder",
                path: root,
                value: "folder",
              })
            }
          >
            <FolderPlus className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto py-1">
        {children.map((entry) => (
          <Node key={entry.path} entry={entry} depth={0} />
        ))}
        {children.length === 0 && workspaceError && (
          <div className="px-3 py-6 text-xs text-subtle">
            <p>Folder unavailable.</p>
            <p className="mt-1 break-all text-fg">{root}</p>
            <p className="mt-2">The network drive may not be connected yet.</p>
            <button
              type="button"
              className="mt-3 rounded-sm border border-border px-2 py-1 text-fg hover:bg-elevated"
              onClick={() => void useIde.getState().refreshDir(root)}
            >
              Retry
            </button>
          </div>
        )}
        {children.length === 0 && !workspaceError && (
          <p className="px-3 py-6 text-xs text-subtle">
            {kind === "virtual" ? "Empty scratchpad." : "This folder is empty."}
          </p>
        )}
      </div>
    </div>
  );
}
