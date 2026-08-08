import { describe, it, expect } from "vitest";
import { rngFromSeed, SeededRNG, setSeed, random } from "@/engine/rng";
import { RNGRegistry } from "@/engine/core/RNGRegistry";
import type { WorldState } from "@/engine/types/world";

function makeMockWorld(seed: string): WorldState {
  return { seed } as unknown as WorldState;
}

describe("L4.4: RNG determinism — same seed produces same sequence", () => {
  it("SeededRNG with same seed produces identical sequences", () => {
    const rng1 = new SeededRNG("test-seed-1");
    const rng2 = new SeededRNG("test-seed-1");
    const seq1 = Array.from({ length: 100 }, () => rng1.next());
    const seq2 = Array.from({ length: 100 }, () => rng2.next());
    expect(seq1).toEqual(seq2);
  });

  it("Different seeds produce different sequences", () => {
    const rng1 = new SeededRNG("seed-a");
    const rng2 = new SeededRNG("seed-b");
    const seq1 = Array.from({ length: 10 }, () => rng1.next());
    const seq2 = Array.from({ length: 10 }, () => rng2.next());
    expect(seq1).not.toEqual(seq2);
  });

  it("rngFromSeed is deterministic for same (seed, subsystem, label)", () => {
    const rng1 = rngFromSeed("world-1", "training", "week::1");
    const rng2 = rngFromSeed("world-1", "training", "week::1");
    expect(Array.from({ length: 50 }, () => rng1.next())).toEqual(
      Array.from({ length: 50 }, () => rng2.next())
    );
  });

  it("rngFromSeed with different subsystem produces different sequences", () => {
    const rng1 = rngFromSeed("world-1", "training", "week::1");
    const rng2 = rngFromSeed("world-1", "scouting", "week::1");
    expect(Array.from({ length: 10 }, () => rng1.next())).not.toEqual(
      Array.from({ length: 10 }, () => rng2.next())
    );
  });

  it("RNGRegistry.getSystemRNG is deterministic", () => {
    const world = makeMockWorld("registry-test");
    const rng1 = RNGRegistry.getSystemRNG(world, "training", "week::5");
    const rng2 = RNGRegistry.getSystemRNG(world, "training", "week::5");
    expect(Array.from({ length: 50 }, () => rng1.next())).toEqual(
      Array.from({ length: 50 }, () => rng2.next())
    );
  });

  it("RNGRegistry.getTrainingRNG changes with week", () => {
    const world = makeMockWorld("registry-test");
    world.calendar = { currentWeek: 1 } as never;
    const rng1 = RNGRegistry.getTrainingRNG(world);
    world.calendar = { currentWeek: 2 } as never;
    const rng2 = RNGRegistry.getTrainingRNG(world);
    expect(Array.from({ length: 10 }, () => rng1.next())).not.toEqual(
      Array.from({ length: 10 }, () => rng2.next())
    );
  });

  it("global setSeed + random is deterministic", () => {
    setSeed("global-test-1");
    const seq1 = Array.from({ length: 20 }, () => random());
    setSeed("global-test-1");
    const seq2 = Array.from({ length: 20 }, () => random());
    expect(seq1).toEqual(seq2);
  });

  it("SeededRNG.int is within bounds and deterministic", () => {
    const rng1 = new SeededRNG("int-test");
    const rng2 = new SeededRNG("int-test");
    for (let i = 0; i < 100; i++) {
      const v1 = rng1.int(0, 100);
      const v2 = rng2.int(0, 100);
      expect(v1).toBe(v2);
      expect(v1).toBeGreaterThanOrEqual(0);
      expect(v1).toBeLessThanOrEqual(100);
    }
  });

  it("SeededRNG.uuid is deterministic", () => {
    const rng1 = new SeededRNG("uuid-test");
    const rng2 = new SeededRNG("uuid-test");
    for (let i = 0; i < 10; i++) {
      expect(rng1.uuid("RIK")).toBe(rng2.uuid("RIK"));
    }
  });

  it("SeededRNG.shuffle is deterministic", () => {
    const rng1 = new SeededRNG("shuffle-test");
    const rng2 = new SeededRNG("shuffle-test");
    const arr1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const arr2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    rng1.shuffle(arr1);
    rng2.shuffle(arr2);
    expect(arr1).toEqual(arr2);
  });
});
