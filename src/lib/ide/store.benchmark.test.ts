import { describe, it, expect } from "vitest";
import { useIde } from "./store";
import { VirtualFileSystem } from "./fs";
import * as dropModule from "./drop";
import { vi } from "vitest";

describe("ingestDrop performance", () => {
  it("imports many files quickly", async () => {
    const store = useIde.getState();
    const mockFiles = Array.from({ length: 1000 }).map((_, i) => ({
      relativePath: `folderA/folderB/file${i}.txt`,
      text: "content",
    }));

    vi.spyOn(dropModule, "readDataTransfer").mockResolvedValue({
      directoryHandle: null,
      files: mockFiles as any,
    });

    const dt = {} as DataTransfer;

    // Simulate some latency in fs.mkdir to mimic disk IO
    const originalMkdir = store.fs.mkdir.bind(store.fs);
    store.fs.mkdir = async (path: string) => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return originalMkdir(path);
    };

    const start = performance.now();
    await store.ingestDrop(dt);
    const end = performance.now();

    console.log(`Time taken: ${end - start}ms`);
    expect(end - start).toBeLessThan(1000); // Expecting it to be fast

    vi.restoreAllMocks();
  });
});
