import { useEffect, useRef, useState } from "react";
import { promptOf, runShell, type ShellState } from "@/lib/ide/terminal-engine";
import { useIde } from "@/lib/ide/store";

interface Line {
  kind: "in" | "out" | "sys";
  text: string;
}

export function TerminalPanel() {
  const fs = useIde((s) => s.fs);
  const cwd = useIde((s) => s.terminalCwd);
  const notice = useIde((s) => s.terminalNotice);
  const home = fs.rootPath;
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [lines, setLines] = useState<Line[]>([
    { kind: "sys", text: "LS.Text integrated shell  ·  bound to the workspace" },
    {
      kind: "sys",
      text: "Native build launches Ghostty / Windows Terminal. Type help for commands.",
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cwdRef = useRef(cwd);
  cwdRef.current = cwd;

  useEffect(() => {
    if (notice) {
      setLines((prev) => [...prev, { kind: "sys", text: notice }]);
    }
  }, [notice]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [lines]);

  const state = (): ShellState => ({ cwd: cwdRef.current, home });

  const submit = async (raw: string) => {
    const value = raw;
    setInput("");
    setHistIdx(-1);
    if (value.trim()) setHistory((h) => [...h, value]);
    setLines((prev) => [...prev, { kind: "in", text: `${promptOf(state())} ${value}` }]);
    const result = await runShell(value, state(), useIde.getState().fs);
    if (result.clear) {
      setLines([]);
    } else if (result.lines.length) {
      setLines((prev) => [...prev, ...result.lines.map((text) => ({ kind: "out" as const, text }))]);
    }
    if (result.cwd !== cwdRef.current) {
      useIde.getState().setTerminalCwd(result.cwd);
    }
    void useIde.getState().refreshDir(useIde.getState().fs.rootPath);
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col bg-activity"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-[11px] font-medium tracking-wide text-muted uppercase">
          Terminal
        </span>
        <span className="font-mono text-[10px] text-subtle">{cwd}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-3 py-2 font-mono text-[12px] leading-relaxed">
        {lines.map((line, i) => (
          <div
            key={i}
            className={
              line.kind === "sys"
                ? "text-subtle"
                : line.kind === "in"
                  ? "text-fg"
                  : "text-muted"
            }
          >
            {line.text || "\u00a0"}
          </div>
        ))}
        <form
          className="flex items-center gap-2 text-fg"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(input);
          }}
        >
          <span className="shrink-0 text-muted">{promptOf(state())}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp") {
                e.preventDefault();
                const next = histIdx < 0 ? history.length - 1 : histIdx - 1;
                if (next >= 0) {
                  setHistIdx(next);
                  setInput(history[next] ?? "");
                }
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                if (histIdx < 0) return;
                const next = histIdx + 1;
                if (next >= history.length) {
                  setHistIdx(-1);
                  setInput("");
                } else {
                  setHistIdx(next);
                  setInput(history[next] ?? "");
                }
              } else if (e.key === "c" && e.ctrlKey) {
                e.preventDefault();
                setInput("");
                setLines((prev) => [...prev, { kind: "in", text: `${promptOf(state())} ^C` }]);
              } else if (e.key === "l" && e.ctrlKey) {
                e.preventDefault();
                setLines([]);
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-fg outline-none"
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Terminal input"
          />
        </form>
        <div ref={endRef} />
      </div>
    </div>
  );
}
