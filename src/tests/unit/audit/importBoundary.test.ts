import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const SRC_DIR = join(import.meta.dirname, "../../../..", "src");

function findEngineFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findEngineFiles(fullPath));
    } else if (
      (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
      !entry.name.endsWith(".test.ts") &&
      !entry.name.endsWith(".test.tsx")
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

const PROHIBITED_PATTERNS = [
  /from\s+["']@\/components\//,
  /from\s+["']@\/pages\//,
  /from\s+["']@\/contexts\//,
  /from\s+["']@\/presenters\//,
  /from\s+["']@\/hooks\//,
  /from\s+["']\.\.\/components\//,
  /from\s+["']\.\.\/pages\//,
  /from\s+["']\.\.\/contexts\//,
  /from\s+["']\.\.\/presenters\//,
  /from\s+["']\.\.\/hooks\//,
];

describe("import boundary: engine must not import from UI layers", () => {
  it("no engine file imports from components, pages, contexts, presenters, or hooks", () => {
    const engineDir = join(SRC_DIR, "engine");
    const engineFiles = findEngineFiles(engineDir);
    const violations: string[] = [];

    for (const file of engineFiles) {
      const content = readFileSync(file, "utf-8");
      for (const pattern of PROHIBITED_PATTERNS) {
        const matches = content.match(new RegExp(pattern.source, "g"));
        if (matches) {
          violations.push(`${file}: ${matches.join(", ")}`);
        }
      }
    }

    expect(violations, `Engine files importing from UI layers:\n${violations.join("\n")}`).toEqual(
      []
    );
  });
});
