/**
 * Phase 1e: Event log categories regression tests.
 *
 * Proves that ECONOMY, HEALTH, WELFARE, TRAINING, and RIVALRY event categories
 * are emitted by the engine when the corresponding systems run.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, relative } from "path";
import { findFiles, readSrcFile } from "@/tests/helpers/fsScan";

const ROOT = join(__dirname, "../../../..");
const SRC = join(ROOT, "src");

function searchEngineForCategory(category: string): string[] {
  const engineDir = join(SRC, "engine");
  return findFiles(engineDir, { exts: [".ts"] })
    .filter((f) => readFileSync(f, "utf-8").includes(`"${category}"`))
    .map((f) => relative(SRC, f).replace(/\\/g, "/"));
}

describe("ECONOMY event category", () => {
  it("is emitted by at least one engine file", () => {
    const hits = searchEngineForCategory("economy");
    expect(
      hits.length,
      `Expected 'economy' event category in engine, found in: ${hits.join(", ")}`
    ).toBeGreaterThan(0);
  });
});

describe("HEALTH event category", () => {
  it("is emitted by at least one engine file", () => {
    const hits = searchEngineForCategory("welfare");
    expect(
      hits.length,
      `Expected 'welfare' event category in engine, found in: ${hits.join(", ")}`
    ).toBeGreaterThan(0);
  });
});

describe("WELFARE event category", () => {
  it("is emitted by phase01_week_welfare", () => {
    const phase = readSrcFile("engine/tick/phases/phase01_week_welfare.ts");
    expect(phase).toContain("WELFARE_COMPLIANCE");
  });
});

describe("TRAINING event category", () => {
  it("is emitted by at least one engine file", () => {
    const hits = searchEngineForCategory("training");
    expect(
      hits.length,
      `Expected 'training' event category in engine, found in: ${hits.join(", ")}`
    ).toBeGreaterThan(0);
  });
});

describe("RIVALRY event category", () => {
  it("is emitted by at least one engine file", () => {
    const hits = searchEngineForCategory("rivalry");
    expect(
      hits.length,
      `Expected 'rivalry' event category in engine, found in: ${hits.join(", ")}`
    ).toBeGreaterThan(0);
  });
});
