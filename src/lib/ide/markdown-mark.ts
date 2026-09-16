import { Decoration, EditorView, MatchDecorator, ViewPlugin } from "@codemirror/view";

const deco = Decoration.mark({ class: "cm-md-mark" });

const decorator = new MatchDecorator({
  regexp: /==([^=\n]+)==/g,
  decoration: deco,
});

/** Editor highlight for ==marked== text (not part of GFM / default lang-markdown). */
export const markdownMarkHighlight = ViewPlugin.define(
  (view) => ({
    decorations: decorator.createDeco(view),
    update(u) {
      this.decorations = decorator.updateDeco(u, this.decorations);
    },
  }),
  { decorations: (v) => v.decorations },
);
