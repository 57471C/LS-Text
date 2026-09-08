import { describe, it, expect } from "vitest";
import { TauriDiskFS } from "./tauri-fs";
import type { DirEntry } from "./types";

class MockTauriFS extends TauriDiskFS {
  constructor() {
    super("/root");
  }

  async list(path: string): Promise<DirEntry[]> {
    // Add artificial delay to simulate IPC overhead
    await new Promise((resolve) => setTimeout(resolve, 10));

    if (path === "/root") {
      return [
        { name: "dir1", path: "/root/dir1", kind: "dir" },
        { name: "dir2", path: "/root/dir2", kind: "dir" },
        { name: "file1", path: "/root/file1", kind: "file" },
      ];
    }
    if (path === "/root/dir1") {
      return [
        { name: "dir3", path: "/root/dir1/dir3", kind: "dir" },
        { name: "file2", path: "/root/dir1/file2", kind: "file" },
      ];
    }
    if (path === "/root/dir2") {
      return [
        { name: "file3", path: "/root/dir2/file3", kind: "file" },
        { name: "file4", path: "/root/dir2/file4", kind: "file" },
      ];
    }
    if (path === "/root/dir1/dir3") {
      return [
        { name: "file5", path: "/root/dir1/dir3/file5", kind: "file" },
      ];
    }
    return [];
  }
}

describe("TauriDiskFS Performance", () => {
  it("measures listAllFiles performance", async () => {
    const fs = new MockTauriFS();
    const start = performance.now();
    const files = await fs.listAllFiles();
    const end = performance.now();
    console.log(`listAllFiles took ${end - start}ms`);
    expect(files.length).toBe(5);
  });
});
