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

  it("allows trailing slash on base dir", () => {
    expect(validatePath(path.join(baseDir, "file.json"), baseDir + "/")).toBe(true);
  });

  it("allows base with trailing slash and file without", () => {
    expect(validatePath(path.join(baseDir, "sub", "file.json"), baseDir + "/")).toBe(true);
  });

  it("allows path equal to base with trailing slash", () => {
    expect(validatePath(baseDir + "/", baseDir + "/")).toBe(true);
  });

  it("allows .. that stays inside base", () => {
    expect(validatePath(path.join(baseDir, "sub", "..", "file.json"), baseDir)).toBe(true);
  });

  it("allows multiple .. that stay inside base", () => {
    expect(validatePath(path.join(baseDir, "a", "b", "..", "..", "c.json"), baseDir)).toBe(true);
  });

  it("rejects empty string filePath (resolves to cwd, outside base)", () => {
    expect(validatePath("", baseDir)).toBe(false);
  });

  it("allows paths with spaces within base", () => {
    expect(validatePath(path.join(baseDir, "my file.json"), baseDir)).toBe(true);
  });

  it("allows very long nested paths within base", () => {
    const deep = path.join(baseDir, ...Array(10).fill("nested"), "file.txt");
    expect(validatePath(deep, baseDir)).toBe(true);
  });

  it("allows relative filePath within base when base is cwd", () => {
    expect(validatePath("file.json", process.cwd())).toBe(true);
  });

  it("allows filePath with trailing slash (directory) within base", () => {
    expect(validatePath(path.join(baseDir, "subdir") + "/", baseDir)).toBe(true);
  });
});
