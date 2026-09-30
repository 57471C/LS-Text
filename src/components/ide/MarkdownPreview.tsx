import { Minus, Plus } from "lucide-react";
import { type RefObject, useMemo } from "react";
import { renderMarkdown } from "@/lib/ide/markdown";
import { toggleTaskAt } from "@/lib/ide/markdown-task";
import { useIde } from "@/lib/ide/store";

export const PREVIEW_ZOOM_MIN = 50;
export const PREVIEW_ZOOM_MAX = 200;
export const PREVIEW_ZOOM_STEP = 10;
export const PREVIEW_ZOOM_DEFAULT = 100;

export function clampPreviewZoom(n: number) {
  const stepped = Math.round(n / PREVIEW_ZOOM_STEP) * PREVIEW_ZOOM_STEP;
  return Math.min(PREVIEW_ZOOM_MAX, Math.max(PREVIEW_ZOOM_MIN, stepped));
}

function bumpZoom(delta: number) {
  const cur = useIde.getState().settings.previewZoom ?? PREVIEW_ZOOM_DEFAULT;
  useIde.getState().setSettings({ previewZoom: clampPreviewZoom(cur + delta) });
}

export function MarkdownPreview({
  content,
  scrollRef,
  solo = false,
}: {
  content: string;
  scrollRef: RefObject<HTMLDivElement | null>;
  solo?: boolean;
}) {
  const html = useMemo(() => renderMarkdown(content), [content]);
  const empty = content.trim().length === 0;
  const zoom = useIde((s) => s.settings.previewZoom ?? PREVIEW_ZOOM_DEFAULT);

  return (
    <section
      className={solo ? "md-preview-pane is-solo" : "md-preview-pane"}
      aria-label="Markdown preview"
    >
      <header className="relative flex h-8 shrink-0 items-center border-b border-border px-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-subtle">
          Preview
        </span>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="pointer-events-auto flex items-center gap-0.5">
            <button
              type="button"
              className="flex size-6 items-center justify-center rounded-sm text-muted hover:bg-elevated hover:text-fg disabled:opacity-30"
              aria-label="Zoom out preview"
              title="Zoom out"
              disabled={zoom <= PREVIEW_ZOOM_MIN}
              onClick={() => bumpZoom(-PREVIEW_ZOOM_STEP)}
            >
              <Minus className="size-3.5" strokeWidth={1.8} />
            </button>
            <span className="w-10 text-center text-[10px] tabular-nums text-subtle">{zoom}%</span>
            <button
              type="button"
              className="flex size-6 items-center justify-center rounded-sm text-muted hover:bg-elevated hover:text-fg disabled:opacity-30"
              aria-label="Zoom in preview"
              title="Zoom in"
              disabled={zoom >= PREVIEW_ZOOM_MAX}
              onClick={() => bumpZoom(PREVIEW_ZOOM_STEP)}
            >
              <Plus className="size-3.5" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </header>
      <div
        ref={scrollRef}
        className="md-preview min-h-0 flex-1 overflow-auto px-5 pt-4 pb-8 md:px-6 md:pt-5"
        style={{ ["--md-preview-zoom" as string]: String(zoom / 100) }}
        onWheel={(e) => {
          if (!e.ctrlKey && !e.metaKey) return;
          e.preventDefault();
          bumpZoom(e.deltaY < 0 ? PREVIEW_ZOOM_STEP : -PREVIEW_ZOOM_STEP);
        }}
        onClick={(e) => {
          const t = e.target;
          if (!(t instanceof HTMLInputElement) || t.type !== "checkbox") return;
          e.preventDefault();
          const line = Number(t.dataset.taskLine);
          const index = Number(t.dataset.taskI);
          if (!Number.isFinite(line) || !Number.isFinite(index)) return;
          toggleTaskAt(line, index);
        }}
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
