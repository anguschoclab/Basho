import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { SeededRNG, rngFromSeed, rngForWorld, setSeed, random } from "@/engine/rng";
import { RNGRegistry } from "@/engine/core/RNGRegistry";
import type { WorldState } from "@/engine/types/world";

const mockWorld: WorldState = {
  seed: "determinism-test-seed",
  calendar: { currentWeek: 7 },
} as unknown as WorldState;

describe("RNG determinism — SeededRNG", () => {
  it("same seed produces identical float sequences", () => {
    const rng1 = new SeededRNG("test-seed-abc");
    const rng2 = new SeededRNG("test-seed-abc");
    const seq1 = Array.from({ length: 50 }, () => rng1.next());
    const seq2 = Array.from({ length: 50 }, () => rng2.next());
    expect(seq1).toEqual(seq2);
  });

  it("different seeds produce different float sequences", () => {
    const rng1 = new SeededRNG("seed-A");
    const rng2 = new SeededRNG("seed-B");
    const seq1 = Array.from({ length: 10 }, () => rng1.next());
    const seq2 = Array.from({ length: 10 }, () => rng2.next());
    expect(seq1).not.toEqual(seq2);
  });

  it("same seed produces identical int sequences", () => {
    const rng1 = new SeededRNG("int-seed");
    const rng2 = new SeededRNG("int-seed");
    const seq1 = Array.from({ length: 30 }, () => rng1.int(0, 100));
    const seq2 = Array.from({ length: 30 }, () => rng2.int(0, 100));
    expect(seq1).toEqual(seq2);
  });

  it("same seed produces identical bool sequences", () => {
    const rng1 = new SeededRNG("bool-seed");
    const rng2 = new SeededRNG("bool-seed");
    const seq1 = Array.from({ length: 30 }, () => rng1.bool(0.3));
    const seq2 = Array.from({ length: 30 }, () => rng2.bool(0.3));
    expect(seq1).toEqual(seq2);
  });

  it("same seed produces identical gaussian sequences", () => {
    const rng1 = new SeededRNG("gauss-seed");
    const rng2 = new SeededRNG("gauss-seed");
    const seq1 = Array.from({ length: 20 }, () => rng1.gaussian(0, 1));
    const seq2 = Array.from({ length: 20 }, () => rng2.gaussian(0, 1));
    expect(seq1).toEqual(seq2);
  });

  it("same seed produces identical shuffle results", () => {
    const rng1 = new SeededRNG("shuffle-seed");
    const rng2 = new SeededRNG("shuffle-seed");
    const arr1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const arr2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    rng1.shuffle(arr1);
    rng2.shuffle(arr2);
    expect(arr1).toEqual(arr2);
  });

  it("same seed produces identical uuid sequences", () => {
    const rng1 = new SeededRNG("uuid-seed");
    const rng2 = new SeededRNG("uuid-seed");
    const ids1 = Array.from({ length: 10 }, () => rng1.uuid("RIK"));
    const ids2 = Array.from({ length: 10 }, () => rng2.uuid("RIK"));
    expect(ids1).toEqual(ids2);
  });

  it("uuid produces unique values within a single RNG instance", () => {
    const rng = new SeededRNG("uniqueness-seed");
    const ids = Array.from({ length: 100 }, () => rng.uuid("TEST"));
    const unique = new Set(ids);
    expect(unique.size).toBe(100);
  });
});

describe("RNG determinism — rngFromSeed", () => {
  it("same seed+subsystem+label produces identical sequences", () => {
    const rng1 = rngFromSeed("world-seed", "training", "week::1");
    const rng2 = rngFromSeed("world-seed", "training", "week::1");
    const seq1 = Array.from({ length: 20 }, () => rng1.next());
    const seq2 = Array.from({ length: 20 }, () => rng2.next());
    expect(seq1).toEqual(seq2);
  });

  it("different subsystem produces different sequences", () => {
    const rng1 = rngFromSeed("world-seed", "training", "week::1");
    const rng2 = rngFromSeed("world-seed", "scouting", "week::1");
    expect(rng1.next()).not.toBe(rng2.next());
  });

  it("different label produces different sequences", () => {
    const rng1 = rngFromSeed("world-seed", "training", "week::1");
    const rng2 = rngFromSeed("world-seed", "training", "week::2");
    expect(rng1.next()).not.toBe(rng2.next());
  });
});

