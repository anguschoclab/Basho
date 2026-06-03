/**
 * Tests that adaptability stat multiplies training gains:
 * multiplier = 0.8 + adaptability * 0.004
 *   adaptability=50 → 1.0 (neutral)
 *   adaptability=0  → 0.8 (slower learner)
 *   adaptability=100 → 1.2 (faster learner)
 */
import { describe, it, expect } from "vitest";
import { calculateGrowthVector } from "../TrainingMath";
import { mockRikishi } from "../../../__tests__/utils";
import type { TrainingProfile } from "../../../types/training";

const baseProfile: TrainingProfile = {
  intensity: "balanced",
  recovery: "normal",
  focus: "neutral",
  styleBias: "neutral",
};

describe("calculateGrowthVector — adaptability multiplier", () => {
  it("high adaptability (100) produces more growth than baseline (50)", () => {
    const rHigh = mockRikishi("high-adapt", { adaptability: 100 });
    const rBase = mockRikishi("base-adapt", { adaptability: 50 });

    const gHigh = calculateGrowthVector(baseProfile, undefined, rHigh);
    const gBase = calculateGrowthVector(baseProfile, undefined, rBase);

    // Every non-zero stat should grow faster for high adaptability
    expect(gHigh.power).toBeGreaterThan(gBase.power);
    expect(gHigh.technique).toBeGreaterThan(gBase.technique);
    expect(gHigh.speed).toBeGreaterThan(gBase.speed);
  });

  it("low adaptability (0) produces less growth than baseline (50)", () => {
    const rLow = mockRikishi("low-adapt", { adaptability: 0 });
    const rBase = mockRikishi("base-adapt", { adaptability: 50 });

    const gLow = calculateGrowthVector(baseProfile, undefined, rLow);
    const gBase = calculateGrowthVector(baseProfile, undefined, rBase);

    expect(gLow.power).toBeLessThan(gBase.power);
    expect(gLow.technique).toBeLessThan(gBase.technique);
  });

  it("adaptability=50 applies multiplier of 1.0 (neutral)", () => {
    // adaptability=50 → 0.8 + 50*0.004 = 1.0 — same as no multiplier
    // Verify by checking adaptability=0 gives exactly 0.8x relative to base
    const rLow = mockRikishi("adapt-0", { adaptability: 0, stats: { strength: 50 } as any });
    const rBase = mockRikishi("adapt-50", { adaptability: 50, stats: { strength: 50 } as any });

    const gLow = calculateGrowthVector(baseProfile, undefined, rLow);
    const gBase = calculateGrowthVector(baseProfile, undefined, rBase);

    // ratio should be close to 0.8 / 1.0 = 0.8
    const ratio = gLow.power / gBase.power;
    expect(ratio).toBeCloseTo(0.8, 1);
  });

  it("adaptability=100 applies multiplier of 1.2", () => {
    const rHigh = mockRikishi("adapt-100", { adaptability: 100, stats: { strength: 50 } as any });
    const rBase = mockRikishi("adapt-50", { adaptability: 50, stats: { strength: 50 } as any });

    const gHigh = calculateGrowthVector(baseProfile, undefined, rHigh);
    const gBase = calculateGrowthVector(baseProfile, undefined, rBase);

    // ratio should be close to 1.2 / 1.0 = 1.2
    const ratio = gHigh.power / gBase.power;
    expect(ratio).toBeCloseTo(1.2, 1);
  });
});
