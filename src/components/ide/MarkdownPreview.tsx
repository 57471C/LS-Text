import { type RefObject, useMemo } from "react";
import { extractHeadings, renderMarkdown } from "@/lib/ide/markdown";
import { scrollPreviewToLine } from "@/lib/ide/scroll-sync";
import { useIde } from "@/lib/ide/store";

export function MarkdownPreview({
  content,
  scrollRef,
}: {
  content: string;
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  const html = useMemo(() => renderMarkdown(content), [content]);
  const headings = useMemo(() => extractHeadings(content), [content]);
  const empty = content.trim().length === 0;
  const cursorLine = useIde((s) => s.cursor.line);
  const path = useIde((s) => s.tabs.find((t) => t.id === s.activeTabId)?.path ?? "");

  const activeLine = headings.reduce((acc, h) => (h.line <= cursorLine ? h.line : acc), 0);

  return (
    <section className="md-preview-pane" aria-label="Markdown preview">
      <header className="flex h-8 shrink-0 items-center border-b border-border px-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-subtle">
          Preview
        </span>
      </header>
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden max-md:flex-col md:flex-row">
        {headings.length > 0 && (
          <nav
            className="md-outline shrink-0 overflow-auto border-border max-md:max-h-28 max-md:border-b md:w-44 md:border-r"
            aria-label="Markdown outline"
          >
            {headings.map((h) => (
              <button
                key={`${h.line}:${h.text}`}
                type="button"
                title={h.text}
                onClick={() => {
                  scrollRef.current &&
                    scrollPreviewToLine(scrollRef.current, h.line);
                  void useIde.getState().jumpTo(path, h.line, 1);
                }}
                className={`block w-full truncate border-l-2 py-1 pr-2 text-left text-[12px] hover:text-fg ${
                  h.line === activeLine
                    ? "border-accent text-fg"
                    : "border-transparent text-muted"
                }`}
                aria-current={h.line === activeLine ? "true" : undefined}
                style={{ paddingLeft: `${8 + (h.level - 1) * 10}px` }}
              >
                {h.text}
              </button>
            ))}
          </nav>
        )}
        <div
          ref={scrollRef}
          className="md-preview min-h-0 flex-1 overflow-auto px-5 pt-4 pb-[min(72vh,32rem)] md:px-6 md:pt-5"
        >
          {empty ? (
            <p className="text-sm text-subtle">Nothing to preview yet.</p>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: html }} />
          )}
        </div>
      </div>
    </section>
  );
}
