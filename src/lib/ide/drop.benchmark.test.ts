import { describe, it, expect, vi } from "vitest";
import { readDataTransfer } from "./drop";

// Mock File API
class MockFile {
  name: string;
  size: number;
  type: string;
  constructor(name: string, size: number, type: string = "") {
    this.name = name;
    this.size = size;
    this.type = type;
  }
  async text() {
    // Simulate I/O delay
    await new Promise((resolve) => setTimeout(resolve, 10));
    return "test content";
  }
}

describe("readDataTransfer performance", () => {
  it("processes many files quickly", async () => {
    const files = Array.from({ length: 50 }).map((_, i) => new MockFile(`file${i}.txt`, 100));
    const items = files.map(file => ({
      kind: "file",
      getAsFile: () => file,
    }));

    const dt = {
      items,
      files: [],
    } as unknown as DataTransfer;

    const start = performance.now();
    const result = await readDataTransfer(dt);
    const end = performance.now();

    console.log(`Time taken: ${end - start}ms`);
    expect(result.files.length).toBe(50);
  });
});
