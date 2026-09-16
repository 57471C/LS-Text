import { type RefObject, useMemo } from "react";
import { renderMarkdown } from "@/lib/ide/markdown";

export function MarkdownPreview({
  content,
  scrollRef,
}: {
  content: string;
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  const html = useMemo(() => renderMarkdown(content), [content]);
  const empty = content.trim().length === 0;

  return (
    <section className="md-preview-pane" aria-label="Markdown preview">
      <header className="flex h-8 shrink-0 items-center border-b border-border px-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-subtle">
          Preview
        </span>
      </header>
      <div
        ref={scrollRef}
        className="md-preview min-h-0 flex-1 overflow-auto px-5 pt-4 pb-8 md:px-6 md:pt-5"
      >
        {empty ? (
          <p className="text-sm text-subtle">Nothing to preview yet.</p>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
    </section>
  );
}
