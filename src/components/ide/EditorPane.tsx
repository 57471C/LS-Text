import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
  indentUnit,
} from "@codemirror/language";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { Compartment, EditorSelection, EditorState } from "@codemirror/state";
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view";
import { useEffect, useRef, useState } from "react";
import { DragHandle } from "./DragHandle";
import { MarkdownPreview } from "./MarkdownPreview";
import { bindEditorView } from "@/lib/ide/base64";
import { loadLanguage } from "@/lib/ide/languages";
import { isMarkdownName } from "@/lib/ide/markdown";
import { bindMarkdownScroll, scrollPreviewToLine } from "@/lib/ide/scroll-sync";
import { editorTheme } from "@/lib/ide/theme";
import { countText, useIde } from "@/lib/ide/store";

const langConf = new Compartment();
const wrapConf = new Compartment();
const tabConf = new Compartment();
const themeConf = new Compartment();

function syncEditorMeta(view: EditorView) {
  const doc = view.state.doc.toString();
  const main = view.state.selection.main;
  const selected = main.empty ? "" : view.state.sliceDoc(main.from, main.to);
  const whole = countText(doc);
  const sel = countText(selected);
  const line = view.state.doc.lineAt(main.head);
  const ide = useIde.getState();
  ide.setCounts({
    words: whole.words,
    chars: whole.chars,
    selWords: sel.words,
    selChars: sel.chars,
    hasSelection: !main.empty,
  });
  ide.setCursor({
    line: line.number,
    col: main.head - line.from + 1,
  });
}

function applyEditorSettings(
  view: EditorView,
  settings: { wordWrap: boolean; tabSize: number; theme: "dark" | "light" },
) {
  const spaces = " ".repeat(settings.tabSize);
  view.dispatch({
    effects: [
      wrapConf.reconfigure(settings.wordWrap ? EditorView.lineWrapping : []),
      tabConf.reconfigure([
        EditorState.tabSize.of(settings.tabSize),
        indentUnit.of(spaces),
      ]),
      themeConf.reconfigure(editorTheme(settings.theme)),
    ],
  });
}

function buildExtensions(
  tabId: string,
  settings: { wordWrap: boolean; tabSize: number; theme: "dark" | "light" },
) {
  const spaces = " ".repeat(settings.tabSize);
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightActiveLine(),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    rectangularSelection(),
    crosshairCursor(),
    highlightSelectionMatches(),
    history(),
    keymap.of([
      indentWithTab,
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
    ]),
    langConf.of([]),
    wrapConf.of(settings.wordWrap ? EditorView.lineWrapping : []),
    tabConf.of([EditorState.tabSize.of(settings.tabSize), indentUnit.of(spaces)]),
    themeConf.of(editorTheme(settings.theme)),
    EditorView.updateListener.of((vu) => {
      if (vu.docChanged) {
        useIde.getState().updateContent(tabId, vu.state.doc.toString());
      }
      if (vu.docChanged || vu.selectionSet) {
        syncEditorMeta(vu.view);
      }
    }),
  ];
}

