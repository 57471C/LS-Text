import { syntaxTree } from "@codemirror/language";
import type { EditorState } from "@codemirror/state";
import { highlightTree, tagHighlighter, tags as t } from "@lezer/highlight";
import { getEditorView } from "./base64";
import { useIde } from "./store";

/** Light+ colours so paste reads on a white Word / email page. */
const richHighlighter = tagHighlighter([
  { tag: t.comment, class: "color:#008000;font-style:italic" },
  { tag: t.lineComment, class: "color:#008000;font-style:italic" },
  { tag: t.blockComment, class: "color:#008000;font-style:italic" },
  { tag: t.docComment, class: "color:#008000;font-style:italic" },
  { tag: t.keyword, class: "color:#0000FF" },
  { tag: t.definitionKeyword, class: "color:#0000FF" },
  { tag: t.modifier, class: "color:#0000FF" },
  { tag: t.controlKeyword, class: "color:#AF00DB" },
  { tag: t.moduleKeyword, class: "color:#AF00DB" },
  { tag: t.operatorKeyword, class: "color:#AF00DB" },
  { tag: t.self, class: "color:#0000FF" },
  { tag: t.string, class: "color:#A31515" },
  { tag: t.special(t.string), class: "color:#A31515" },
  { tag: t.docString, class: "color:#A31515" },
  { tag: t.regexp, class: "color:#811F3F" },
  { tag: t.number, class: "color:#098658" },
  { tag: t.integer, class: "color:#098658" },
  { tag: t.float, class: "color:#098658" },
  { tag: t.bool, class: "color:#0000FF" },
  { tag: t.null, class: "color:#0000FF" },
  { tag: t.variableName, class: "color:#001080" },
  { tag: t.function(t.variableName), class: "color:#795E26" },
  { tag: t.function(t.propertyName), class: "color:#795E26" },
  { tag: t.propertyName, class: "color:#001080" },
  { tag: t.typeName, class: "color:#267F99" },
  { tag: t.className, class: "color:#267F99" },
  { tag: t.namespace, class: "color:#267F99" },
  { tag: t.tagName, class: "color:#800000" },
  { tag: t.heading, class: "color:#800000;font-weight:600" },
  { tag: t.link, class: "color:#0000FF;text-decoration:underline" },
  { tag: t.invalid, class: "color:#CD3131" },
]);

const LINE =
  "margin:0;padding:0;line-height:1.35;white-space:pre-wrap;font-family:Consolas,'Courier New',monospace;font-size:10.5pt;color:#000000";

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">");
}

function paint(text: string, style: string) {
  return text.split(/\r?\n/).map((part) => {
    const safe = escapeHtml(part);
    if (!style) return safe;
    return `<span style="${style}">${safe}</span>`;
  }).join("\n");
}

function wrapLines(body: string) {
  return body.split("\n").map((line) => {
    const inner = line.length ? line : "&nbsp;";
    return `<div style="${LINE}">${inner}</div>`;
  }).join("");
}

function toHtml(state: EditorState, from: number, to: number, plain: string) {
  let pos = from;
  let body = "";
  highlightTree(
    syntaxTree(state),
    richHighlighter,
    (a, b, style) => {
      const start = Math.max(a, from);
      const end = Math.min(b, to);
      if (end <= start) return;
      if (start > pos) body += paint(state.sliceDoc(pos, start), "");
      body += paint(state.sliceDoc(start, end), style);
      pos = end;
    },
    from,
    to,
  );
  if (pos < to) body += paint(state.sliceDoc(pos, to), "");
  if (!body) body = paint(plain, "");
  return wrapLines(body);
}

export async function copyRichFromEditor() {
  const view = getEditorView();
  if (!view) {
    useIde.setState({ status: "No editor" });
    return;
  }
  const main = view.state.selection.main;
  const from = main.empty ? 0 : main.from;
  const to = main.empty ? view.state.doc.length : main.to;
  const plain = view.state.sliceDoc(from, to);
  if (!plain) {
    useIde.setState({ status: "Nothing to copy" });
    return;
  }
  const html = toHtml(view.state, from, to, plain);
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/plain": new Blob([plain], { type: "text/plain" }),
        "text/html": new Blob([html], { type: "text/html" }),
      }),
    ]);
    useIde.setState({
      status: main.empty ? "Copied file with highlighting" : "Copied selection with highlighting",
    });
  } catch (err) {
    try {
      await navigator.clipboard.writeText(plain);
      useIde.setState({ status: "Copied as plain text (rich copy blocked)" });
    } catch {
      useIde.setState({
        status: err instanceof Error ? err.message : "Copy failed",
      });
    }
  }
}
