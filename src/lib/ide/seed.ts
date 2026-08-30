import type { VirtualSnapshot } from "./types";

const README = `# LS.Text

A blisteringly fast scratchpad. Type immediately — this buffer and the
files in the tree live in your browser until you open a real folder.

## Shortcuts

| Action              | Binding            |
| ------------------- | ------------------ |
| Save                | Mod+S              |
| Close tab           | Mod+W              |
| Quick jump          | Mod+P              |
| New scratch         | Mod+N              |
| Open folder         | Mod+O              |
| Toggle explorer     | Mod+B              |
| Markdown preview    | Mod+Shift+V        |
| Search workspace    | Mod+Shift+F        |
| Reopen closed tab   | Mod+Shift+T        |
| Zen mode            | Mod+K then Z       |
| Larger / smaller    | Mod+= / Mod+-      |
| Reset text size     | Mod+0              |
| Toggle terminal     | Mod+\`             |
| Settings            | Mod+,              |
| Find in file        | Mod+F              |
| Go to line          | Mod+G              |

Mod is ⌘ on macOS and Ctrl elsewhere.

## Preview

Markdown files open in a split: source on the left, rendered preview on
the right. Scroll either pane and the other follows — headings stay
lined up, rather than drifting by percentage.

Toggle the split with **Mod+Shift+V**, the columns button on the tab
bar, or Settings.

## Workspace

The sample project on the left is a virtual scratchpad. Open a real
folder (Chrome / Edge) to edit files on disk. In the native desktop
build, the chevron launches Ghostty, Windows Terminal, or the system
fallback in the active directory.

## What stays light

- CodeMirror 6, grammars loaded on demand
- Lazy file tree — folders expand when you click them
- Autosave for named files, 500ms after you stop typing
- Session restore in the browser (tabs, tree, settings)

\`\`\`rust
fn main() {
    let name = "LS.Text";
    println!("{name} is ready.");
}
\`\`\`

## Notes

Scratchpads are for the thought you do not want to lose while a heavy
IDE is still booting. Keep the file, ship the script, close the window.

If the preview gets in the way, hide it. The editor is still a full
buffer: search, fold, indent, done.
`;

const HELLO_RS = `fn main() {
    let name = "LS.Text";
    println!("{name} is ready.");
    println!("scratch → script → ship");
}

#[cfg(test)]
mod tests {
    #[test]
    fn boots() {
        assert!(true);
    }
}
`;

const MAIN_TS = `type Buffer = {
  path: string;
  dirty: boolean;
  language: string;
};

export function nextUntitled(existing: string[]): string {
  let n = 1;
  while (existing.includes(\`untitled-\${n}\`)) n += 1;
  return \`untitled-\${n}\`;
}

export function boot(buffers: Buffer[]) {
  const scratch: Buffer = {
    path: "untitled-1",
    dirty: false,
    language: "plaintext",
  };
  return [scratch, ...buffers];
}

console.log("LS.Text · cold boot", boot([]));
`;

const SCRIPT_PY = `from pathlib import Path

ROOT = Path("scratchpad")


def list_scratch(root: Path = ROOT) -> list[str]:
    """Return file names, shallow. The editor lazy-loads children."""
    if not root.exists():
        return []
    return sorted(p.name for p in root.iterdir())


if __name__ == "__main__":
    print("files:", ", ".join(list_scratch()) or "(empty)")
`;

const CARGO = `[package]
name = "ls-text-scratch"
version = "0.1.0"
edition = "2021"

[dependencies]
`;

const CONFIG_YAML = `app: ls-text
theme: dark-modern
editor:
  fontSize: 13
  tabSize: 2
  wordWrap: false
`;

const NOTES_JSON = `{
  "name": "LS.Text",
  "kind": "scratchpad",
  "buffers": ["untitled-1"]
}
`;

const DOTENV = `# Local scratch secrets — do not commit
export APP_NAME=LS.Text
PORT=8080
THEME="dark-modern"
DATABASE_URL=postgres://localhost/scratch
GHOSTTY_BIN=\${HOME}/.local/bin/ghostty
DEBUG=true
`;

const GITIGNORE = `target/
node_modules/
dist/
.DS_Store
`;
const RUN_SH = `#!/usr/bin/env bash
set -euo pipefail
echo "LS.Text scratchpad"
ls -1
`;

const INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>LS.Text</title>
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body>
    <main>
      <h1>LS.Text</h1>
      <p>Scratch fast. Ship when it is real.</p>
    </main>
  </body>
</html>
`;

const STYLE_CSS = `:root {
  color-scheme: dark;
  font-family: "IBM Plex Sans", system-ui, sans-serif;
  background: #1f1f1f;
  color: #cccccc;
}

main {
  max-width: 40rem;
  margin: 4rem auto;
  padding: 0 1.5rem;
}
`;

export function createSeedSnapshot(): VirtualSnapshot {
  const root = "/scratchpad";
  return {
    name: "scratchpad",
    rootPath: root,
    dirs: [root, `${root}/src`, `${root}/web`],
    files: {
      [`${root}/README.md`]: README,
      [`${root}/hello.rs`]: HELLO_RS,
      [`${root}/Cargo.toml`]: CARGO,
      [`${root}/config.yaml`]: CONFIG_YAML,
      [`${root}/notes.json`]: NOTES_JSON,
      [`${root}/.gitignore`]: GITIGNORE,
      [`${root}/.env`]: DOTENV,
      [`${root}/run.sh`]: RUN_SH,
      [`${root}/src/main.ts`]: MAIN_TS,
      [`${root}/src/script.py`]: SCRIPT_PY,
      [`${root}/web/index.html`]: INDEX_HTML,
      [`${root}/web/style.css`]: STYLE_CSS,
    },
  };
}
