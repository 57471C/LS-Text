import type { EditorSettings } from "./types";
import { FONT_DEFAULT } from "./store";

export const EDITOR_SETTING_DEFAULTS: Pick<
  EditorSettings,
  "lineNumbers" | "highlightActiveLine" | "highlightSelectionMatches"
> = {
  lineNumbers: true,
  highlightActiveLine: true,
  highlightSelectionMatches: true,
};

export function withEditorDefaults(settings: EditorSettings): EditorSettings {
  return {
    lineNumbers: true,
    highlightActiveLine: true,
    highlightSelectionMatches: true,
    ...settings,
    fontSize: settings.fontSize || FONT_DEFAULT,
  };
}
