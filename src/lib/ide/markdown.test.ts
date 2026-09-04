import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './markdown';

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
