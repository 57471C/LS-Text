import { StreamLanguage } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { basename, extname } from "@/lib/utils";
import { dotenv } from "./dotenv";

const LANGUAGE_LABEL: Record<string, string> = {
  rs: "Rust",
  ts: "TypeScript",
  tsx: "TypeScript React",
  js: "JavaScript",
  jsx: "JavaScript React",
  mjs: "JavaScript",
  cjs: "JavaScript",
  py: "Python",
  json: "JSON",
  md: "Markdown",
  markdown: "Markdown",
  toml: "TOML",
  yaml: "YAML",
  yml: "YAML",
  html: "HTML",
  htm: "HTML",
  css: "CSS",
  scss: "CSS",
  sh: "Shell",
  bash: "Shell",
  zsh: "Shell",
  env: "Dotenv",
  txt: "Plain Text",
};

export function isEnvName(filename: string) {
  const base = basename(filename).toLowerCase();
  return (
    base === ".env" ||
    base === ".envrc" ||
    base.startsWith(".env.") ||
    base.endsWith(".env")
  );
}

export function languageLabel(filename: string) {
  if (isEnvName(filename)) return "Dotenv";
  const ext = extname(filename);
  return LANGUAGE_LABEL[ext] ?? (ext ? ext.toUpperCase() : "Plain Text");
}

export async function loadLanguage(filename: string): Promise<Extension | null> {
  if (isEnvName(filename)) return dotenv;

  const ext = extname(filename);
  try {
    switch (ext) {
      case "ts":
      case "tsx":
      case "mts":
      case "cts": {
        const { javascript } = await import("@codemirror/lang-javascript");
        return javascript({ typescript: true, jsx: ext === "tsx" });
      }
      case "js":
      case "jsx":
      case "mjs":
      case "cjs": {
        const { javascript } = await import("@codemirror/lang-javascript");
        return javascript({ jsx: ext === "jsx" });
      }
      case "py": {
        const { python } = await import("@codemirror/lang-python");
        return python();
      }
      case "rs": {
        const { rust } = await import("@codemirror/lang-rust");
        return rust();
      }
      case "json": {
        const { json } = await import("@codemirror/lang-json");
        return json();
      }
      case "md":
      case "markdown": {
        const { markdown } = await import("@codemirror/lang-markdown");
        return markdown();
      }
      case "html":
      case "htm": {
        const { html } = await import("@codemirror/lang-html");
        return html();
      }
      case "css":
      case "scss": {
        const { css } = await import("@codemirror/lang-css");
        return css();
      }
      case "yaml":
      case "yml": {
        const { yaml } = await import("@codemirror/lang-yaml");
        return yaml();
      }
      case "toml": {
        const { toml } = await import("@codemirror/legacy-modes/mode/toml");
        return StreamLanguage.define(toml);
      }
      case "sh":
      case "bash":
      case "zsh": {
        const { shell } = await import("@codemirror/legacy-modes/mode/shell");
        return StreamLanguage.define(shell);
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}
