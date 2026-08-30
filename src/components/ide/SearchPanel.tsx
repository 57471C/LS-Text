import { useEffect, useMemo, useRef, useState } from "react";
import { useIde } from "@/lib/ide/store";
import { searchWorkspace, type SearchHit } from "@/lib/ide/search";
import { modLabel } from "@/lib/utils";

export function SearchPanel() {
  const open = useIde((s) => s.searchOpen);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [active, setActive] = useState(0);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mod = modLabel();

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHits([]);
    setActive(0);
    const t = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const handle = window.setTimeout(() => {
      const s = useIde.getState();
      void searchWorkspace(
        q,
        caseSensitive,
        s.tabs.map((t) => ({ path: t.path, content: t.content })),
        () => s.allFiles(),
        (path) => s.fs.read(path),
      ).then((next) => {
        if (cancelled) return;
        setHits(next);
        setActive(0);
        setSearching(false);
      });
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query, caseSensitive, open]);

  const grouped = useMemo(() => {
    const map = new Map<string, SearchHit[]>();
    for (const hit of hits) {
      const list = map.get(hit.path) ?? [];
      list.push(hit);
      map.set(hit.path, list);
    }
    return [...map.entries()];
  }, [hits]);

  if (!open) return null;

  const jump = (hit: SearchHit) => {
    void useIde.getState().jumpTo(hit.path, hit.line, hit.col);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-bg/60 px-3 pt-[10vh]"
      onMouseDown={() => useIde.getState().toggleSearch(false)}
    >
      <div
        className="flex w-full max-w-xl flex-col overflow-hidden rounded-xl border border-border bg-elevated shadow-(--shadow-float)"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Search workspace"
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search in workspace…"
            className="h-12 min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-subtle"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(hits.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter" && hits[active]) {
                e.preventDefault();
                jump(hits[active]!);
              } else if (e.key === "Escape") {
                e.preventDefault();
                useIde.getState().toggleSearch(false);
              }
            }}
          />
          <button
            type="button"
            className={`h-7 rounded-md px-2 font-mono text-[11px] ${
              caseSensitive
                ? "bg-accent text-accent-fg"
                : "text-muted hover:text-fg"
            }`}
            aria-pressed={caseSensitive}
            title="Match case"
            onClick={() => setCaseSensitive((v) => !v)}
          >
            Aa
          </button>
        </div>
        <div className="max-h-[50vh] overflow-auto p-1">
          {query.trim().length < 2 ? (
            <p className="px-3 py-6 text-center text-sm text-subtle">
              Type two or more characters. {mod}+Shift+F
            </p>
          ) : searching ? (
            <p className="px-3 py-6 text-center text-sm text-subtle">Searching…</p>
          ) : hits.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-subtle">No matches.</p>
          ) : (
            grouped.map(([path, group]) => (
              <div key={path} className="mb-1">
                <p className="px-2 py-1 font-mono text-[11px] text-subtle">{group[0]?.name}</p>
                {group.map((hit) => {
                  const index = hits.indexOf(hit);
                  return (
                    <button
                      key={`${hit.path}:${hit.line}:${hit.col}`}
                      type="button"
                      onClick={() => jump(hit)}
                      onMouseEnter={() => setActive(index)}
                      className={`flex w-full items-baseline gap-3 rounded-md px-2 py-1.5 text-left text-sm ${
                        index === active ? "bg-tab-active text-fg" : "text-fg"
                      }`}
                    >
                      <span className="w-8 shrink-0 text-right font-mono text-[11px] text-subtle">
                        {hit.line}
                      </span>
                      <Snippet text={hit.text} query={query} caseSensitive={caseSensitive} />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        {hits.length > 0 && (
          <p className="border-t border-border px-3 py-1.5 font-mono text-[11px] text-subtle">
            {hits.length} match{hits.length === 1 ? "" : "es"}
          </p>
        )}
      </div>
    </div>
  );
}

function Snippet({
  text,
  query,
  caseSensitive,
}: {
  text: string;
  query: string;
  caseSensitive: boolean;
}) {
  const q = query.trim();
  const hay = caseSensitive ? text : text.toLowerCase();
  const needle = caseSensitive ? q : q.toLowerCase();
  const at = hay.indexOf(needle);
  if (at < 0) return <span className="min-w-0 truncate">{text}</span>;
  return (
    <span className="min-w-0 truncate">
      {text.slice(0, at)}
      <mark className="rounded-sm bg-accent/25 text-fg">{text.slice(at, at + q.length)}</mark>
      {text.slice(at + q.length)}
    </span>
  );
}
