import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIde } from "@/lib/ide/store";
import { basename } from "@/lib/utils";

const COPY: Record<string, { title: string; action: string; danger?: boolean }> = {
  "new-file": { title: "New file", action: "Create" },
  "new-folder": { title: "New folder", action: "Create" },
  rename: { title: "Rename", action: "Rename" },
  delete: { title: "Delete", action: "Delete", danger: true },
  "save-as": { title: "Save as", action: "Save" },
  "close-dirty": { title: "Unsaved changes", action: "Save" },
  "goto-line": { title: "Go to line", action: "Go" },
};

export function PromptDialog() {
  const prompt = useIde((s) => s.prompt);
  const inputRef = useRef<HTMLInputElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!prompt) return;
    if (prompt.kind === "close-dirty") saveRef.current?.focus();
    else inputRef.current?.select();
  }, [prompt]);

  if (!prompt) return null;
  const copy = COPY[prompt.kind] ?? { title: "Confirm", action: "OK" };
  const dirtyName = prompt.value || basename(prompt.path);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/60 px-4"
      onMouseDown={() => useIde.getState().closePrompt()}
    >
      <form
        className="w-full max-w-sm rounded-xl border border-border bg-elevated p-4 shadow-(--shadow-float)"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (prompt.kind === "close-dirty") {
            void useIde.getState().saveAndClose();
            return;
          }
          void useIde.getState().submitPrompt(inputRef.current?.value);
        }}
      >
        <h2 className="text-sm font-medium text-fg">{copy.title}</h2>
        {prompt.kind === "delete" ? (
          <p className="mt-2 text-sm text-muted text-pretty">
            Delete <span className="text-fg">{basename(prompt.path)}</span>? This cannot be undone.
          </p>
        ) : prompt.kind === "close-dirty" ? (
          <p className="mt-2 text-sm text-muted text-pretty">
            <span className="text-fg">{dirtyName}</span> has unsaved changes. Save
            before closing?
          </p>
        ) : (
          <Input
            ref={inputRef}
            className="mt-3"
            defaultValue={prompt.value ?? ""}
            autoFocus
            inputMode={prompt.kind === "goto-line" ? "numeric" : undefined}
            aria-label={copy.title}
          />
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => useIde.getState().closePrompt()}>
            Cancel
          </Button>
          {prompt.kind === "close-dirty" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => useIde.getState().discardAndClose()}
            >
              Don't save
            </Button>
          )}
          <Button
            ref={saveRef}
            type="submit"
            size="sm"
            variant={copy.danger ? "danger" : "default"}
          >
            {copy.action}
          </Button>
        </div>
      </form>
    </div>
  );
}
