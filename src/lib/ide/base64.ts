import { EditorSelection, type EditorView } from "@codemirror/view";
import { useIde } from "./store";

let view: EditorView | null = null;

export function bindEditorView(next: EditorView | null) {
  view = next;
}

function looksLikeBase64(raw: string) {
  const t = raw.replace(/\s+/g, "");
  if (t.length < 8 || t.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(t);
}

function encodeUtf8(text: string) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function decodeUtf8(raw: string) {
  const compact = raw.replace(/\s+/g, "");
  const bin = atob(compact);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export function toggleBase64Text(input: string): {
  text: string;
  mode: "encode" | "decode";
} {
  if (!input) throw new Error("Nothing to encode");
  if (looksLikeBase64(input)) {
    try {
      return { text: decodeUtf8(input), mode: "decode" };
    } catch {
      /* fall through and encode */
    }
  }
  return { text: encodeUtf8(input), mode: "encode" };
}

export function toggleBase64InEditor() {
  if (!view) {
    useIde.setState({ status: "No editor" });
    return;
  }
  const main = view.state.selection.main;
  const from = main.empty ? 0 : main.from;
  const to = main.empty ? view.state.doc.length : main.to;
  const src = view.state.sliceDoc(from, to);
  try {
    const { text, mode } = toggleBase64Text(src);
    view.dispatch({
      changes: { from, to, insert: text },
      selection: EditorSelection.range(from, from + text.length),
    });
    view.focus();
    useIde.setState({
      status: mode === "decode" ? "Base64 decoded" : "Base64 encoded",
    });
  } catch (err) {
    useIde.setState({
      status: err instanceof Error ? err.message : "Base64 failed",
    });
  }
}
