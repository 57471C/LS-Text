import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './markdown';
import { toggleTaskInLine } from './markdown-task';

describe('renderMarkdown heading rendering', () => {
  it('renders a level 1 heading', () => {
    const markdown = '# Heading 1';
    const html = renderMarkdown(markdown);
    expect(html).toBe('<div class="md-block" data-line="1"><h1>Heading 1</h1></div>');
  });

  it('renders a level 2 heading', () => {
    const markdown = '## Heading 2';
    const html = renderMarkdown(markdown);
    expect(html).toBe('<div class="md-block" data-line="1"><h2>Heading 2</h2></div>');
  });

  it('renders a level 6 heading', () => {
    const markdown = '###### Heading 6';
    const html = renderMarkdown(markdown);
    expect(html).toBe('<div class="md-block" data-line="1"><h6>Heading 6</h6></div>');
  });

  it('handles inline formatting in headings', () => {
    const markdown = '# Heading **bold** and *italic*';
    const html = renderMarkdown(markdown);
    expect(html).toBe('<div class="md-block" data-line="1"><h1>Heading <strong>bold</strong> and <em>italic</em></h1></div>');
  });

  it('preserves multiple headings on different lines', () => {
    const markdown = '# Heading 1\n## Heading 2\n### Heading 3';
    const html = renderMarkdown(markdown);
    expect(html).toContain('<div class="md-block" data-line="1"><h1>Heading 1</h1></div>');
    expect(html).toContain('<div class="md-block" data-line="2"><h2>Heading 2</h2></div>');
    expect(html).toContain('<div class="md-block" data-line="3"><h3>Heading 3</h3></div>');
  });

  it('ignores invalid headings (missing space)', () => {
    const markdown = '#Not a heading';
    const html = renderMarkdown(markdown);
    expect(html).toBe('<div class="md-block" data-line="1"><p>#Not a heading</p></div>');
  });

  it('ignores invalid headings (more than 6 #)', () => {
    const markdown = '####### Too many hashes';
    const html = renderMarkdown(markdown);
    expect(html).toBe('<div class="md-block" data-line="1"><p>####### Too many hashes</p></div>');
  });
});

describe('renderMarkdown tables and tasks', () => {
  it('renders GFM task boxes inside table cells', () => {
    const markdown =
      '| A | B |\n| --- | --- |\n| [x] Terry | [ ] Tracy |';
    const html = renderMarkdown(markdown);
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('checked');
    expect(html).toContain('data-task-line="3"');
    expect(html).toContain('Terry');
    expect(html).not.toContain('[x]');
  });

  it('honours table alignment from the separator row', () => {
    const markdown = '| L | C | R |\n| :--- | :---: | ---: |\n| a | b | c |';
    const html = renderMarkdown(markdown);
    expect(html).toContain('text-align:center');
    expect(html).toContain('text-align:right');
  });
});

describe('renderMarkdown inline extras', () => {
  it('renders ==highlight== as mark', () => {
    const html = renderMarkdown('Note ==important== bit');
    expect(html).toContain('<mark>important</mark>');
  });

  it('renders __bold__ as strong', () => {
    const html = renderMarkdown('say __hello__');
    expect(html).toContain('<strong>hello</strong>');
  });
});

describe('toggleTaskInLine', () => {
  it('flips the nth task marker', () => {
    expect(toggleTaskInLine('| [x] Terry | [ ] Tracy |', 0)?.insert).toBe('[ ]');
    expect(toggleTaskInLine('| [x] Terry | [ ] Tracy |', 1)?.insert).toBe('[x]');
  });
});