export function EditorPane() {
  const parentRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const statesRef = useRef(new Map<string, EditorState>());
  const currentId = useRef<string | null>(null);
  const [previewPct, setPreviewPct] = useState(46);

  const tabId = useIde((s) => s.activeTabId);
  const tabName = useIde((s) => s.tabs.find((t) => t.id === s.activeTabId)?.name ?? "");
  const content = useIde(
    (s) => s.tabs.find((t) => t.id === s.activeTabId)?.content ?? "",
  );
  const hasTab = useIde((s) => s.tabs.some((t) => t.id === s.activeTabId));
  const settings = useIde((s) => s.settings);
  const previewOpen = useIde((s) => s.previewOpen);
  const reveal = useIde((s) => s.reveal);
  const showPreview = previewOpen && isMarkdownName(tabName);

  useEffect(() => {
    if (!parentRef.current) return;
    const view = new EditorView({
      parent: parentRef.current,
      state: EditorState.create({
        doc: "",
        extensions: buildExtensions("__empty__", useIde.getState().settings),
      }),
    });
    viewRef.current = view;
    bindEditorView(view);
    return () => {
      bindEditorView(null);
      view.destroy();
      viewRef.current = null;
      statesRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || !tabId) return;

    if (currentId.current && currentId.current !== tabId) {
      statesRef.current.set(currentId.current, view.state);
    }
    if (currentId.current === tabId) return;

    const cached = statesRef.current.get(tabId);
    const tab = useIde.getState().tabs.find((t) => t.id === tabId);
    if (!tab) return;

    if (cached) {
      view.setState(cached);
    } else {
      const state = EditorState.create({
        doc: tab.content,
        extensions: buildExtensions(tab.id, useIde.getState().settings),
      });
      statesRef.current.set(tab.id, state);
      view.setState(state);
    }
    currentId.current = tabId;
    applyEditorSettings(view, useIde.getState().settings);
    syncEditorMeta(view);
    void loadLanguage(tab.name).then((lang) => {
      const v = viewRef.current;
      if (!v || currentId.current !== tabId) return;
      v.dispatch({ effects: langConf.reconfigure(lang ?? []) });
    });
    view.focus();
  }, [tabId]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || !reveal) return;
    const doc = view.state.doc;
    const ln = Math.max(1, Math.min(doc.lines, reveal.line));
    const line = doc.line(ln);
    const col = Math.max(0, Math.min(line.length, reveal.col - 1));
    const pos = line.from + col;
    view.dispatch({
      selection: EditorSelection.cursor(pos),
      effects: EditorView.scrollIntoView(pos, { y: "start", yMargin: 8 }),
    });
    if (previewRef.current && showPreview) {
      scrollPreviewToLine(previewRef.current, ln);
    }
    view.focus();
    useIde.getState().clearReveal();
  }, [reveal, tabId]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || !tabId) return;
    void loadLanguage(tabName).then((lang) => {
      const v = viewRef.current;
      if (!v || currentId.current !== tabId) return;
      v.dispatch({ effects: langConf.reconfigure(lang ?? []) });
    });
  }, [tabName, tabId]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    applyEditorSettings(view, settings);
  }, [settings.wordWrap, settings.tabSize, settings.theme]);

  useEffect(() => {
    const view = viewRef.current;
    const preview = previewRef.current;
    if (!view || !preview || !showPreview) return;
    return bindMarkdownScroll(view, preview);
  }, [showPreview, tabId]);

  useEffect(() => {
    if (!showPreview) return;
    viewRef.current?.scrollDOM.dispatchEvent(new Event("scroll"));
  }, [content, showPreview, tabId]);

  if (!hasTab) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-subtle">
        Open a file or start a scratch buffer.
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden max-md:flex-col md:flex-row"
      style={{ ["--preview-pct" as string]: `${previewPct}%` }}
    >
      <div
        ref={parentRef}
        className={
          showPreview
            ? "min-h-0 min-w-0 flex-1 overflow-hidden"
            : "absolute inset-0 overflow-hidden"
        }
      />
      {showPreview && (
        <>
          <DragHandle
            axis="x"
            className="hidden md:block"
            onDrag={(delta) =>
              setPreviewPct((p) =>
                Math.min(70, Math.max(28, p - (delta / Math.max(window.innerWidth, 1)) * 100)),
              )
            }
          />
          <DragHandle
            axis="y"
            className="md:hidden"
            onDrag={(delta) =>
              setPreviewPct((p) =>
                Math.min(70, Math.max(28, p - (delta / Math.max(window.innerHeight, 1)) * 100)),
              )
            }
          />
          <MarkdownPreview content={content} scrollRef={previewRef} />
        </>
      )}
    </div>
  );
}
