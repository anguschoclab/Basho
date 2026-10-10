import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getStatLabel,
  getStatProse,
  getFatigueLabel,
  getMomentumLabel,
  getPotentialInfo,
  getRivalryHeatLabel,
  getScandalLabel,
  getPrizeLabel,
  getTraitLabel,
  getArchetypeInfo,
  getAgeLabel,
  getExperienceLabel,
  getWeightLabel,
  getHeightLabel,
  getReputationLabel,
  getInjurySeverityLabel,
  getWinRateLabel,
  hydrateDescriptor,
} from "@/engine/systems/narrative/NarrativeProse";
import { BardEngine } from "@/engine/bard/BardEngine";
import { SeededRNG } from "@/engine/rng";
import type { CombatArchetype } from "@/engine/types/combat";

vi.mock("@/engine/bard/BardEngine", () => ({
  BardEngine: {
    resolve: vi.fn(),
  },
}));

describe("NarrativeProse", () => {
  let rng: SeededRNG;

  beforeEach(() => {
    rng = new SeededRNG("test-seed");
    vi.mocked(BardEngine.resolve).mockReset();
  });

  describe("getPotentialInfo", () => {
    it("maps legacy bands to correct archive paths", () => {
      vi.mocked(BardEngine.resolve).mockReturnValue({
        text: "Mock Text",
        id: "mock_id",
        path: "mock.path" as any,
      });

      const testCases = [
        { input: "generational", expected: "Taiki Bansei" },
        { input: "star", expected: "Soshitsu Ari" },
        { input: "solid", expected: "Mikan no Taiki" },
        { input: "average", expected: "Mikan no Taiki" },
        { input: "limited", expected: "Genkai" },
      ] as const;

      for (const { input, expected } of testCases) {
        getPotentialInfo(rng, input as any);
        expect(BardEngine.resolve).toHaveBeenCalledWith(
          rng,
          `rikishi.descriptors.potential.${expected}.label`
        );
        expect(BardEngine.resolve).toHaveBeenCalledWith(
          rng,
          `rikishi.descriptors.potential.${expected}.tooltip`
        );
      }
    });
  });

  describe("getScandalLabel", () => {
    it("maps scandal bands correctly to system keys", () => {
      vi.mocked(BardEngine.resolve).mockReturnValue({
        text: "Mock Scandal",
        id: "mock_id",
        path: "mock.path" as any,
      });

      const testCases = [
        { input: "clean", expected: "none" },
        { input: "whispers", expected: "whispers" },
        { input: "scrutiny", expected: "notable" },
        { input: "scandal", expected: "severe" },
        { input: "crisis", expected: "critical" },
      ] as const;

      for (const { input, expected } of testCases) {
        getScandalLabel(rng, input as any);
        expect(BardEngine.resolve).toHaveBeenCalledWith(
          rng,
          `system.descriptors.bands.scandal.${expected}`
        );
      }
    });

    it("falls back to band string if band is not in SCANDAL_BAND_KEY", () => {
      vi.mocked(BardEngine.resolve).mockReturnValue({
        text: "Fallback",
        id: "mock_id",
        path: "mock.path" as any,
      });
      getScandalLabel(rng, "unknown_band" as any);
      expect(BardEngine.resolve).toHaveBeenCalledWith(
        rng,
        `system.descriptors.bands.scandal.unknown_band`
      );
    });
  });

  describe("getArchetypeInfo", () => {
    it("maps archetypes to correct keys with fallback", () => {
      vi.mocked(BardEngine.resolve).mockReturnValue({
        text: "Mock Archetype",
        id: "mock_id",
        path: "mock.path" as any,
      });

      const testCases = [
        { input: "defensive", expected: "Defensive_Stalwart" },
        { input: "speedster", expected: "Explosive_Blitzer" },
        { input: "trickster", expected: "Acrobatic_Trickster" },
        { input: "giant", expected: "Immovable_Mountain" },
        { input: "hybrid", expected: "All_Rounder" },
        { input: "unknown" as CombatArchetype, expected: "All_Rounder" },
      ] as const;

      for (const { input, expected } of testCases) {
        getArchetypeInfo(rng, input);
        expect(BardEngine.resolve).toHaveBeenCalledWith(
          rng,
          `rikishi.archetypes.${expected}.label`
        );
        expect(BardEngine.resolve).toHaveBeenCalledWith(
          rng,
          `rikishi.archetypes.${expected}.description`
        );
      }
    });
  });

  describe("Simple band getters", () => {
    it("resolves basic bands using simple interpolation", () => {
      vi.mocked(BardEngine.resolve).mockReturnValue({
        text: "Mock Resolve",
        id: "mock_id",
        path: "mock.path" as any,
      });

      getFatigueLabel(rng, "exhausted" as any);
      expect(BardEngine.resolve).toHaveBeenCalledWith(
        rng,
        `system.descriptors.bands.fatigue.exhausted`
      );

      getRivalryHeatLabel(rng, "grudge" as any);
      expect(BardEngine.resolve).toHaveBeenCalledWith(
        rng,
        `system.descriptors.bands.rivalry.grudge`
      );

      hydrateDescriptor(rng, "condition", "prime");
      expect(BardEngine.resolve).toHaveBeenCalledWith(
        rng,
        `rikishi.descriptors.condition.prime.label`
      );
      expect(BardEngine.resolve).toHaveBeenCalledWith(
        rng,
        `rikishi.descriptors.condition.prime.tooltip`
      );
    });
  });

  describe("getStatProse", () => {
    it("maps aliases for specific stats and falls back to simple label if text is empty", () => {
      vi.mocked(BardEngine.resolve).mockImplementation((_rng, path) => {
        if (path.includes("rikishi.stats")) {
          return { text: "", id: "mock_id", path: "mock.path" as any };
        }
        return { text: "Fallback Label", id: "mock_id", path: "mock.path" as any };
      });

      const result = getStatProse(rng, "strength", "legendary" as any);
      expect(BardEngine.resolve).toHaveBeenCalledWith(rng, "rikishi.stats.power.legendary");
      expect(BardEngine.resolve).toHaveBeenCalledWith(
        rng,
        "system.descriptors.bands.stats.legendary"
      );
      expect(result).toBe("Fallback Label");
    });

    it("returns resolved text if available", () => {
      vi.mocked(BardEngine.resolve).mockImplementation((_rng, path) => {
        if (path.includes("rikishi.stats")) {
          return { text: "Specific Prose", id: "mock_id", path: "mock.path" as any };
        }
        return { text: "Fallback Label", id: "mock_id", path: "mock.path" as any };
      });

      const result = getStatProse(rng, "speed", "abysmal" as any);
      expect(BardEngine.resolve).toHaveBeenCalledWith(rng, "rikishi.stats.speed.abysmal");
      expect(result).toBe("Specific Prose");
    });
  });

  describe("All remaining basic getters", () => {
    it("resolves all remaining bands using simple interpolation", () => {
      vi.mocked(BardEngine.resolve).mockReturnValue({
        text: "Mocked",
        id: "mock_id",
        path: "mock.path" as any,
      });

      getStatLabel(rng, "legendary" as any);
      expect(BardEngine.resolve).toHaveBeenCalledWith(
        rng,
        "system.descriptors.bands.stats.legendary"
      );

      getMomentumLabel(rng, "unstoppable" as any);
      expect(BardEngine.resolve).toHaveBeenCalledWith(
        rng,
        "system.descriptors.bands.momentum.unstoppable"
      );

      getPrizeLabel(rng, "yusho" as any);
      expect(BardEngine.resolve).toHaveBeenCalledWith(rng, "system.descriptors.bands.prizes.yusho");

      getTraitLabel(rng, "iron_will" as any);
      expect(BardEngine.resolve).toHaveBeenCalledWith(
        rng,
        "system.descriptors.bands.traits.iron_will"
      );

      getAgeLabel(rng, "veteran" as any);
      expect(BardEngine.resolve).toHaveBeenCalledWith(rng, "system.descriptors.bands.age.veteran");

      getExperienceLabel(rng, "seasoned" as any);
      expect(BardEngine.resolve).toHaveBeenCalledWith(
        rng,
        "system.descriptors.bands.experience.seasoned"
      );

      getWeightLabel(rng, "heavy" as any);
      expect(BardEngine.resolve).toHaveBeenCalledWith(rng, "system.descriptors.bands.weight.heavy");

      getHeightLabel(rng, "tall" as any);
      expect(BardEngine.resolve).toHaveBeenCalledWith(rng, "system.descriptors.bands.height.tall");

      getReputationLabel(rng, "respected" as any);
      expect(BardEngine.resolve).toHaveBeenCalledWith(
        rng,
        "system.descriptors.bands.reputation.respected"
      );

      getInjurySeverityLabel(rng, "minor" as any);
      expect(BardEngine.resolve).toHaveBeenCalledWith(rng, "system.descriptors.bands.injury.minor");

      getWinRateLabel(rng, "dominant" as any);
      expect(BardEngine.resolve).toHaveBeenCalledWith(
        rng,
        "system.descriptors.bands.winrate.dominant"
      );
    });
  });
});
