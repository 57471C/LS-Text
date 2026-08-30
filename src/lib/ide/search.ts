import { basename } from "@/lib/utils";

export interface SearchHit {
  path: string;
  name: string;
  line: number;
  col: number;
  text: string;
}

const MAX_FILE = 256_000;
const MAX_HITS = 200;
const MAX_FILES = 400;

export function scanContent(
  path: string,
  content: string,
  query: string,
  caseSensitive: boolean,
): SearchHit[] {
  if (!query || content.length > MAX_FILE) return [];
  const q = caseSensitive ? query : query.toLowerCase();
  const hits: SearchHit[] = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? "";
    const hay = caseSensitive ? raw : raw.toLowerCase();
    const col = hay.indexOf(q);
    if (col < 0) continue;
    hits.push({
      path,
      name: basename(path),
      line: i + 1,
      col: col + 1,
      text: raw.trim().slice(0, 160),
    });
    if (hits.length >= MAX_HITS) break;
  }
  return hits;
}

export async function searchWorkspace(
  query: string,
  caseSensitive: boolean,
  tabs: { path: string; content: string }[],
  listAll: () => Promise<string[]>,
  read: (path: string) => Promise<string>,
): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const hits: SearchHit[] = [];
  const seen = new Set<string>();

  for (const tab of tabs) {
    seen.add(tab.path);
    hits.push(...scanContent(tab.path, tab.content, q, caseSensitive));
    if (hits.length >= MAX_HITS) return hits.slice(0, MAX_HITS);
  }

  const files = (await listAll()).slice(0, MAX_FILES);
  for (const path of files) {
    if (seen.has(path)) continue;
    try {
      const content = await read(path);
      hits.push(...scanContent(path, content, q, caseSensitive));
    } catch {
      /* unreadable */
    }
    if (hits.length >= MAX_HITS) break;
  }
  return hits.slice(0, MAX_HITS);
}
