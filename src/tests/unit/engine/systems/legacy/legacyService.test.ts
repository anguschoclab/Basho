import { describe, it, expect } from "vitest";
import { LegacyService } from "@/engine/systems/legacy/LegacyService";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { SeededRNG } from "@/engine/rng";

describe("LegacyService", () => {
  const mockWorld = {
    year: 2025,
    bloodlineRegistry: { traits: {} },
    records: {
      allTime: {
        yusho: [{ rikishiId: "legend1", shikona: "Legend", value: 30 }],
        careerWins: [],
      },
    },
  } as any;

  const mockRikishi = {
    id: "rikishi1",
    shikona: "Taiho II",
    rank: "yokozuna",
    stats: { strength: 90, technique: 85, mental: 95 },
  } as any;

  it("registers a legacy trait on retirement for high-ranking rikishi", () => {
    const impact = LegacyService.registerLegacyTrait(mockWorld, mockRikishi);
    const updatedWorld = resolveImpacts(mockWorld, [impact]);

    expect(updatedWorld.bloodlineRegistry!.traits["bl_rikishi1"]).toBeDefined();
    expect(updatedWorld.bloodlineRegistry!.traits["bl_rikishi1"].label).toBe("Iron Wrists");
    expect(updatedWorld.bloodlineRegistry!.traits["bl_rikishi1"].statFloorBonus.mental).toBe(6);
  });

  it("does not register a trait for low-ranking rikishi", () => {
    const lowRankRikishi = { ...mockRikishi, rank: "maegashira" };
    const impact = LegacyService.registerLegacyTrait(mockWorld, lowRankRikishi);
    expect(impact.worldFields).toBeUndefined();
  });

  it("rolls for an emergent bloodline", () => {
    const registryWorld = {
      ...mockWorld,
      bloodlineRegistry: {
        traits: {
          bl_rikishi1: { traitId: "bl_rikishi1", statFloorBonus: { strength: 6 } },
        },
      },
    };
    const rng = new SeededRNG("test"); // Force a roll that hits 5%
    // Seed "test" might not hit 0.05. Let's find one.
    // Or just mock rng.next()
    const mockRng = {
      next: () => 0.01, // 1% < 5%
      int: (min: number, max: number) => min,
    };

    const trait = LegacyService.rollEmergentBloodline(registryWorld, mockRng as any);
    expect(trait).toBeDefined();
    expect(trait?.traitId).toBe("bl_rikishi1");
  });

  it("rolls for an ancestral legend", () => {
    const mockRng = {
      next: () => 0.01, // 1% < 2%
      int: (min: number, max: number) => 0,
    };

    const trait = LegacyService.rollAncestralLegend(mockWorld, { name: "Prospect" }, mockRng as any);
    expect(trait).toBeDefined();
    expect(trait?.ancestorShikona).toBe("Legend");
  });
});
