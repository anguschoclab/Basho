import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const SRC_DIR = join(import.meta.dirname, "../../../..", "src");

function findFiles(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(fullPath, exts));
    } else if (
      exts.some((e) => entry.name.endsWith(e)) &&
      !entry.name.endsWith(".test.ts") &&
      !entry.name.endsWith(".test.tsx")
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

describe("L4.5: React hygiene — no console.log or any-type in production components", () => {
  it("no console.log/console.error left in production component files", () => {
    const componentFiles = findFiles(join(SRC_DIR, "components"), [".tsx", ".ts"]);
    const violations: string[] = [];

    for (const file of componentFiles) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        if (
          /\bconsole\.(log|error|warn|debug|info)\b/.test(line) &&
          !line.trim().startsWith("//") &&
          !line.trim().startsWith("*")
        ) {
          violations.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      });
    }

    expect(
      violations.length,
      `Console calls in production components:\n${violations.join("\n")}`
    ).toEqual(0);
  });

  it("no 'as any' in production component files", () => {
    const componentFiles = findFiles(join(SRC_DIR, "components"), [".tsx", ".ts"]);
    const violations: string[] = [];

    for (const file of componentFiles) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        if (/\bas\s+any\b/.test(line) && !line.trim().startsWith("//")) {
          violations.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      });
    }

    expect(
      violations.length,
      `'as any' in production components:\n${violations.join("\n")}`
    ).toBeLessThanOrEqual(5);
  });
});
