import { describe, expect, test } from "vitest";
import { extname } from "./utils";

describe("extname", () => {
  test("returns lowercase extension for standard files", () => {
    expect(extname("file.txt")).toBe("txt");
    expect(extname("FILE.TXT")).toBe("txt");
    expect(extname("document.PDF")).toBe("pdf");
  });

  test("handles files with multiple dots", () => {
    expect(extname("archive.tar.gz")).toBe("gz");
    expect(extname("complex.file.name.MD")).toBe("md");
  });

  test("returns empty string for files without extensions", () => {
    expect(extname("file")).toBe("");
    expect(extname("another_file")).toBe("");
  });

  test("returns empty string for hidden files without extensions", () => {
    expect(extname(".gitignore")).toBe("");
    expect(extname(".npmrc")).toBe("");
  });

  test("handles hidden files with extensions", () => {
    expect(extname(".hidden.config")).toBe("config");
    expect(extname(".eslintrc.json")).toBe("json");
  });

  test("handles empty string", () => {
    expect(extname("")).toBe("");
  });

  test("handles files ending with a dot", () => {
    expect(extname("file.")).toBe("");
    expect(extname(".hidden.")).toBe("");
  });
});
