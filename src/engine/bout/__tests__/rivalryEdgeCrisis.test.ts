/**
 * Tests that rivalry spite boosts mental composure during edge crisis recovery.
 * boutResolver.ts already applies rivalry heat to aggression (tachiai).
 * This test verifies the additional spite→mental pathway for edge crisis.
 */
import { describe, it, expect } from "vitest";
import { edgeCrisisRecoveryChance } from "../boutPhysics";
import { mockRikishi } from "../../__tests__/utils";

describe("edgeCrisisRecoveryChance — rivalry spite mental boost", () => {
  it("higher mental score produces higher recovery chance (baseline verification)", () => {
    const lowMental = mockRikishi("low", { mental: 20 });
    const highMental = mockRikishi("high", { mental: 80 });

    const lowChance = edgeCrisisRecoveryChance(lowMental, 0.3, 0, 1.0);
    const highChance = edgeCrisisRecoveryChance(highMental, 0.3, 0, 1.0);

    expect(highChance).toBeGreaterThan(lowChance);
  });

  it("rivalry spite bonus boosts edge crisis recovery via mental modifier", () => {
    // The rivalry spite boost increases the effective mental for recovery.
    // boutResolver passes a rikishi with boosted mental to boutPhysics when spite > 0.
    // Here we test that a fighter with higher effective mental recovers better.

    const base = mockRikishi("fighter", { mental: 50 });
    const withRivalryBoost = mockRikishi("fighter-boosted", { mental: 65 }); // +15 from spite

    const baseChance = edgeCrisisRecoveryChance(base, 0.3, 0, 1.0);
    const boostedChance = edgeCrisisRecoveryChance(withRivalryBoost, 0.3, 0, 1.0);

    expect(boostedChance).toBeGreaterThan(baseChance);
    // Mental factor: (65-50)*0.005 = 0.075 additional
    expect(boostedChance - baseChance).toBeCloseTo(0.075, 3);
  });
});

/**
 * Integration: boutResolver applies rivalry spite to mental before calling boutPhysics.
 * This is tested via the module exports, not full bout simulation.
 */
import { applyRivalryToRikishi } from "../../bout/boutResolver";

describe("applyRivalryToRikishi — spite boosts mental for edge crisis", () => {
  it("boosts mental by up to 20% when spite is at max (100)", () => {
    const r = mockRikishi("r", { mental: 50, aggression: 50 });
    const boosted = applyRivalryToRikishi(r, { heat: 100, spite: 100 });

    expect(boosted.mental).toBeGreaterThan(r.mental);
    // spite=100 → spite01=1.0 → mental *= (1 + 1.0*0.2) = 1.2 → 60
    expect(boosted.mental).toBeCloseTo(60, 1);
  });

  it("does not modify mental when spite is 0", () => {
    const r = mockRikishi("r", { mental: 50, aggression: 50 });
    const boosted = applyRivalryToRikishi(r, { heat: 50, spite: 0 });

    expect(boosted.mental).toBe(r.mental);
  });

  it("still boosts aggression via heat (existing behavior)", () => {
    const r = mockRikishi("r", { mental: 50, aggression: 50 });
    const boosted = applyRivalryToRikishi(r, { heat: 100, spite: 0 });

    expect(boosted.aggression).toBeGreaterThan(r.aggression);
  });
});
