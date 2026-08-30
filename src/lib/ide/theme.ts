import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import type { Extension } from "@codemirror/state";

/** VS Code Dark+ / Dark Modern token colors */
const darkHighlight = HighlightStyle.define([
  { tag: t.comment, color: "#6A9955", fontStyle: "italic" },
  { tag: t.lineComment, color: "#6A9955", fontStyle: "italic" },
  { tag: t.blockComment, color: "#6A9955", fontStyle: "italic" },
  { tag: t.docComment, color: "#6A9955", fontStyle: "italic" },
  { tag: t.keyword, color: "#569CD6" },
  { tag: t.definitionKeyword, color: "#569CD6" },
  { tag: t.modifier, color: "#569CD6" },
  { tag: t.controlKeyword, color: "#C586C0" },
  { tag: t.moduleKeyword, color: "#C586C0" },
  { tag: t.operatorKeyword, color: "#C586C0" },
  { tag: t.self, color: "#569CD6" },
  { tag: t.atom, color: "#569CD6" },
  { tag: t.literal, color: "#569CD6" },
  { tag: t.string, color: "#CE9178" },
  { tag: t.special(t.string), color: "#CE9178" },
  { tag: t.docString, color: "#CE9178" },
  { tag: t.character, color: "#CE9178" },
  { tag: t.regexp, color: "#D16969" },
  { tag: t.escape, color: "#D7BA7D" },
  { tag: t.number, color: "#B5CEA8" },
  { tag: t.integer, color: "#B5CEA8" },
  { tag: t.float, color: "#B5CEA8" },
  { tag: t.bool, color: "#569CD6" },
  { tag: t.null, color: "#569CD6" },
  { tag: t.variableName, color: "#9CDCFE" },
  { tag: t.special(t.variableName), color: "#4FC1FF" },
  { tag: t.constant(t.variableName), color: "#4FC1FF" },
  { tag: t.standard(t.variableName), color: "#9CDCFE" },
  { tag: t.definition(t.variableName), color: "#9CDCFE" },
  { tag: t.local(t.variableName), color: "#9CDCFE" },
  { tag: t.function(t.variableName), color: "#DCDCAA" },
  { tag: t.function(t.propertyName), color: "#DCDCAA" },
  { tag: t.propertyName, color: "#9CDCFE" },
  { tag: t.definition(t.propertyName), color: "#9CDCFE" },
  { tag: t.attributeName, color: "#9CDCFE" },
  { tag: t.typeName, color: "#4EC9B0" },
  { tag: t.className, color: "#4EC9B0" },
  { tag: t.namespace, color: "#4EC9B0" },
  { tag: t.macroName, color: "#4EC9B0" },
  { tag: t.labelName, color: "#C8C8C8" },
  { tag: t.tagName, color: "#569CD6" },
  { tag: t.angleBracket, color: "#808080" },
  { tag: t.operator, color: "#D4D4D4" },
  { tag: t.punctuation, color: "#D4D4D4" },
  { tag: t.bracket, color: "#FFD700" },
  { tag: t.squareBracket, color: "#FFD700" },
  { tag: t.paren, color: "#FFD700" },
  { tag: t.brace, color: "#FFD700" },
  { tag: t.meta, color: "#9CDCFE" },
  { tag: t.processingInstruction, color: "#569CD6" },
  { tag: t.heading, color: "#569CD6", fontWeight: "600" },
  { tag: t.heading1, color: "#569CD6", fontWeight: "700" },
  { tag: t.heading2, color: "#569CD6", fontWeight: "600" },
  { tag: t.link, color: "#569CD6", textDecoration: "underline" },
  { tag: t.url, color: "#569CD6", textDecoration: "underline" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strong, fontWeight: "700" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: t.monospace, color: "#CE9178" },
  { tag: t.unit, color: "#B5CEA8" },
  { tag: t.invalid, color: "#F44747" },
]);

/** VS Code Light+ / Light Modern token colors */
const lightHighlight = HighlightStyle.define([
  { tag: t.comment, color: "#008000", fontStyle: "italic" },
  { tag: t.lineComment, color: "#008000", fontStyle: "italic" },
  { tag: t.blockComment, color: "#008000", fontStyle: "italic" },
  { tag: t.keyword, color: "#0000FF" },
  { tag: t.definitionKeyword, color: "#0000FF" },
  { tag: t.modifier, color: "#0000FF" },
  { tag: t.controlKeyword, color: "#AF00DB" },
  { tag: t.moduleKeyword, color: "#AF00DB" },
  { tag: t.operatorKeyword, color: "#AF00DB" },
  { tag: t.self, color: "#0000FF" },
  { tag: t.string, color: "#A31515" },
  { tag: t.special(t.string), color: "#A31515" },
  { tag: t.regexp, color: "#811F3F" },
  { tag: t.number, color: "#098658" },
  { tag: t.bool, color: "#0000FF" },
  { tag: t.null, color: "#0000FF" },
  { tag: t.variableName, color: "#001080" },
  { tag: t.constant(t.variableName), color: "#0070C1" },
  { tag: t.function(t.variableName), color: "#795E26" },
  { tag: t.function(t.propertyName), color: "#795E26" },
  { tag: t.propertyName, color: "#001080" },
  { tag: t.attributeName, color: "#001080" },
  { tag: t.typeName, color: "#267F99" },
  { tag: t.className, color: "#267F99" },
  { tag: t.namespace, color: "#267F99" },
  { tag: t.tagName, color: "#800000" },
  { tag: t.operator, color: "#000000" },
  { tag: t.punctuation, color: "#000000" },
  { tag: t.heading, color: "#800000", fontWeight: "600" },
  { tag: t.link, color: "#0000FF", textDecoration: "underline" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strong, fontWeight: "700" },
  { tag: t.invalid, color: "#CD3131" },
]);

function chromeTheme(mode: "dark" | "light") {
  const isDark = mode === "dark";
  const sel = isDark ? "#264F78" : "#ADD6FF";
  const matching = isDark ? "rgba(255, 215, 0, 0.18)" : "rgba(0, 0, 0, 0.1)";
  return EditorView.theme(
    {
      "&": {
        color: "var(--color-fg)",
        backgroundColor: "transparent",
      },
      ".cm-content": {
        caretColor: "var(--color-fg)",
        color: "var(--color-fg)",
        padding: "8px 0",
        fontFamily: "var(--font-mono)",
      },
      ".cm-line": {
        color: "inherit",
      },
      ".cm-cursor, .cm-dropCursor": {
        borderLeftColor: "var(--color-fg)",
      },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
        {
          backgroundColor: sel,
        },
      ".cm-matchingBracket, .cm-nonmatchingBracket": {
        backgroundColor: matching,
        outline: "1px solid var(--color-border-strong)",
      },
      ".cm-gutters": {
        backgroundColor: "transparent",
        color: "var(--color-subtle)",
        border: "none",
      },
      ".cm-activeLineGutter": {
        color: "var(--color-fg)",
      },
      ".cm-foldPlaceholder": {
        backgroundColor: "transparent",
        border: "none",
        color: "var(--color-muted)",
      },
      ".cm-searchMatch": {
        backgroundColor: isDark ? "#613214" : "#FFA50066",
      },
      ".cm-searchMatch.cm-searchMatch-selected": {
        backgroundColor: isDark ? "#515C6A" : "#FFA500AA",
      },
    },
    { dark: isDark },
  );
}

export function editorTheme(mode: "dark" | "light"): Extension {
  return [
    chromeTheme(mode),
    syntaxHighlighting(mode === "dark" ? darkHighlight : lightHighlight),
  ];
}
