import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const SRC_DIR = join(import.meta.dirname, "../../../..", "src");

function findTsFiles(dir: string, ext: string[]): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTsFiles(fullPath, ext));
    } else if (
      ext.some((e) => entry.name.endsWith(e)) &&
      !entry.name.endsWith(".test.ts") &&
      !entry.name.endsWith(".test.tsx") &&
      !entry.name.endsWith(".d.ts")
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

describe("L2.3: determinism gate — Math.random scan", () => {
  it("no Math.random() calls in engine production code (only in comments)", () => {
    const engineFiles = findTsFiles(join(SRC_DIR, "engine"), [".ts"]);
    const violations: string[] = [];

    for (const file of engineFiles) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
          return;
        }
        const stripped = line.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "");
        if (/\bMath\.random\s*\(/.test(stripped)) {
          violations.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      });
    }

    expect(violations, `Math.random() calls in engine code:\n${violations.join("\n")}`).toEqual([]);
  });
});
