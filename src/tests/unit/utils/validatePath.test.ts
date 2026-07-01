import { describe, it, expect } from "vitest";
import path from "path";
import { validatePath } from "@/utils/validatePath";

const baseDir = path.resolve("/fake/userData/archives");

describe("validatePath", () => {
  it("allows paths within the base directory", () => {
    expect(validatePath(path.join(baseDir, "file.json"), baseDir)).toBe(true);
    expect(validatePath(path.join(baseDir, "sub", "file.json"), baseDir)).toBe(true);
  });

  it("allows the base directory itself", () => {
    expect(validatePath(baseDir, baseDir)).toBe(true);
  });

  it("rejects paths that escape via ..", () => {
    expect(validatePath(path.join(baseDir, "..", "secret.txt"), baseDir)).toBe(false);
    expect(validatePath(path.join(baseDir, "sub", "..", "..", "config.json"), baseDir)).toBe(false);
  });

  it("rejects absolute paths outside the base directory", () => {
    expect(validatePath("/etc/passwd", baseDir)).toBe(false);
    expect(validatePath("/fake/userData/config.json", baseDir)).toBe(false);
  });

  it("rejects non-string inputs", () => {
    expect(validatePath(null as unknown as string, baseDir)).toBe(false);
    expect(validatePath(undefined as unknown as string, baseDir)).toBe(false);
    expect(validatePath(123 as unknown as string, baseDir)).toBe(false);
  });

  it("rejects paths on a different Windows drive", () => {
    const winBase = "C:\\fake\\userData\\archives";
    expect(validatePath("D:\\evil\\file.txt", winBase)).toBe(false);
  });

  it("allows deeply nested paths within base", () => {
    expect(validatePath(path.join(baseDir, "nested", "deep", "file.txt"), baseDir)).toBe(true);
  });
});
