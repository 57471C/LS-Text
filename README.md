# LS.Text

Fast local scratchpad from [Lean.Studio](https://lean.studio). Instant boot, CodeMirror 6, lazy file tree, markdown preview, Ghostty-first terminal launcher.

**Not** the process suite (TimeStudy / Mapper / Stats). It is the open-source notepad you open when you do not want a dump in the IDE or the OS editor.

- Identifier: `com.leanstudio.lstext`
- Version: `0.1.2`
- License: [MIT](LICENSE)
- Stack: Tauri v2 · React 19 · Vite · Tailwind · CodeMirror 6

## Features

- Scratch buffers that boot empty and ready to type
- Open a real folder on disk (native build) or via File System Access in Chrome / Edge
- Lazy explorer — folders load when you expand them
- Tabs with dirty dots; close and quit warn if a buffer is unsaved
- Autosave for named files (500ms after you stop typing)
- Syntax on demand: Rust, TypeScript / JS (incl. JSX), Python, JSON, Markdown, TOML, YAML, HTML, CSS, Shell, `.env`
- Dark Modern and Light Modern themes (Light+ token colours)
- Markdown split preview with heading outline and line-mapped scroll sync (`Mod+Shift+V`)
- Workspace search (`Mod+Shift+F`) and command palette / file jump (`Mod+P`)
- Go to line (`Mod+G`), font size bump (`Mod+=` / `Mod+-` / `Mod+0`)
- Word and selection count in the status bar
- Drop files or a folder onto the window to import / open
- Base64 encode or decode the selection (`Mod+Shift+B`)
- External terminal: Ghostty if present, else Alacritty, Kitty, Terminal.app, Windows Terminal, or PowerShell
- Last opened folder and editor settings persist; buffer contents do not
- Desktop auto-update from `https://lean.studio/lstext/latest.json`

Untitled buffers stay scratch until **Save As** puts them on a path under the project folder.

## Desktop (Tauri v2)

Needs [Rust](https://rustup.rs) (1.77+) and Node 20+.

```bash
npm install
npm run tauri:dev
```

Release installers:

```bash
npm run tauri:build
```

Artifacts land in `src-tauri/target/release/bundle/` (`.dmg` / `.msi` / `.AppImage`).

Tagged releases (`v*`) are built by GitHub Actions for Windows x64, Linux x64, and macOS Apple Silicon. When `TAURI_SIGNING_*` secrets are set, updater payloads and `latest.json` are published with the draft release.

## Browser

```bash
npm install
npm run dev
```

The browser build is a virtual scratchpad. Chrome / Edge can open a real folder. Drop files onto the window to import them. The integrated terminal panel is a preview stand-in; the native build launches a real emulator.

## Shortcuts

| Action | Binding |
| --- | --- |
| Save | Mod+S |
| Close tab | Mod+W |
| Quick jump | Mod+P |
| New scratch | Mod+N |
| Open folder | Mod+O |
| Toggle explorer | Mod+B |
| Markdown preview | Mod+Shift+V |
| Search workspace | Mod+Shift+F |
| Reopen closed tab | Mod+Shift+T |
| Toggle Base64 | Mod+Shift+B |
| Go to line | Mod+G |
| Larger / smaller text | Mod+= / Mod+- |
| Reset text size | Mod+0 |
| External terminal | Mod+` |
| Settings | Mod+, |
| Find in file | Mod+F |

Mod is ⌘ on macOS and Ctrl elsewhere.

## Settings

Theme, font size (11–24px), tab width (2 / 4 / 8), word wrap, markdown preview, and autosave live in Settings (`Mod+,`). The status bar also exposes font size and line / column (click it for go-to-line).
