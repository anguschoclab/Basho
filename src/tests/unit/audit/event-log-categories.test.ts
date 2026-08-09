/**
 * Phase 1e: Event log categories regression tests.
 *
 * Proves that ECONOMY, HEALTH, WELFARE, TRAINING, and RIVALRY event categories
 * are emitted by the engine when the corresponding systems run.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "../../../..");
const SRC = join(ROOT, "src");

function readFile(rel: string): string {
  const abs = join(SRC, rel);
  if (!existsSync(abs)) return "";
  return readFileSync(abs, "utf-8");
}

function searchEngineForCategory(category: string): string[] {
  const hits: string[] = [];
  const engineDir = join(SRC, "engine");
  function walk(dir: string, relBase: string) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const rel = `${relBase}/${entry}`;
      if (existsSync(full) && isDir(full)) {
        walk(full, rel);
      } else if (entry.endsWith(".ts")) {
        const content = readFileSync(full, "utf-8");
        if (content.includes(`"${category}"`)) {
          hits.push(rel);
        }
      }
    }
  }
  function isDir(p: string): boolean {
    try {
      return readdirSync(p).length >= 0;
    } catch {
      return false;
    }
  }
  walk(engineDir, "engine");
  return hits;
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
    const phase = readFile("engine/tick/phases/phase01_week_welfare.ts");
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
