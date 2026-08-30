import { Columns2, X } from "lucide-react";
import { isDirty, useIde } from "@/lib/ide/store";
import { isMarkdownName } from "@/lib/ide/markdown";
import { cn, modLabel } from "@/lib/utils";

export function TabBar() {
  const tabs = useIde((s) => s.tabs);
  const activeTabId = useIde((s) => s.activeTabId);
  const previewOpen = useIde((s) => s.previewOpen);
  const activeName = tabs.find((t) => t.id === activeTabId)?.name ?? "";
  const md = isMarkdownName(activeName);
  const mod = modLabel();

  return (
    <div className="flex h-10 shrink-0 items-end border-b border-border bg-tab">
      <div className="flex min-w-0 flex-1 items-end gap-px overflow-x-auto">
        {tabs.map((tab) => {
          const active = tab.id === activeTabId;
          const dirty = isDirty(tab);
          return (
            <div
              key={tab.id}
              className={cn(
                "group relative flex h-9 min-w-32 max-w-52 shrink-0 items-center gap-2 border-r border-border px-2.5 text-sm",
                active ? "bg-bg text-fg" : "bg-tab text-muted hover:bg-tab-active hover:text-fg",
              )}
            >
              {active && (
                <span className="absolute inset-x-0 top-0 h-0.5 bg-accent" />
              )}
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left"
                onClick={() => useIde.getState().setActiveTab(tab.id)}
              >
                {tab.name}
              </button>
              <button
                type="button"
                className="flex size-5 items-center justify-center rounded-sm hover:bg-elevated"
                aria-label={`Close ${tab.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  useIde.getState().closeTab(tab.id);
                }}
              >
                {dirty ? (
                  <span className="size-1.5 rounded-full bg-accent group-hover:hidden" />
                ) : null}
                <X
                  className={cn("size-3.5", dirty ? "hidden group-hover:block" : "opacity-50")}
                  strokeWidth={1.8}
                />
              </button>
            </div>
          );
        })}
      </div>
      {md && (
        <button
          type="button"
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center border-l border-border text-muted hover:text-fg",
            previewOpen && "bg-bg text-fg",
          )}
          aria-pressed={previewOpen}
          aria-label="Toggle markdown preview"
          title={`${mod}+Shift+V`}
          onClick={() => useIde.getState().togglePreview()}
        >
          <Columns2 className="size-4" strokeWidth={1.7} />
        </button>
      )}
    </div>
  );
}
