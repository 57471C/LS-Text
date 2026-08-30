import { useIde } from "@/lib/ide/store";
import { FONT_MAX, FONT_MIN, isDirty } from "@/lib/ide/store";
import { modLabel } from "@/lib/utils";

export function StatusBar() {
  const tab = useIde((s) => s.tabs.find((t) => t.id === s.activeTabId) ?? null);
  const cursor = useIde((s) => s.cursor);
  const status = useIde((s) => s.status);
  const workspace = useIde((s) => s.fs.name);
  const kind = useIde((s) => s.fs.kind);
  const previewOpen = useIde((s) => s.previewOpen);
  const fontSize = useIde((s) => s.settings.fontSize);
  const zenMode = useIde((s) => s.zenMode);
  const counts = useIde((s) => s.counts);
  const mod = modLabel();

  return (
    <footer className="flex h-7 shrink-0 items-center justify-between gap-3 border-t border-border bg-activity px-3 font-mono text-[11px] text-muted">
      <div className="flex min-w-0 items-center gap-3">
        <span className="truncate">
          {workspace}
          <span className="text-subtle"> · {kind === "native" ? "disk" : "scratchpad"}</span>
        </span>
        {zenMode ? (
          <button
            type="button"
            className="text-fg hover:text-accent"
            onClick={() => useIde.getState().toggleZen()}
            title="Exit zen  Esc"
          >
            Zen · Esc
          </button>
        ) : (
          <span className="hidden truncate sm:inline">{status}</span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3 tabular-nums">
        {tab && (
          <>
            <button
              type="button"
              className="hover:text-fg"
              title={`Go to line  ${mod}+G`}
              onClick={() => useIde.getState().openGoto()}
            >
              Ln {cursor.line}, Col {cursor.col}
            </button>
            <span title={counts.hasSelection ? `${counts.selChars} of ${counts.chars} characters` : `${counts.chars} characters`}>
              {counts.hasSelection
                ? `${counts.selWords} of ${counts.words} words`
                : `${counts.words} ${counts.words === 1 ? "word" : "words"}`}
            </span>
            <span>{tab.language}</span>
            {previewOpen && tab.language === "Markdown" ? <span>Preview</span> : null}
            <span>{isDirty(tab) ? "Modified" : "Saved"}</span>
            <span className="flex items-center gap-1">
              <button
                type="button"
                className="px-1 hover:text-fg"
                aria-label="Smaller text"
                disabled={fontSize <= FONT_MIN}
                title={`${mod}+-`}
                onClick={() => useIde.getState().bumpFont(-1)}
              >
                −
              </button>
              <button
                type="button"
                className="hover:text-fg"
                title={`${mod}+0 reset`}
                onClick={() => useIde.getState().resetFont()}
              >
                {fontSize}px
              </button>
              <button
                type="button"
                className="px-1 hover:text-fg"
                aria-label="Larger text"
                disabled={fontSize >= FONT_MAX}
                title={`${mod}+=`}
                onClick={() => useIde.getState().bumpFont(1)}
              >
                +
              </button>
            </span>
            <span>UTF-8</span>
          </>
        )}
      </div>
    </footer>
  );
}
