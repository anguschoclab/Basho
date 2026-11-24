import { describe, it, expect } from "vitest";
import { applyPhysicalMaturationTick, applyWeightJourneyTick } from "@/engine/training/WeightJourney";
import { mockRikishi } from "@tests/unit/engine/utils";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";

/**
 * Real-world maturation model — sumo recruits debut at 15-16 and grow for
 * years after (Hakuho: ~181cm/80kg at 16 → 192cm/155kg; Terunofuji kept
 * growing into his early 20s; Kyokutenho filled out late). The wonderkid ↔
 * late-bloomer spectrum must apply to height and weight, not just stats:
 * potential.heightCm/weightKg are the adult targets, the size_* maturity
 * curves + peakAgeOffset pace them, developmentSpeed scales the rate.
 */

const W: WorldState = MockFactory.createWorld({ seed: "test-maturation", year: 2025 });
const HEYA: Heya = MockFactory.createHeya("heya-1", { funds: 100000 });

function teen(over: Record<string, any>) {
  return mockRikishi("teen-1", {
    birthYear: 2025 - 16, // age 16
    stats: { height: 170, weight: 95, power: 40 } as any,
    potential: { heightCm: 185, weightKg: 150, developmentSpeed: 1.0, peakAgeOffset: 0, ceilingFraction: 1.0 } as any,
    injured: false,
    ...over,
  } as any);
}

describe("physical maturation — height", () => {
  it("a 16-year-old grows toward potential.heightCm", () => {
    const impact = applyPhysicalMaturationTick(teen({}), HEYA, W);
    expect(impact.entities?.rikishiUpdates?.get("teen-1")?.stats?.height).toBeGreaterThan(170);
  });

  it("height growth stops past the size_height peak (19, standard profile)", () => {
    const impact = applyPhysicalMaturationTick(teen({ birthYear: 2025 - 22 }), HEYA, W);
    expect(impact.entities?.rikishiUpdates?.get("teen-1")?.stats?.height ?? 170).toBe(170);
  });

  it("a late bloomer (+2 offset) still grows at 20 — Terunofuji path", () => {
    const impact = applyPhysicalMaturationTick(
      teen({
        birthYear: 2025 - 20,
        potential: { heightCm: 190, weightKg: 160, developmentSpeed: 0.75, peakAgeOffset: 2, ceilingFraction: 1.0 },
      }),
      HEYA,
      W
    );
    expect(impact.entities?.rikishiUpdates?.get("teen-1")?.stats?.height).toBeGreaterThan(170);
  });

  it("never grows above potential.heightCm and never shrinks", () => {
    const impact = applyPhysicalMaturationTick(
      teen({ stats: { height: 184.99, weight: 95, power: 40 } }),
      HEYA,
      W
    );
    expect(impact.entities?.rikishiUpdates?.get("teen-1")?.stats?.height).toBeLessThanOrEqual(185);

    const tall = teen({ stats: { height: 190, weight: 95, power: 40 } });
    const impact2 = applyPhysicalMaturationTick(tall, HEYA, W);
    expect(impact2.entities?.rikishiUpdates?.get("teen-1")?.stats?.height ?? 190).toBe(190);
  });
});

describe("physical maturation — natural weight fill-out", () => {
  it("a teen below his natural weight target fills out ~8kg/yr without a formal journey", () => {
    const impact = applyPhysicalMaturationTick(teen({}), HEYA, W);
    const gain = (impact.entities?.rikishiUpdates?.get("teen-1")?.stats?.weight ?? 95) - 95;
    expect(gain).toBeGreaterThan(0);
    expect(gain).toBeLessThanOrEqual(0.3); // ~0.15kg/wk ≈ 8kg/yr, devSpeed-scaled
  });

  it("natural fill stops at the maturity-target — a veteran who bulked early keeps his mass", () => {
    const impact = applyPhysicalMaturationTick(
      teen({ stats: { height: 180, weight: 148, power: 40 } }),
      HEYA,
      W
    );
    expect(impact.entities?.rikishiUpdates?.get("teen-1")?.stats?.weight ?? 148).toBe(148);
  });

  it("a 30-year-old no longer fills out naturally (size_weight peak ~27)", () => {
    const impact = applyPhysicalMaturationTick(
      teen({ birthYear: 2025 - 30, stats: { height: 182, weight: 120, power: 40 } }),
      HEYA,
      W
    );
    expect(impact.entities?.rikishiUpdates?.get("teen-1")?.stats?.weight ?? 120).toBe(120);
  });
});

describe("development-speed spectrum on physical growth", () => {
  it("a prodigy bulks faster on a formal weight journey (Hakuho trajectory)", () => {
    const mk = (speed: number) =>
      mockRikishi(`wj-${speed}`, {
        stats: { weight: 100, power: 50, balance: 50 } as any,
        potential: { weightKg: 160, developmentSpeed: speed, peakAgeOffset: 0, ceilingFraction: 1.0 } as any,
        weightJourney: { targetKg: 160, progressKg: 0, stalled: false, phases: ["bulking"], startWeight: 100 },
        injured: false,
      } as any);
    const slow = applyWeightJourneyTick(mk(0.7), HEYA, W);
    const fast = applyWeightJourneyTick(mk(1.4), HEYA, W);
    const slowW = slow.entities?.rikishiUpdates?.get("wj-0.7")?.stats?.weight ?? 0;
    const fastW = fast.entities?.rikishiUpdates?.get("wj-1.4")?.stats?.weight ?? 0;
    expect(fastW).toBeGreaterThan(slowW);
  });
});
