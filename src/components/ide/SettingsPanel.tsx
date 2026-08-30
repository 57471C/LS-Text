import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useIde } from "@/lib/ide/store";
import { Button } from "@/components/ui/button";
import { modLabel } from "@/lib/utils";

export function SettingsPanel() {
  const open = useIde((s) => s.settingsOpen);
  const settings = useIde((s) => s.settings);
  const previewOpen = useIde((s) => s.previewOpen);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-bg/50"
      onMouseDown={() => useIde.getState().toggleSettings()}
    >
      <aside
        className="flex h-full w-full max-w-sm flex-col border-l border-border bg-elevated shadow-(--shadow-float)"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex h-12 items-center justify-between border-b border-border px-4">
          <h2 className="text-sm font-medium text-fg">Settings</h2>
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-md text-muted hover:bg-tab-active hover:text-fg"
            onClick={() => useIde.getState().toggleSettings()}
            aria-label="Close settings"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="flex flex-col gap-6 overflow-auto p-5">
          <Field label="Theme">
            <select
              className="h-10 w-full rounded-md border border-border bg-bg px-2 text-sm text-fg"
              value={settings.theme}
              onChange={(e) =>
                useIde.getState().setSettings({
                  theme: e.target.value as "dark" | "light",
                })
              }
            >
              <option value="dark">Dark Modern</option>
              <option value="light">Light Modern</option>
            </select>
          </Field>
          <Field label={`Editor font size  ·  ${settings.fontSize}px`}>
            <input
              type="range"
              min={11}
              max={24}
              value={settings.fontSize}
              onChange={(e) =>
                useIde.getState().setSettings({ fontSize: Number(e.target.value) })
              }
              className="w-full accent-accent"
            />
            <span className="text-xs text-subtle">
              {modLabel()}+ and {modLabel()}+− bump size · {modLabel()}+0 resets
            </span>
          </Field>
          <Field label="Tab size">
            <div className="flex gap-2">
              {([2, 4, 8] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => useIde.getState().setSettings({ tabSize: n })}
                  className={`h-9 flex-1 rounded-md border text-sm ${
                    settings.tabSize === n
                      ? "border-accent bg-accent text-accent-fg"
                      : "border-border text-muted hover:text-fg"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </Field>
          <Toggle
            label="Word wrap"
            checked={settings.wordWrap}
            onChange={(wordWrap) => useIde.getState().setSettings({ wordWrap })}
          />
          <Toggle
            label="Markdown preview"
            hint="Side-by-side for .md files, scroll-synced"
            checked={previewOpen}
            onChange={() => useIde.getState().togglePreview()}
          />
          <Toggle
            label="Auto-save"
            hint="Writes named files after 500ms"
            checked={settings.autoSave}
            onChange={(autoSave) => useIde.getState().setSettings({ autoSave })}
          />
          <div className="border-t border-border pt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => void useIde.getState().resetWorkspace()}
            >
              Restore sample workspace
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2 text-sm text-fg">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-3 text-left"
    >
      <span>
        <span className="block text-sm text-fg">{label}</span>
        {hint ? <span className="block text-xs text-subtle">{hint}</span> : null}
      </span>
      <span
        className={`relative h-6 w-10 rounded-full transition-colors ${
          checked ? "bg-accent" : "bg-border-strong"
        }`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-bg transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}
