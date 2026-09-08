import { describe, it, expect } from "vitest";
import { searchWorkspace } from "./search";

describe("Search Performance", () => {
  it("measures searchWorkspace performance", async () => {
    const tabs: { path: string; content: string }[] = [];

    // Create 400 files
    const files = Array.from({ length: 400 }, (_, i) => `/file${i}.txt`);

    const listAll = async () => files;

    const read = async (path: string) => {
      // Simulate I/O delay
      await new Promise(resolve => setTimeout(resolve, 5));
      return "Hello world\nThis is a test file\nLine 3\nLine 4\n";
    };

    const start = performance.now();
    const hits = await searchWorkspace("test", false, tabs, listAll, read);
    const end = performance.now();
    console.log(`searchWorkspace took ${end - start}ms`);
    expect(hits.length).toBeGreaterThan(0);
  });
});
