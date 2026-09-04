import { describe, it, expect } from 'vitest';
import { toggleBase64Text } from './base64';

describe('toggleBase64Text', () => {
  it('throws an error if input is empty', () => {
    expect(() => toggleBase64Text('')).toThrow('Nothing to encode');
  });

  it('encodes regular text to Base64', () => {
    const result = toggleBase64Text('hello');
    expect(result.text).toBe('aGVsbG8=');
    expect(result.mode).toBe('encode');
  });

  it('decodes valid Base64 back to regular text', () => {
    const result = toggleBase64Text('aGVsbG8=');
    expect(result.text).toBe('hello');
    expect(result.mode).toBe('decode');
  });

  it('falls back to encoding if input looks like Base64 but fails UTF-8 decoding', () => {
    // "////////" looks like base64 because it uses valid base64 characters
    // and is 8 characters long, but it decodes to invalid UTF-8 bytes.
    // decodeUtf8 uses TextDecoder with { fatal: true } which throws on invalid UTF-8.
    const result = toggleBase64Text('////////');
    // We expect it to encode the raw string "////////" to Base64.
    // "////////" encoded in base64 is 'Ly8vLy8vLy8='
    expect(result.text).toBe('Ly8vLy8vLy8=');
    expect(result.mode).toBe('encode');
  });

  it('handles multiline Base64 and spaces correctly when decoding', () => {
    const result = toggleBase64Text('aGVs\nb\r\nG8='); // should be treated as aGVsbG8=
    expect(result.text).toBe('hello');
    expect(result.mode).toBe('decode');
  });
});
