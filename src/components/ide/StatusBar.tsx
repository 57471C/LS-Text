import { useEffect, useRef, useState } from "react";
import { toggleBase64InEditor } from "@/lib/ide/base64";
import { LANGUAGE_CHOICES, setActiveLanguage } from "@/lib/ide/language-mode";
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
  const counts = useIde((s) => s.counts);
  const mod = modLabel();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!langOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!langRef.current?.contains(e.target as Node)) setLangOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [langOpen]);

  return (
    <footer className="flex h-7 shrink-0 items-center justify-between gap-3 border-t border-border bg-activity px-3 font-mono text-[11px] text-muted">
      <div className="flex min-w-0 items-center gap-3">
        <span className="truncate">
          {workspace}
          <span className="text-subtle"> · {kind === "native" ? "disk" : "scratchpad"}</span>
        </span>
        <span className="hidden truncate sm:inline">{status}</span>
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
            <div className="relative" ref={langRef}>
              <button
                type="button"
                className="hover:text-fg"
                aria-haspopup="listbox"
                aria-expanded={langOpen}
                title="Change language mode"
                onClick={() => setLangOpen((v) => !v)}
              >
                {tab.language}
              </button>
              {langOpen && (
                <div
                  role="listbox"
                  className="absolute right-0 bottom-7 z-40 max-h-64 min-w-40 overflow-auto rounded-md border border-border bg-elevated py-1 shadow-(--shadow-float)"
                >
                  {LANGUAGE_CHOICES.map((label) => (
                    <button
                      key={label}
                      type="button"
                      role="option"
                      aria-selected={tab.language === label}
                      className={`block w-full px-3 py-1.5 text-left hover:bg-tab-active hover:text-fg ${
                        tab.language === label ? "text-fg" : "text-muted"
                      }`}
                      onClick={() => {
                        setActiveLanguage(label);
                        setLangOpen(false);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
            <button
              type="button"
              className="hover:text-fg"
              title={`Toggle Base64  ${mod}+Shift+B`}
              onClick={() => toggleBase64InEditor()}
            >
              Base64
            </button>
            <span>UTF-8</span>
          </>
        )}
      </div>
    </footer>
  );
}
