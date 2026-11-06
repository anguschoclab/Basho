/**
 * T1.5 — achievement cabinet: awarded once against real world state,
 * never re-awarded, cosmetic (no stat stakes).
 */
import { describe, it, expect } from "vitest";
import { checkYearlyAchievements } from "@/engine/achievements/AchievementService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, makeMockHeya, mockRikishi } from "@tests/unit/engine/utils";

describe("checkYearlyAchievements (T1.5)", () => {
  it("awards first_sekitori when a makuuchi rikishi exists", () => {
    const world = makeMockWorld({
      seed: "ach",
      year: 2030,
      playerHeyaId: "h1",
      heyas: new Map([["h1", makeMockHeya("h1")]]),
      rikishi: new Map([["r1", mockRikishi("r1", { heyaId: "h1", division: "makuuchi" })]]),
    });
    const resolved = resolveImpacts(world, [checkYearlyAchievements(world)]);
    expect(resolved.achievements?.some((a) => a.id === "first_sekitori")).toBe(true);
  });

  it("awards solvent at ¥50M+ and never re-awards", () => {
    const world = makeMockWorld({
      seed: "ach2",
      year: 2030,
      playerHeyaId: "h1",
      heyas: new Map([["h1", makeMockHeya("h1", { funds: 60_000_000 })]]),
      rikishi: new Map(),
    });
    const once = resolveImpacts(world, [checkYearlyAchievements(world)]);
    expect(once.achievements?.some((a) => a.id === "solvent")).toBe(true);
    const count = once.achievements!.length;
    const twice = resolveImpacts(once, [checkYearlyAchievements(once)]);
    expect(twice.achievements).toHaveLength(count);
  });

  it("awards nothing below all thresholds", () => {
    const world = makeMockWorld({
      seed: "ach3",
      year: 2030,
      playerHeyaId: "h1",
      heyas: new Map([["h1", makeMockHeya("h1", { funds: 1_000 })]]),
      rikishi: new Map(),
    });
    const resolved = resolveImpacts(world, [checkYearlyAchievements(world)]);
    expect(resolved.achievements ?? []).toHaveLength(0);
  });
});
