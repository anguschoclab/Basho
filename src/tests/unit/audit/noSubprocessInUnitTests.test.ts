import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const SRC_DIR = join(import.meta.dirname, "../../../..", "src");
const UNIT_TESTS_DIR = join(SRC_DIR, "tests", "unit");

function findTestFiles(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTestFiles(fullPath));
    } else if (entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.tsx")) {
      results.push(fullPath);
    }
  }
  return results;
}

// The default `bun run test` suite must stay fast. Tests that shell out to
// external tools (eslint, knip, madge, tsx) or drive long-horizon
// simulations belong in src/tests/slow/ (run adhoc via `bun run test:slow`).
describe("unit suite speed guard", () => {
  it("no unit test spawns subprocesses (move it to src/tests/slow/ instead)", () => {
    const violations: string[] = [];
    for (const file of findTestFiles(UNIT_TESTS_DIR)) {
      const content = readFileSync(file, "utf-8");
      if (
        /from\s+["'](?:node:)?child_process["']/.test(content) ||
        /require\(\s*["'](?:node:)?child_process["']\s*\)/.test(content)
      ) {
        violations.push(file.replace(SRC_DIR + "/", ""));
      }
    }
    expect(
      violations,
      `Unit tests spawning subprocesses — move to src/tests/slow/:\n${violations.join("\n")}`
    ).toEqual([]);
  });
});
