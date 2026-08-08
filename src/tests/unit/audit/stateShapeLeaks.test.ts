import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

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

import { existsSync } from "fs";

describe("L3.3: state-shape leaks — world.* direct access in UI", () => {
  it("no page components directly access world.rikishi or world.heyas", () => {
    const pageFiles = findFiles(join(SRC_DIR, "pages"), [".tsx"]);
    const violations: string[] = [];

    for (const file of pageFiles) {
      const content = readFileSync(file, "utf-8");
      const patterns = [
        /\bworld\.rikishi\b/,
        /\bworld\.heyas\b/,
        /\bworld\.oyakata\b/,
        /\bworld\.staff\b/,
        /\bworld\.history\b/,
      ];
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          const lines = content.split("\n");
          lines.forEach((line, i) => {
            if (pattern.test(line)) {
              violations.push(`${file}:${i + 1}: ${line.trim()}`);
            }
          });
        }
      }
    }

    expect(violations.length, `Direct world.* access in pages (should use presenters) — budget exceeded:\n${violations.join("\n")}`).toEqual(0);
  });
});
