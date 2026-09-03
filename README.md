# LS.Text

Fast local scratchpad from [Lean.Studio](https://lean.studio). Instant boot, CodeMirror 6, lazy file tree, markdown preview, Ghostty-first terminal launcher.

**Not** the process suite (TimeStudy / Mapper / Stats). It is the open-source notepad you open when you do not want a dump in the IDE or the OS editor.

- Identifier: `com.leanstudio.lstext`
- License: MIT

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

Open Folder talks to the real disk. Last opened folder is remembered; buffers are not. The launcher prefers **Ghostty**, then Alacritty, Kitty, Terminal.app, Windows Terminal, or PowerShell.

Untitled buffers are scratch. Use **Save As** before they become a path under a project folder. Quit is blocked while a buffer is dirty.

## Browser

```bash
npm install
npm run dev
```

The browser build is a virtual scratchpad. Chrome / Edge can open a real folder via the File System Access API. Drop files onto the window to import them.

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
| Go to line | Mod+G |
| Larger / smaller text | Mod+= / Mod+- |
| Reset text size | Mod+0 |
| External terminal | Mod+` |
| Settings | Mod+, |
| Find in file | Mod+F |

Mod is ⌘ on macOS and Ctrl elsewhere.
