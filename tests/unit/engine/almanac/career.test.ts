import { describe, it, expect } from "vitest";
import { generateCareerRecord } from "@/engine/almanac/career";
import { makeMockWorld, mockRikishi } from "@tests/unit/engine/utils";

// A simple deterministic PRNG for testing, generating values in [0, 1)
function makeSeededRNG(seed: number) {
  let state = seed;
  return () => {
    // Basic LCG constants
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe("generateCareerRecord", () => {
  it("generates a predictable baseline career record", () => {
    const world = makeMockWorld();
    world.year = 2024;
    world.currentBashoName = "hatsu";
    const rikishi = mockRikishi("r1", { shikona: "Test", rank: "jonokuchi" });

    // Seed 123 provides a predictable sequence of numbers for generation
    const rng = makeSeededRNG(123);
    const record = generateCareerRecord(rikishi, world, rng);

    expect(record.rikishiId).toBe("r1");
    expect(record.shikona).toBe("Test");
    expect(record.isActive).toBe(true);

    // With this specific seed, the career length and results are fully deterministic
    expect(record.totalWins).toBe(33);
    expect(record.totalLosses).toBe(37);
    expect(record.totalAbsences).toBe(0);
    expect(record.bashoHistory.length).toBe(10);
    expect(record.yushoCount).toBe(0);
    expect(record.longestWinStreak).toBe(5);
  });

  it("calculates debut year and history duration predictably", () => {
    const world = makeMockWorld();
    world.year = 2024;
    world.currentBashoName = "natsu";
    // Starting rank affects career length multiplier
    const rikishi = mockRikishi("r2", { shikona: "Test2", rank: "makushita", debutYear: 2020 });

    const rng = makeSeededRNG(456);
    const record = generateCareerRecord(rikishi, world, rng);

    expect(record.debutYear).toBe(2020);
    expect(record.bashoHistory.length).toBe(23);
  });
});
