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

describe("L4.6: accessibility & UX debt", () => {
  it("buttons inside forms have type='button' or type='submit'", () => {
    const componentFiles = findFiles(join(SRC_DIR, "components"), [".tsx"]);
    const violations: string[] = [];

    for (const file of componentFiles) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        if (/<Button\b/.test(line) && !line.includes("type=") && !line.includes("variant=")) {
          const nextLines = lines.slice(i, Math.min(i + 3, lines.length)).join(" ");
          if (!/type\s*=/.test(nextLines)) {
            violations.push(`${file}:${i + 1}: <Button> without type attribute`);
          }
        }
      });
    }

    expect(violations.length, `Buttons without type attribute: ${violations.length}`).toBeLessThanOrEqual(150);
  });

  it("no color-only status indicators without text or aria-label", () => {
    const componentFiles = findFiles(join(SRC_DIR, "components"), [".tsx"]);
    const violations: string[] = [];

    for (const file of componentFiles) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        if (/className=.*bg-(red|green|yellow|blue|destructive|success|warning)/.test(line) && !line.includes("text-") && !line.includes("aria-label") && !line.includes("children")) {
          violations.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      });
    }

    expect(violations.length, `Potential color-only indicators: ${violations.length}`).toBeLessThanOrEqual(40);
  });
});
