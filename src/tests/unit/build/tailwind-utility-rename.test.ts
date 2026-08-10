import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SRC_DIR = join(import.meta.dirname, "..", "..", "..", "..", "src");

function collectTsxFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      results.push(...collectTsxFiles(join(dir, entry.name)));
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      results.push(join(dir, entry.name));
    }
  }
  return results;
}

const RENAMES: Record<string, string> = {
  "shadow-sm": "shadow-xs",
  "rounded-sm": "rounded-xs",
  "outline-none": "outline-hidden",
  "blur-sm": "blur-xs",
};

describe("Tailwind 4 utility renames", () => {
  it("no source files contain deprecated v3 utility names", () => {
    const files = collectTsxFiles(SRC_DIR).filter(
      (f) => !f.includes("__audit_test__") && !f.includes(".test."),
    );
    const violations: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      for (const [old] of Object.entries(RENAMES)) {
        // Check for the old class as a standalone class (word boundary)
        const regex = new RegExp(`\\b${old.replace(/-/g, "\\-")}\\b`);
        if (regex.test(content)) {
          violations.push(`${file}: still uses "${old}"`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
