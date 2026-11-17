import { describe, it, expect } from "vitest";
import { SIMULATION_CONFIG } from "@/engine/core/SimulationConfig";
import { jsaYushoPrize, jsaSanshoPrize } from "@/constants/engine/jsaEra";

describe("SimulationConfig", () => {
  describe("SIMULATION_CONFIG", () => {
    it("prize money lives in the era-keyed JSA tables", () => {
      // jsaEra.ts carries the 2026 and 2027+ schedules; the config no
      // longer exposes a flat `prizes` block to stale-read from.
      expect("prizes" in SIMULATION_CONFIG).toBe(false);
      expect(jsaYushoPrize("makuuchi", 2026)).toBe(10_000_000);
      expect(jsaSanshoPrize(2026)).toBe(2_000_000);
    });

    it("should define career milestones", () => {
      expect(SIMULATION_CONFIG.milestones.wins).toEqual([100, 200, 300, 500, 1000]);
      expect(SIMULATION_CONFIG.milestones.hofWins).toBe(500);
    });

    it("should have recruitment constants", () => {
      expect(SIMULATION_CONFIG.recruitment.durationWeeks).toBe(4);
      expect(SIMULATION_CONFIG.recruitment.playerHeyaRosterCap).toBe(30);
    });

    it("should have media constants", () => {
      expect(SIMULATION_CONFIG.media.baseBoutHeatIncrease).toBe(1.2);
      expect(SIMULATION_CONFIG.media.baseBoutHeatDecay).toBe(0.85);
      expect(SIMULATION_CONFIG.media.governanceHeadlineChance).toBe(0.05);
    });

    it("should have injury baselines defined", () => {
      expect(SIMULATION_CONFIG.injuries.weeklyBaseChance).toBe(0.005);
      expect(SIMULATION_CONFIG.injuries.maxWeeklyChance).toBe(0.12);
      expect(SIMULATION_CONFIG.injuries.boutBaseChance).toBe(0.008);
      expect(SIMULATION_CONFIG.injuries.maxBoutChance).toBe(0.06);
    });
  });
});
