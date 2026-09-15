import { FileText, Folder, FolderOpen } from "lucide-react";
import { basename, extname } from "@/lib/utils";

const ICONS: Record<string, { label: string; bg: string; fg: string }> = {
  ts: { label: "TS", bg: "#3178c6", fg: "#fff" },
  tsx: { label: "TX", bg: "#3178c6", fg: "#fff" },
  mts: { label: "TS", bg: "#3178c6", fg: "#fff" },
  cts: { label: "TS", bg: "#3178c6", fg: "#fff" },
  js: { label: "JS", bg: "#f7df1e", fg: "#1e1e1e" },
  jsx: { label: "JX", bg: "#f7df1e", fg: "#1e1e1e" },
  mjs: { label: "JS", bg: "#f7df1e", fg: "#1e1e1e" },
  cjs: { label: "JS", bg: "#f7df1e", fg: "#1e1e1e" },
  json: { label: "{}", bg: "#cbcb41", fg: "#1e1e1e" },
  jsonc: { label: "{}", bg: "#cbcb41", fg: "#1e1e1e" },
  html: { label: "<>", bg: "#e34c26", fg: "#fff" },
  htm: { label: "<>", bg: "#e34c26", fg: "#fff" },
  css: { label: "#", bg: "#563d7c", fg: "#fff" },
  scss: { label: "#", bg: "#c6538c", fg: "#fff" },
  md: { label: "MD", bg: "#083fa1", fg: "#fff" },
  markdown: { label: "MD", bg: "#083fa1", fg: "#fff" },
  py: { label: "PY", bg: "#3572a5", fg: "#fff" },
  rs: { label: "RS", bg: "#dea584", fg: "#1e1e1e" },
  sql: { label: "Q", bg: "#e38c00", fg: "#1e1e1e" },
  yml: { label: "Y", bg: "#cb171e", fg: "#fff" },
  yaml: { label: "Y", bg: "#cb171e", fg: "#fff" },
  toml: { label: "T", bg: "#9c4221", fg: "#fff" },
  sh: { label: ">_", bg: "#89e051", fg: "#1e1e1e" },
  bash: { label: ">_", bg: "#89e051", fg: "#1e1e1e" },
  zsh: { label: ">_", bg: "#89e051", fg: "#1e1e1e" },
  env: { label: "$", bg: "#e6db74", fg: "#1e1e1e" },
  txt: { label: "TXT", bg: "#8091a5", fg: "#fff" },
  text: { label: "TXT", bg: "#8091a5", fg: "#fff" },
  log: { label: "LOG", bg: "#8091a5", fg: "#fff" },
};

function specialKind(name: string): { label: string; bg: string; fg: string } | null {
  const base = basename(name).toLowerCase();
  if (base === ".gitignore" || base === ".gitattributes" || base === ".gitmodules") {
    return { label: "GI", bg: "#f05032", fg: "#fff" };
  }
  if (base === "license" || base === "licence" || base.startsWith("license.")) {
    return { label: "©", bg: "#d0b344", fg: "#1e1e1e" };
  }
  if (base === "dockerfile") return { label: "DK", bg: "#2496ed", fg: "#fff" };
  if (base.endsWith(".lock") || base === "package-lock.json" || base === "pnpm-lock.yaml") {
    return { label: "LK", bg: "#a3a3a3", fg: "#1e1e1e" };
  }
  return null;
}

function Badge({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span
      className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-[3px] text-[7px] font-bold tracking-tight"
      style={{ backgroundColor: bg, color: fg }}
      aria-hidden
    >
      {label}
    </span>
  );
}

export function FileIcon({
  name,
  kind,
  open,
}: {
  name: string;
  kind: "file" | "dir";
  open?: boolean;
}) {
  if (kind === "dir") {
    const Icon = open ? FolderOpen : Folder;
    return <Icon className="size-3.5 shrink-0 text-[#dcb67a]" strokeWidth={1.6} />;
  }
  const special = specialKind(name);
  if (special) return <Badge {...special} />;
  const hit = ICONS[extname(name)];
  if (hit) return <Badge {...hit} />;
  return <FileText className="size-3.5 shrink-0 text-muted" strokeWidth={1.6} />;
}
