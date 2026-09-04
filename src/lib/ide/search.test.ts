import { describe, it, expect } from 'vitest';
import { scanContent } from './search';

describe('scanContent', () => {
  const path = '/test/file.ts';
  const MAX_FILE = 256_000;
  const MAX_HITS = 200;

  it('returns empty array for empty query', () => {
    const hits = scanContent(path, 'some content', '', false);
    expect(hits).toEqual([]);
  });

  it('returns empty array if content length exceeds MAX_FILE', () => {
    const content = 'a'.repeat(MAX_FILE + 1);
    const hits = scanContent(path, content, 'a', false);
    expect(hits).toEqual([]);
  });

  it('returns matches case-insensitively', () => {
    const content = 'Hello world\nhello WORLD';
    const hits = scanContent(path, content, 'hello', false);
    expect(hits).toHaveLength(2);
    expect(hits[0]).toMatchObject({ line: 1, col: 1, text: 'Hello world' });
    expect(hits[1]).toMatchObject({ line: 2, col: 1, text: 'hello WORLD' });
  });

  it('returns matches case-sensitively', () => {
    const content = 'Hello world\nhello WORLD';
    const hits = scanContent(path, content, 'hello', true);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ line: 2, col: 1, text: 'hello WORLD' });
  });

  it('truncates returned text to 160 characters', () => {
    const longLine = 'a'.repeat(200);
    const content = `start ${longLine} end`;
    const hits = scanContent(path, content, 'start', false);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.text).toHaveLength(160);
    expect(hits[0]?.text).toBe(content.slice(0, 160));
  });

  it('trims the returned text', () => {
    const content = '   match this   ';
    const hits = scanContent(path, content, 'match', false);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.text).toBe('match this');
  });

  it('returns multiple hits in one file', () => {
    const content = 'first line with search\nsecond line with search\nthird line without';
    const hits = scanContent(path, content, 'search', false);
    expect(hits).toHaveLength(2);
    expect(hits[0]).toMatchObject({ line: 1, col: 17 });
    expect(hits[1]).toMatchObject({ line: 2, col: 18 });
  });

  it('stops returning hits when reaching MAX_HITS', () => {
    const content = Array(MAX_HITS + 10).fill('match').join('\n');
    const hits = scanContent(path, content, 'match', false);
    expect(hits).toHaveLength(MAX_HITS);
  });

  it('returns exact hit offset (column and line number)', () => {
    const content = '0123456789\n01234target56789';
    const hits = scanContent(path, content, 'target', false);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ line: 2, col: 6 });
  });
});
