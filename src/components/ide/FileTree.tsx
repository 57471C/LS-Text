import type { ReactNode } from "react";
import {
  ChevronRight,
  FileCode,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  FilePlus,
  MoreHorizontal,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { DirEntry } from "@/lib/ide/types";
import { isDirty, useIde } from "@/lib/ide/store";
import { cn, extname } from "@/lib/utils";

const EMPTY: DirEntry[] = [];

function FileGlyph({ name, kind, open }: { name: string; kind: "file" | "dir"; open?: boolean }) {
  if (kind === "dir") {
    const Icon = open ? FolderOpen : Folder;
    return <Icon className="size-3.5 shrink-0 text-muted" strokeWidth={1.6} />;
  }
  const ext = extname(name);
  if (["json", "toml", "yaml", "yml"].includes(ext)) {
    return <FileJson className="size-3.5 shrink-0 text-muted" strokeWidth={1.6} />;
  }
  if (["rs", "ts", "tsx", "js", "jsx", "py", "css", "html", "sh"].includes(ext)) {
    return <FileCode className="size-3.5 shrink-0 text-muted" strokeWidth={1.6} />;
  }
  return <FileText className="size-3.5 shrink-0 text-muted" strokeWidth={1.6} />;
}

function Node({ entry, depth }: { entry: DirEntry; depth: number }) {
  const expanded = useIde((s) => s.expandedDirs.includes(entry.path));
  const children = useIde((s) => s.children[entry.path]);
  const activePath = useIde((s) => s.tabs.find((t) => t.id === s.activeTabId)?.path);
  const dirty = useIde((s) => s.tabs.some((t) => t.path === entry.path && isDirty(t)));
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    if (entry.kind === "dir" && expanded && !children) {
      void useIde.getState().expandDir(entry.path);
    }
  }, [entry.kind, entry.path, expanded, children]);

  const onOpen = () => {
    if (entry.kind === "dir") void useIde.getState().toggleDir(entry.path);
    else void useIde.getState().openPath(entry.path);
  };

  return (
    <div>
      <div
        className={cn(
          "group relative flex h-8 items-center gap-1.5 rounded-sm pr-1 text-[13px] text-muted",
          "hover:bg-elevated hover:text-fg",
          activePath === entry.path && "bg-elevated text-fg",
        )}
        style={{ paddingLeft: 8 + depth * 12 }}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu((v) => !v);
        }}
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          onClick={onOpen}
          onDoubleClick={onOpen}
        >
          {entry.kind === "dir" ? (
            <ChevronRight
              className={cn(
                "size-3 shrink-0 text-subtle transition-transform duration-150",
                expanded && "rotate-90",
              )}
              strokeWidth={1.8}
            />
          ) : (
            <span className="inline-block w-3" />
          )}
          <FileGlyph name={entry.name} kind={entry.kind} open={expanded} />
          <span className="min-w-0 truncate">{entry.name}</span>
          {dirty && (
            <span className="ml-auto size-1.5 shrink-0 rounded-full bg-accent" title="Unsaved" />
          )}
        </button>
        <button
          type="button"
          className="size-6 shrink-0 rounded-sm opacity-0 hover:bg-tab-active group-hover:opacity-100"
          aria-label="File actions"
          onClick={(e) => {
            e.stopPropagation();
            setMenu((v) => !v);
          }}
        >
          <MoreHorizontal className="mx-auto size-3.5" />
        </button>
        {menu && (
          <div
            className="absolute top-8 right-1 z-30 min-w-36 rounded-md border border-border bg-elevated py-1 shadow-[var(--shadow-float)]"
            onMouseLeave={() => setMenu(false)}
          >
            {entry.kind === "dir" && (
              <>
                <MenuItem
                  onClick={() => {
                    setMenu(false);
                    useIde.getState().requestPrompt({
                      kind: "new-file",
                      path: entry.path,
                      value: "untitled.md",
                    });
                  }}
                >
                  New file
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setMenu(false);
                    useIde.getState().requestPrompt({
                      kind: "new-folder",
                      path: entry.path,
                      value: "folder",
                    });
                  }}
                >
                  New folder
                </MenuItem>
              </>
            )}
            <MenuItem
              onClick={() => {
                setMenu(false);
                useIde.getState().requestPrompt({
                  kind: "rename",
                  path: entry.path,
                  value: entry.name,
                });
              }}
            >
              Rename
            </MenuItem>
            <MenuItem
              danger
              onClick={() => {
                setMenu(false);
                useIde.getState().requestPrompt({ kind: "delete", path: entry.path });
              }}
            >
              Delete
            </MenuItem>
          </div>
        )}
      </div>
      {entry.kind === "dir" && expanded && children && (
        <div>
          {children.map((child) => (
            <Node key={child.path} entry={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-8 w-full items-center px-3 text-left text-xs text-fg hover:bg-tab-active",
        danger && "text-danger",
      )}
    >
      {children}
    </button>
  );
}

export function FileTree() {
  const root = useIde((s) => s.fs.rootPath);
  const name = useIde((s) => s.fs.name);
  const kind = useIde((s) => s.fs.kind);
  const children = useIde((s) => s.children[root] ?? EMPTY);

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
        {children.length === 0 && (
          <p className="px-3 py-6 text-xs text-subtle">
            {kind === "virtual" ? "Empty scratchpad." : "This folder is empty."}
          </p>
        )}
      </div>
    </div>
  );
}
