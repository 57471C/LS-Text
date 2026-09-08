import { describe, it, expect, beforeEach } from 'vitest';
import { VirtualFileSystem } from './fs';
import type { VirtualSnapshot } from './types';

describe('VirtualFileSystem', () => {
  let vfs: VirtualFileSystem;

  beforeEach(() => {
    const snapshot: VirtualSnapshot = {
      name: 'test',
      rootPath: '/test',
      dirs: ['/test', '/test/folder1', '/test/folder1/nested'],
      files: {
        '/test/file.txt': 'hello',
        '/test/folder1/a.txt': 'a',
        '/test/folder1/nested/b.txt': 'b',
      },
    };
    vfs = new VirtualFileSystem(snapshot);
  });

  describe('rename', () => {
    it('renames a file', async () => {
      await vfs.rename('/test/file.txt', '/test/renamed.txt');

      const snapshot = vfs.snapshot();
      expect(snapshot.files['/test/file.txt']).toBeUndefined();
      expect(snapshot.files['/test/renamed.txt']).toBe('hello');
    });

    it('renames a directory and its nested contents', async () => {
      await vfs.rename('/test/folder1', '/test/folder2');

      const snapshot = vfs.snapshot();

      // Old paths should be removed
      expect(snapshot.dirs).not.toContain('/test/folder1');
      expect(snapshot.dirs).not.toContain('/test/folder1/nested');
      expect(snapshot.files['/test/folder1/a.txt']).toBeUndefined();
      expect(snapshot.files['/test/folder1/nested/b.txt']).toBeUndefined();

      // New paths should exist
      expect(snapshot.dirs).toContain('/test/folder2');
      expect(snapshot.dirs).toContain('/test/folder2/nested');
      expect(snapshot.files['/test/folder2/a.txt']).toBe('a');
      expect(snapshot.files['/test/folder2/nested/b.txt']).toBe('b');
    });

    it('creates parent directories when renaming a file to a new path', async () => {
      await vfs.rename('/test/file.txt', '/test/newfolder/file.txt');

      const snapshot = vfs.snapshot();
      expect(snapshot.files['/test/file.txt']).toBeUndefined();
      expect(snapshot.files['/test/newfolder/file.txt']).toBe('hello');
      expect(snapshot.dirs).toContain('/test/newfolder');
    });
  });
});
