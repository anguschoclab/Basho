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

describe("L4.3: correctness traps — loose equality (== / != with non-null values)", () => {
  it("engine production code uses strict equality (=== / !==) except for nullish checks (!= null / == null)", () => {
    const engineFiles = findEngineTsFiles(join(SRC_DIR, "engine"));
    const violations: string[] = [];

    for (const file of engineFiles) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
        // Flag == or != that are NOT === or !== and NOT comparing to null/undefined
        // == null and != null are idiomatic TS nullish checks — allowed
        // Use negative lookbehind/lookahead to exclude === and !==
        const looseEq = line.match(/(?<![=!])==(?!=)\s*(?!null\b|undefined\b)\S/);
        const looseNeq = line.match(/(?<=[^=!])!=(?!=)\s*(?!null\b|undefined\b)\S/);
        if (looseEq || looseNeq) {
          violations.push(`${file}:${i + 1}: ${trimmed}`);
        }
      });
    }

    expect(violations, `Loose equality with non-null values (use === or !==):\n${violations.join("\n")}`).toEqual([]);
  });
});

describe("L4.3: correctness traps — mutable default arguments", () => {
  it("engine functions do not use mutable default arguments with new Map/Set/Array (shared state risk)", () => {
    const engineFiles = findEngineTsFiles(join(SRC_DIR, "engine"));
    const violations: string[] = [];

    for (const file of engineFiles) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
        // In JS/TS, = {} and = [] create new objects per call (unlike Python).
        // Only flag new Map()/Set()/Array() as default arguments in function signatures.
        // Must be on a line with function parameter syntax (param: Type = new ...)
        if (/=\s*new\s+(?:Map|Set|Array)\s*\(\s*\)/.test(line)) {
          // Must be a function parameter default: has param: Type = new ... pattern
          // and the line is part of a parameter list (contains , or ) at end)
          if (/\w+\s*:\s*[\w<>[\]|, ]+\s*=\s*new\s+(?:Map|Set|Array)/.test(line) &&
              /[,)]\s*$/.test(trimmed)) {
            violations.push(`${file}:${i + 1}: ${trimmed}`);
          }
        }
      });
    }

    expect(
      violations.length,
      `new Map()/Set()/Array() as default arguments:\n${violations.join("\n")}`,
    ).toBe(0);
  });
});
