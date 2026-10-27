import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { findFiles, SRC } from "@tests/helpers/fsScan";

const UNIT_TESTS_DIR = join(SRC, "tests", "unit");

// The default `bun run test` suite must stay fast. Tests that shell out to
// external tools (eslint, knip, madge, tsx) or drive long-horizon
// simulations belong in src/tests/slow/ (run adhoc via `bun run test:slow`).
describe("unit suite speed guard", () => {
  const testFiles = () => findFiles(UNIT_TESTS_DIR, { exts: [".test.ts", ".test.tsx"] });

  it("no unit test spawns subprocesses (move it to src/tests/slow/ instead)", () => {
    const violations: string[] = [];
    for (const file of testFiles()) {
      const content = readFileSync(file, "utf-8");
      if (
        /from\s+["'](?:node:)?child_process["']/.test(content) ||
        /require\(\s*["'](?:node:)?child_process["']\s*\)/.test(content)
      ) {
        violations.push(file.replace(SRC + "/", ""));
      }
    }
    expect(
      violations,
      `Unit tests spawning subprocesses — move to src/tests/slow/:\n${violations.join("\n")}`
    ).toEqual([]);
  });

  it("no unit test pairs generateInitialWorld with simulateEntireBasho (real-worldgen basho sims belong in src/tests/slow/)", () => {
    // generateInitialWorld builds a complete seeded world and
    // simulateEntireBasho then plays a full 15-day tournament over it — ~1s
    // per pairing, and files using it historically measure 4-5s. Either call
    // alone is legitimate (worldgen for shape checks, basho sims on mock
    // worlds); the co-occurrence is the categorical slow-tier pattern.
    const violations: string[] = [];
    for (const file of testFiles()) {
      const content = readFileSync(file, "utf-8");
      if (
        /\bgenerateInitialWorld\s*\(/.test(content) &&
        /\bsimulateEntireBasho\s*\(/.test(content)
      ) {
        violations.push(file.replace(SRC + "/", ""));
      }
    }
    expect(
      violations,
      `Unit tests running generated-world basho sims — move to src/tests/slow/:\n${violations.join("\n")}`
    ).toEqual([]);
  });

  it("no unit test drives the autonomous sim engine (runAutoSim belongs in src/tests/slow/)", () => {
    // runAutoSim always runs a full simulated year over a generated world —
    // inherently slow. generateInitialWorld/advanceDaysFast are NOT banned:
    // they are fast on small mock worlds and used by ~50 legitimate unit
    // tests. Empirical per-file cost is enforced by testTimingsBudget instead.
    const violations: string[] = [];
    for (const file of testFiles()) {
      const content = readFileSync(file, "utf-8");
      if (/\brunAutoSim\s*\(/.test(content)) {
        violations.push(file.replace(SRC + "/", ""));
      }
    }
    expect(
      violations,
      `Unit tests calling runAutoSim — move to src/tests/slow/:\n${violations.join("\n")}`
    ).toEqual([]);
  });
});
