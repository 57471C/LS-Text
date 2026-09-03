export type FsKind = "virtual" | "native";

export type NodeKind = "file" | "dir";

export interface DirEntry {
  name: string;
  path: string;
  kind: NodeKind;
}

export interface Tab {
  id: string;
  path: string;
  name: string;
  content: string;
  originalContent: string;
  isUntitled: boolean;
  language: string;
}

export interface EditorSettings {
  fontSize: number;
  tabSize: 2 | 4 | 8;
  wordWrap: boolean;
  autoSave: boolean;
  theme: "dark" | "light";
}

export interface CursorPos {
  line: number;
  col: number;
}

export interface TextCounts {
  words: number;
  chars: number;
  selWords: number;
  selChars: number;
  hasSelection: boolean;
}

export interface RevealPos {
  line: number;
  col: number;
  nonce: number;
}

export type PromptKind =
  | "new-file"
  | "new-folder"
  | "rename"
  | "delete"
  | "save-as"
  | "close-dirty"
  | "goto-line";

export interface PromptState {
  kind: PromptKind;
  path: string;
  value?: string;
  tabId?: string;
  closeAfter?: boolean;
}

export interface FileSystemAdapter {
  kind: FsKind;
  name: string;
  rootPath: string;
  list(path: string): Promise<DirEntry[]>;
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  remove(path: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  listAllFiles(): Promise<string[]>;
  snapshot?(): VirtualSnapshot;
}

export interface VirtualSnapshot {
  name: string;
  rootPath: string;
  files: Record<string, string>;
  dirs: string[];
}

export interface SessionDump {
  version: 1 | 2;
  /** Ignored on load — cold start is always a fresh untitled buffer. */
  tabs?: Tab[];
  activeTabId?: string | null;
  expandedDirs?: string[];
  explorerOpen: boolean;
  terminalOpen?: boolean;
  previewOpen?: boolean;
  settings: EditorSettings;
  terminalCwd?: string;
  virtual?: VirtualSnapshot;
  workspaceKind: FsKind;
  workspaceName: string;
  workspacePath?: string;
}
