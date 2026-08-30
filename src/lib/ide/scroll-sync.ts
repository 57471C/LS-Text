import type { EditorView } from "@codemirror/view";

type Pt = { x: number; y: number };

function lerp(x: number, pts: Pt[]) {
  if (pts.length === 0) return 0;
  if (x <= pts[0]!.x) return pts[0]!.y;
  const last = pts[pts.length - 1]!;
  if (x >= last.x) return last.y;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    if (x <= b.x) {
      const t = (x - a.x) / (b.x - a.x || 1);
      return a.y + t * (b.y - a.y);
    }
  }
  return last.y;
}

let ignorePreviewScroll = false;
let snapLockUntil = 0;

function markers(preview: HTMLElement): { line: number; el: HTMLElement }[] {
  return [...preview.querySelectorAll<HTMLElement>("[data-line]")]
    .map((el) => ({ line: Number(el.dataset.line), el }))
    .filter((m) => m.line > 0)
    .sort((a, b) => a.line - b.line);
}

function offsetIn(preview: HTMLElement, el: HTMLElement) {
  return (
    el.getBoundingClientRect().top -
    preview.getBoundingClientRect().top +
    preview.scrollTop
  );
}

/** Snap the preview so the block for `line` sits at the top. */
export function scrollPreviewToLine(preview: HTMLElement, line: number) {
  const ms = markers(preview);
  if (ms.length === 0) return;
  const exact = ms.find((m) => m.line === line);
  const atOrBefore = [...ms].reverse().find((m) => m.line <= line);
  const el = (exact ?? atOrBefore ?? ms[0]!).el;
  ignorePreviewScroll = true;
  snapLockUntil = performance.now() + 120;
  preview.scrollTop = Math.max(0, offsetIn(preview, el) - 4);
  requestAnimationFrame(() => {
    ignorePreviewScroll = false;
  });
}

function editorLine(view: EditorView) {
  const y = view.scrollDOM.scrollTop;
  const block = view.lineBlockAtHeight(y);
  const line = view.state.doc.lineAt(block.from);
  const frac = block.height > 0 ? (y - block.top) / block.height : 0;
  return line.number + Math.max(0, Math.min(1, frac));
}

/** Map source line → preview scrollTop using block anchors, interpolating
 *  between them so both panes start, travel, and finish together. */
export function bindMarkdownScroll(view: EditorView, preview: HTMLElement) {
  let lock: "editor" | "preview" | null = null;

  const syncPreview = () => {
    if (lock === "preview" || performance.now() < snapLockUntil) return;
    lock = "editor";
    const pMax = preview.scrollHeight - preview.clientHeight;
    if (pMax <= 0) {
      lock = null;
      return;
    }
    const ms = markers(preview);
    const lines = view.state.doc.lines;
    const pts: Pt[] = [
      { x: 1, y: 0 },
      ...ms.map((m) => ({
        x: m.line,
        y: Math.min(offsetIn(preview, m.el), pMax),
      })),
      { x: Math.max(lines, 1), y: pMax },
    ];
    preview.scrollTop = lerp(editorLine(view), pts);
    requestAnimationFrame(() => {
      lock = null;
    });
  };

  const syncEditor = () => {
    if (lock === "editor" || ignorePreviewScroll) return;
    lock = "preview";
    const eMax = view.scrollDOM.scrollHeight - view.scrollDOM.clientHeight;
    const pMax = preview.scrollHeight - preview.clientHeight;
    if (eMax <= 0) {
      lock = null;
      return;
    }
    const ms = markers(preview);
    const lines = view.state.doc.lines;
    const pts: Pt[] = [
      { x: 0, y: 1 },
      ...ms.map((m) => ({ x: offsetIn(preview, m.el), y: m.line })),
      { x: Math.max(pMax, 0), y: Math.max(lines, 1) },
    ];
    const mapped = lerp(preview.scrollTop, pts);
    const ln = Math.max(1, Math.min(lines, Math.floor(mapped)));
    const line = view.state.doc.line(ln);
    const block = view.lineBlockAt(line.from);
    const frac = mapped - Math.floor(mapped);
    view.scrollDOM.scrollTop = block.top + frac * block.height;
    requestAnimationFrame(() => {
      lock = null;
    });
  };

  view.scrollDOM.addEventListener("scroll", syncPreview, { passive: true });
  preview.addEventListener("scroll", syncEditor, { passive: true });
  syncPreview();

  return () => {
    view.scrollDOM.removeEventListener("scroll", syncPreview);
    preview.removeEventListener("scroll", syncEditor);
  };
}
