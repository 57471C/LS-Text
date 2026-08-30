/** Safe subset renderer. Emits only our tags; every text node is escaped.
 *  Block wrappers carry data-line for editor↔preview scroll mapping. */

function esc(s: string) {
  return s
    .replace(/&/g, "&" + "amp;")
    .replace(/</g, "&" + "lt;")
    .replace(/>/g, "&" + "gt;")
    .replace(/"/g, "&" + "quot;");
}

function safeUrl(href: string) {
  const t = href.trim();
  if (!t || /^javascript:/i.test(t) || /^data:/i.test(t)) return null;
  if (/^(https?:|mailto:|#|\/|\.\/|\.\.\/)/i.test(t)) return t;
  return null;
}

function inline(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    if (src[i] === "`") {
      const j = src.indexOf("`", i + 1);
      if (j > i) {
        out += `<code>${esc(src.slice(i + 1, j))}</code>`;
        i = j + 1;
        continue;
      }
    }
    if (src.startsWith("![", i)) {
      const m = /^!\[([^\]]*)\]\(([^)]+)\)/.exec(src.slice(i));
      if (m) {
        const href = safeUrl(m[2]);
        out += href
          ? `<img alt="${esc(m[1])}" src="${esc(href)}">`
          : esc(m[0]);
        i += m[0].length;
        continue;
      }
    }
    if (src[i] === "[") {
      const m = /^\[([^\]]+)\]\(([^)]+)\)/.exec(src.slice(i));
      if (m) {
        const href = safeUrl(m[2]);
        out += href
          ? `<a href="${esc(href)}" target="_blank" rel="noreferrer">${inline(m[1])}</a>`
          : esc(m[0]);
        i += m[0].length;
        continue;
      }
    }
    if (src.startsWith("**", i)) {
      const j = src.indexOf("**", i + 2);
      if (j > i) {
        out += `<strong>${inline(src.slice(i + 2, j))}</strong>`;
        i = j + 2;
        continue;
      }
    }
    if (src.startsWith("~~", i)) {
      const j = src.indexOf("~~", i + 2);
      if (j > i) {
        out += `<del>${inline(src.slice(i + 2, j))}</del>`;
        i = j + 2;
        continue;
      }
    }
    if (src[i] === "*" && src[i + 1] !== " " && src[i + 1] !== "*") {
      const j = src.indexOf("*", i + 1);
      if (j > i) {
        out += `<em>${inline(src.slice(i + 1, j))}</em>`;
        i = j + 1;
        continue;
      }
    }
    out += esc(src[i]!);
    i += 1;
  }
  return out;
}

function isFence(s: string) {
  return s.startsWith("```");
}
function isHeading(s: string) {
  return /^#{1,6}\s+\S/.test(s);
}
function isHr(s: string) {
  return /^(-{3,}|\*{3,}|_{3,})\s*$/.test(s);
}
function isUl(s: string) {
  return /^\s*[-*+]\s+/.test(s);
}
function isOl(s: string) {
  return /^\s*\d+\.\s+/.test(s);
}
function isQuote(s: string) {
  return /^>\s?/.test(s);
}
function isTableRow(s: string) {
  return /^\s*\|.+\|\s*$/.test(s);
}
function isSepRow(s: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(s);
}

function wrap(line: number, html: string) {
  return `<div class="md-block" data-line="${line}">${html}</div>`;
}

export function renderMarkdown(src: string): string {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i] ?? "";
    if (/^\s*$/.test(raw)) {
      i += 1;
      continue;
    }
    const start = i + 1;

    if (isFence(raw)) {
      i += 1;
      const body: string[] = [];
      while (i < lines.length && !isFence(lines[i] ?? "")) {
        body.push(lines[i] ?? "");
        i += 1;
      }
      if (i < lines.length) i += 1;
      out.push(
        wrap(start, `<pre><code>${esc(body.join("\n"))}</code></pre>`),
      );
      continue;
    }

    if (isHeading(raw)) {
      const m = /^(#{1,6})\s+(.+)$/.exec(raw)!;
      const level = m[1]!.length;
      out.push(wrap(start, `<h${level}>${inline(m[2]!.trim())}</h${level}>`));
      i += 1;
      continue;
    }

    if (isHr(raw)) {
      out.push(wrap(start, "<hr>"));
      i += 1;
      continue;
    }

    if (isTableRow(raw) && i + 1 < lines.length && isSepRow(lines[i + 1] ?? "")) {
      const split = (row: string) =>
        row
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim());
      const header = split(raw);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i] ?? "")) {
        rows.push(split(lines[i] ?? ""));
        i += 1;
      }
      const thead = `<tr>${header.map((c) => `<th>${inline(c)}</th>`).join("")}</tr>`;
      const tbody = rows
        .map(
          (r) =>
            `<tr>${header.map((_, idx) => `<td>${inline(r[idx] ?? "")}</td>`).join("")}</tr>`,
        )
        .join("");
      out.push(wrap(start, `<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>`));
      continue;
    }

    if (isQuote(raw)) {
      const body: string[] = [];
      while (i < lines.length && isQuote(lines[i] ?? "")) {
        body.push((lines[i] ?? "").replace(/^>\s?/, ""));
        i += 1;
      }
      out.push(wrap(start, `<blockquote><p>${inline(body.join(" "))}</p></blockquote>`));
      continue;
    }

    if (isUl(raw) || isOl(raw)) {
      const ordered = isOl(raw);
      const items: { line: number; text: string }[] = [];
      while (i < lines.length && (ordered ? isOl(lines[i] ?? "") : isUl(lines[i] ?? ""))) {
        items.push({
          line: i + 1,
          text: (lines[i] ?? "").replace(ordered ? /^\s*\d+\.\s+/ : /^\s*[-*+]\s+/, ""),
        });
        i += 1;
      }
      const tag = ordered ? "ol" : "ul";
      const lis = items
        .map((it) => `<li data-line="${it.line}">${inline(it.text)}</li>`)
        .join("");
      out.push(wrap(start, `<${tag}>${lis}</${tag}>`));
      continue;
    }

    const para: string[] = [raw];
    i += 1;
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i] ?? "") &&
      !isFence(lines[i] ?? "") &&
      !isHeading(lines[i] ?? "") &&
      !isHr(lines[i] ?? "") &&
      !isUl(lines[i] ?? "") &&
      !isOl(lines[i] ?? "") &&
      !isQuote(lines[i] ?? "") &&
      !isTableRow(lines[i] ?? "")
    ) {
      para.push(lines[i] ?? "");
      i += 1;
    }
    out.push(wrap(start, `<p>${inline(para.join(" "))}</p>`));
  }

  return out.join("");
}

export function extractHeadings(src: string): { line: number; level: number; text: string }[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out: { line: number; level: number; text: string }[] = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? "";
    if (isFence(raw)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{1,6})\s+(.+)$/.exec(raw);
    if (!m) continue;
    out.push({ line: i + 1, level: m[1]!.length, text: m[2]!.trim() });
  }
  return out;
}

export function isMarkdownName(filename: string) {
  const n = filename.toLowerCase();
  return n.endsWith(".md") || n.endsWith(".markdown") || n.endsWith(".mdown");
}
