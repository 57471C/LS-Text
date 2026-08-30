export interface DroppedFile {
  relativePath: string;
  text: string;
}

const SKIP = new Set([".ds_store", "thumbs.db", "node_modules", ".git"]);
const MAX_FILES = 80;
const MAX_BYTES = 1_500_000;
const MAX_DEPTH = 8;

function skipName(name: string) {
  const n = name.toLowerCase();
  return SKIP.has(n) || n.endsWith(".app");
}

function looksBinary(type: string, text: string) {
  if (/^(image|audio|video|font)\//.test(type)) return true;
  if (/application\/(pdf|zip|octet-stream)/.test(type)) return true;
  return text.includes("\0");
}

export async function readDataTransfer(dt: DataTransfer): Promise<{
  directoryHandle: FileSystemDirectoryHandle | null;
  files: DroppedFile[];
}> {
  const files: DroppedFile[] = [];
  let directoryHandle: FileSystemDirectoryHandle | null = null;
  const items = [...dt.items];

  for (const item of items) {
    if (item.kind !== "file") continue;
    const handleFn = (
      item as DataTransferItem & {
        getAsFileSystemHandle?: () => Promise<FileSystemHandle | null>;
      }
    ).getAsFileSystemHandle;
    if (handleFn) {
      try {
        const handle = await handleFn.call(item);
        if (handle?.kind === "directory" && !directoryHandle) {
          directoryHandle = handle as FileSystemDirectoryHandle;
          continue;
        }
        if (handle?.kind === "file") {
          const file = await (handle as FileSystemFileHandle).getFile();
          const dropped = await fileToDropped(file, file.name);
          if (dropped) files.push(dropped);
          continue;
        }
      } catch {
        /* fall through */
      }
    }
    const entryFn = (
      item as DataTransferItem & {
        webkitGetAsEntry?: () => FileSystemEntry | null;
      }
    ).webkitGetAsEntry;
    const entry = entryFn?.call(item) ?? null;
    if (entry) {
      await walkEntry(entry, "", files, 0);
      continue;
    }
    const file = item.getAsFile();
    if (file) {
      const dropped = await fileToDropped(file, file.name);
      if (dropped) files.push(dropped);
    }
  }

  if (files.length === 0 && dt.files.length > 0 && !directoryHandle) {
    for (const file of [...dt.files]) {
      const dropped = await fileToDropped(file, file.name);
      if (dropped) files.push(dropped);
    }
  }

  return { directoryHandle, files: files.slice(0, MAX_FILES) };
}

async function fileToDropped(file: File, relativePath: string): Promise<DroppedFile | null> {
  if (skipName(file.name) || file.size > MAX_BYTES) return null;
  try {
    const text = await file.text();
    if (looksBinary(file.type, text.slice(0, 4096))) return null;
    return { relativePath: relativePath.replace(/^\/+/, ""), text };
  } catch {
    return null;
  }
}

async function walkEntry(
  entry: FileSystemEntry,
  prefix: string,
  out: DroppedFile[],
  depth: number,
): Promise<void> {
  if (out.length >= MAX_FILES || depth > MAX_DEPTH) return;
  if (skipName(entry.name)) return;
  if (entry.isFile) {
    const file = await new Promise<File | null>((resolve) => {
      (entry as FileSystemFileEntry).file(resolve, () => resolve(null));
    });
    if (!file) return;
    const rel = prefix ? `${prefix}/${file.name}` : file.name;
    const dropped = await fileToDropped(file, rel);
    if (dropped) out.push(dropped);
    return;
  }
  if (!entry.isDirectory) return;
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  const children = await new Promise<FileSystemEntry[]>((resolve) => {
    reader.readEntries(resolve, () => resolve([]));
  });
  const nextPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
  for (const child of children) {
    await walkEntry(child, nextPrefix, out, depth + 1);
  }
}
