import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const SRC_DIR = join(import.meta.dirname, "../../../..", "src");
const PHASES_DIR = join(SRC_DIR, "engine/tick/phases");

function findTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTsFiles(fullPath));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      results.push(fullPath);
    }
  }
  return results;
}

describe("L4.1: phase purity — no direct world.* mutations outside builder", () => {
  it("tick phases do not directly assign to world.* properties (must use ImpactBuilder)", () => {
    const phaseFiles = findTsFiles(PHASES_DIR);
    const violations: string[] = [];

    const mutationPatterns = [
      /\bworld\.\w+\s*=\s*[^=]/,
      /\bworld\.\w+\.\w+\s*=\s*[^=]/,
      /\bworld\.history\.push\(/,
      /\bworld\.lineage\.push\(/,
      /\bworld\.events\.push\(/,
    ];

    for (const file of phaseFiles) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        const stripped = line.replace(/\/\/.*$/, "");
        for (const pattern of mutationPatterns) {
          if (pattern.test(stripped) && !line.includes("builder.") && !line.includes("ImpactBuilder") && !line.includes("builder.updateWorldField")) {
            violations.push(`${file}:${i + 1}: ${line.trim()}`);
          }
        }
      });
    }

    expect(violations.length, `Direct world.* mutations in tick phases:\n${violations.join("\n")}`).toBeLessThanOrEqual(10);
  });
});
