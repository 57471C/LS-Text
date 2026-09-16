import { getEditorView } from "./base64";

const TASK = /\[[ xX]\]/g;

export function toggleTaskInLine(text: string, index: number) {
  let n = 0;
  let from = -1;
  let next = "";
  TASK.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TASK.exec(text))) {
    if (n === index) {
      from = m.index;
      next = m[0][1] === " " ? "[x]" : "[ ]";
      break;
    }
    n += 1;
  }
  if (from < 0) return null;
  return { from, to: from + 3, insert: next };
}

export function toggleTaskAt(line: number, index: number) {
  const view = getEditorView();
  if (!view) return;
  if (line < 1 || line > view.state.doc.lines) return;
  const docLine = view.state.doc.line(line);
  const patch = toggleTaskInLine(docLine.text, index);
  if (!patch) return;
  view.dispatch({
    changes: {
      from: docLine.from + patch.from,
      to: docLine.from + patch.to,
      insert: patch.insert,
    },
  });
}
