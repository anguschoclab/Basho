import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { existsSync } from "fs";

const SRC_DIR = join(import.meta.dirname, "../../../..", "src");

function findFiles(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(fullPath, exts));
    } else if (exts.some((e) => entry.name.endsWith(e)) && !entry.name.endsWith(".test.ts") && !entry.name.endsWith(".test.tsx")) {
      results.push(fullPath);
    }
  }
  return results;
}

describe("L4.7: Tailwind/className anti-patterns", () => {
  it("no excessive use of arbitrary Tailwind values (w-[NNNpx])", () => {
    const componentFiles = findFiles(join(SRC_DIR, "components"), [".tsx"]);
    const pageFiles = findFiles(join(SRC_DIR, "pages"), [".tsx"]);
    const allFiles = [...componentFiles, ...pageFiles];
    const violations: string[] = [];

    for (const file of allFiles) {
      const content = readFileSync(file, "utf-8");
      const matches = content.match(/\b[wh]-\[\d+px\]/g) || [];
      if (matches.length > 5) {
        violations.push(`${file}: ${matches.length} arbitrary values`);
      }
    }

    expect(violations, `Files with >5 arbitrary Tailwind values:\n${violations.join("\n")}`).toEqual([]);
  });

  it("no inline style={{}} that could be Tailwind classes (simple cases only)", () => {
    const componentFiles = findFiles(join(SRC_DIR, "components"), [".tsx"]);
    const violations: string[] = [];

    for (const file of componentFiles) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        if (/style=\{\{[^}]*color:/.test(line) || /style=\{\{[^}]*backgroundColor:/.test(line)) {
          violations.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      });
    }

    expect(violations.length, `Inline color styles that could be Tailwind: ${violations.length}`).toBeLessThanOrEqual(10);
  });
});
