/**
 * Spec — per-heya roster targets (JSA 2026).
 *
 * The flat TARGET_ROSTER_SIZE=30 produced a ~1,320-man demographic floor vs
 * the real ~590. Real stables run heavy-tailed sizes (Isegahama 33 →
 * Nishikido ~5), so the equilibrium target is per-heya: the population
 * controller sums `heya.rosterTarget`, the allocator splits the gap by
 * per-heya headroom, and NPC appetite keys off the same field.
 */
import { describe, it, expect } from "vitest";
import {
  HEYA_ROSTER_TARGETS,
  ROSTER_TARGET_BY_STATURE,
  DEFAULT_ROSTER_TARGET,
} from "@/constants/engine/generation";
import { getHeyaRosterTarget } from "@/engine/generation/RecruitmentController";
import { createStables } from "@/engine/generation/HeyaFactory";
import { rngFromSeed } from "@/engine/core/rng";
import { MockFactory } from "@tests/helpers/utils/MockFactory";

/** Top-10 counts are the user's verified 2026 tallies — exact, not bands. */
const TOP10: Record<string, number> = {
  Isegahama: 33,
  Takasago: 26,
  Sakaigawa: 24,
  Tamanoi: 24,
  Nishonoseki: 23,
  Oitekaze: 21,
  Kokonoe: 19,
  Takadagawa: 19,
  Kise: 18,
  Futagoyama: 18,
};

describe("HEYA_ROSTER_TARGETS", () => {
  const { heyaMap } = createStables(rngFromSeed("roster-targets", "worldgen", "world"));

  it("covers every genesis stable", () => {
    for (const heya of heyaMap.values()) {
      expect(HEYA_ROSTER_TARGETS[heya.name]).toBeDefined();
    }
    // ... and nothing else — a stale entry for a closed stable is a bug.
    expect(Object.keys(HEYA_ROSTER_TARGETS).sort()).toEqual(
      [...heyaMap.values()].map((h) => h.name).sort()
    );
  });

  it("matches the verified 2026 top-10 tallies", () => {
    for (const [name, target] of Object.entries(TOP10)) {
      expect(HEYA_ROSTER_TARGETS[name]).toBe(target);
    }
  });

  it("sums to the real ~590 active population", () => {
    const total = Object.values(HEYA_ROSTER_TARGETS).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(580);
    expect(total).toBeLessThanOrEqual(610);
  });

  it("keeps every stable viable (>= 4 members)", () => {
    for (const target of Object.values(HEYA_ROSTER_TARGETS)) {
      expect(target).toBeGreaterThanOrEqual(4);
    }
  });

  it("genesis stamps each heya's rosterTarget from the map", () => {
    for (const heya of heyaMap.values()) {
      expect(heya.rosterTarget).toBe(HEYA_ROSTER_TARGETS[heya.name]);
    }
  });
});

describe("getHeyaRosterTarget", () => {
  it("returns the stamped per-heya target", () => {
    const heya = MockFactory.createHeya("h1", { rosterTarget: 25 });
    expect(getHeyaRosterTarget(heya)).toBe(25);
  });

  it("falls back to DEFAULT_ROSTER_TARGET for unstamped heyas", () => {
    const heya = MockFactory.createHeya("h2", { rosterTarget: undefined });
    expect(getHeyaRosterTarget(heya)).toBe(DEFAULT_ROSTER_TARGET);
  });
});

describe("ROSTER_TARGET_BY_STATURE", () => {
  it("is monotone by stature band for founded stables", () => {
    expect(ROSTER_TARGET_BY_STATURE.legendary).toBeGreaterThan(
      ROSTER_TARGET_BY_STATURE.established
    );
    expect(ROSTER_TARGET_BY_STATURE.established).toBeGreaterThan(
      ROSTER_TARGET_BY_STATURE.new
    );
    expect(ROSTER_TARGET_BY_STATURE.new).toBeGreaterThanOrEqual(4);
  });
});
