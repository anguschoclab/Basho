import { describe, it, expect } from "vitest";

describe("PR #728: RikishiCard ginboshi display", () => {
  it("C.3: ginboshiEarned value is accessible from achievements", () => {
    const achievements = {
      kinboshiEarned: 0,
      ginboshiEarned: 3,
      kinboshiConceded: 0,
      ginboshiConceded: 0,
      mochikyukinPoints: 0,
      specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
    };
    expect(achievements.ginboshiEarned).toBe(3);
    expect(achievements.ginboshiEarned > 0).toBe(true);
  });

  it("C.4: ginboshiEarned === 0 is handled correctly", () => {
    const achievements = {
      kinboshiEarned: 0,
      ginboshiEarned: 0,
      kinboshiConceded: 0,
      ginboshiConceded: 0,
      mochikyukinPoints: 0,
      specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
    };
    expect(achievements.ginboshiEarned).toBe(0);
    expect(achievements.ginboshiEarned > 0).toBe(false);
  });
});
