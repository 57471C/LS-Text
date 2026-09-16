import { useIde } from "./store";

export const LANGUAGE_CHOICES = [
  "Plain Text",
  "Markdown",
  "Python",
  "SQL",
  "JSON",
  "JavaScript",
  "TypeScript",
  "HTML",
  "CSS",
  "YAML",
  "TOML",
  "Rust",
  "Shell",
  "Dotenv",
] as const;

const FILE_FOR_LABEL: Record<string, string> = {
  "Plain Text": "scratch.txt",
  Markdown: "scratch.md",
  Python: "scratch.py",
  SQL: "scratch.sql",
  JSON: "scratch.json",
  JavaScript: "scratch.js",
  TypeScript: "scratch.ts",
  "TypeScript React": "scratch.tsx",
  "JavaScript React": "scratch.jsx",
  HTML: "scratch.html",
  CSS: "scratch.css",
  YAML: "scratch.yaml",
  TOML: "scratch.toml",
  Rust: "scratch.rs",
  Shell: "scratch.sh",
  Dotenv: ".env",
};

export function fileForLanguage(language: string, fallback = "scratch.txt") {
  return FILE_FOR_LABEL[language] ?? fallback;
}

export function setActiveLanguage(language: string) {
  const s = useIde.getState();
  const id = s.activeTabId;
  if (!id) return;
  useIde.setState({
    tabs: s.tabs.map((t) => (t.id === id ? { ...t, language } : t)),
    status: language,
  });
  s.persistNow();
}
