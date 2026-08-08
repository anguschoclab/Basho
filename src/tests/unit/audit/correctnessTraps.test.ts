import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const SRC_DIR = join(import.meta.dirname, "../../../..", "src");

function findEngineTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findEngineTsFiles(fullPath));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts") && !entry.name.endsWith(".d.ts")) {
      results.push(fullPath);
    }
  }
  return results;
}

describe("L4.3: correctness traps — parseInt radix", () => {
  it("all parseInt calls in engine use an explicit radix", () => {
    const engineFiles = findEngineTsFiles(join(SRC_DIR, "engine"));
    const violations: string[] = [];

    for (const file of engineFiles) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        const match = line.match(/parseInt\s*\(/);
        if (match) {
          if (!line.includes(", 10") && !line.includes(",16") && !line.includes(", 16")) {
            violations.push(`${file}:${i + 1}: ${line.trim()}`);
          }
        }
      });
    }

    expect(violations, `parseInt without radix:\n${violations.join("\n")}`).toEqual([]);
  });
});

describe("L4.3: correctness traps — .sort() without clone", () => {
  it("no in-place .sort() on arrays derived from world state (must clone first)", () => {
    const engineFiles = findEngineTsFiles(join(SRC_DIR, "engine"));
    const violations: string[] = [];

    const worldArrayPatterns = [
      /\bworld\.\w+\.sort\(/,
      /\bworld\.history\.sort\(/,
      /\bworld\.lineage\.sort\(/,
    ];

    for (const file of engineFiles) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        for (const pattern of worldArrayPatterns) {
          if (pattern.test(line)) {
            violations.push(`${file}:${i + 1}: ${line.trim()}`);
          }
        }
      });
    }

    expect(violations, `In-place sort on world state arrays:\n${violations.join("\n")}`).toEqual([]);
  });
});