describe("RNG determinism — rngForWorld", () => {
  it("same world state produces identical sequences", () => {
    const world1 = { ...mockWorld, seed: "world-xyz" } as unknown as WorldState;
    const world2 = { ...mockWorld, seed: "world-xyz" } as unknown as WorldState;
    const rng1 = rngForWorld(world1, "training", "week::5");
    const rng2 = rngForWorld(world2, "training", "week::5");
    const seq1 = Array.from({ length: 20 }, () => rng1.next());
    const seq2 = Array.from({ length: 20 }, () => rng2.next());
    expect(seq1).toEqual(seq2);
  });

  it("different world seeds produce different sequences", () => {
    const world1 = { ...mockWorld, seed: "seed-A" } as unknown as WorldState;
    const world2 = { ...mockWorld, seed: "seed-B" } as unknown as WorldState;
    const rng1 = rngForWorld(world1, "training", "week::5");
    const rng2 = rngForWorld(world2, "training", "week::5");
    expect(rng1.next()).not.toBe(rng2.next());
  });
});

describe("RNG determinism — RNGRegistry", () => {
  it("same world+system+cadence produces identical sequences", () => {
    const rng1 = RNGRegistry.getSystemRNG(mockWorld, "training", "week::10");
    const rng2 = RNGRegistry.getSystemRNG(mockWorld, "training", "week::10");
    const seq1 = Array.from({ length: 20 }, () => rng1.next());
    const seq2 = Array.from({ length: 20 }, () => rng2.next());
    expect(seq1).toEqual(seq2);
  });

  it("different cadence produces different sequences", () => {
    const rng1 = RNGRegistry.getSystemRNG(mockWorld, "training", "week::1");
    const rng2 = RNGRegistry.getSystemRNG(mockWorld, "training", "week::2");
    expect(rng1.next()).not.toBe(rng2.next());
  });

  it("different system produces different sequences", () => {
    const rng1 = RNGRegistry.getSystemRNG(mockWorld, "training", "week::1");
    const rng2 = RNGRegistry.getSystemRNG(mockWorld, "scouting", "week::1");
    expect(rng1.next()).not.toBe(rng2.next());
  });

  it("getTrainingRNG is deterministic for same world state", () => {
    const world1 = {
      ...mockWorld,
      seed: "train-seed",
      calendar: { currentWeek: 3 },
    } as unknown as WorldState;
    const world2 = {
      ...mockWorld,
      seed: "train-seed",
      calendar: { currentWeek: 3 },
    } as unknown as WorldState;
    const rng1 = RNGRegistry.getTrainingRNG(world1);
    const rng2 = RNGRegistry.getTrainingRNG(world2);
    expect(rng1.next()).toBe(rng2.next());
  });

  it("getScoutingRNG is deterministic for same world state", () => {
    const world1 = {
      ...mockWorld,
      seed: "scout-seed",
      calendar: { currentWeek: 5 },
    } as unknown as WorldState;
    const world2 = {
      ...mockWorld,
      seed: "scout-seed",
      calendar: { currentWeek: 5 },
    } as unknown as WorldState;
    const rng1 = RNGRegistry.getScoutingRNG(world1);
    const rng2 = RNGRegistry.getScoutingRNG(world2);
    expect(rng1.next()).toBe(rng2.next());
  });
});

describe("RNG determinism — global random()", () => {
  it("setSeed + random() is deterministic", () => {
    setSeed("global-test-seed-1");
    const seq1 = Array.from({ length: 20 }, () => random());

    setSeed("global-test-seed-1");
    const seq2 = Array.from({ length: 20 }, () => random());

    expect(seq1).toEqual(seq2);
  });

  it("different global seeds produce different sequences", () => {
    setSeed("global-seed-A");
    const val1 = random();

    setSeed("global-seed-B");
    const val2 = random();

    expect(val1).not.toBe(val2);
  });
});

describe("RNG determinism — no Math.random() in engine source", () => {
  const ENGINE_DIR = join(process.cwd(), "src", "engine");

  function collectTsFiles(dir: string): string[] {
    const results: string[] = [];
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        results.push(...collectTsFiles(fullPath));
      } else if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) {
        results.push(fullPath);
      }
    }
    return results;
  }

  it("no engine source file calls Math.random()", () => {
    const files = collectTsFiles(ENGINE_DIR);
    const violations: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      // Strip comments to avoid false positives
      const stripped = content.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
      if (/\bMath\.random\s*\(/.test(stripped)) {
        violations.push(file);
      }
    }
    expect(violations, `Math.random() found in engine source: ${violations.join(", ")}`).toEqual(
      []
    );
  });
});
