import { describe, it, expect } from "vitest";
import { SIMULATION_CONFIG } from "@/engine/core/SimulationConfig";

describe("SimulationConfig", () => {
  describe("SIMULATION_CONFIG", () => {
    it("should have defined prize amounts (2027 JSA revision)", () => {
      expect(SIMULATION_CONFIG.prizes.yusho).toBe(20_000_000);
      expect(SIMULATION_CONFIG.prizes.junYusho).toBe(2_000_000);
      expect(SIMULATION_CONFIG.prizes.specialPrize).toBe(3_000_000);
    });

    it("should have per-division yusho prizes", () => {
      expect(SIMULATION_CONFIG.prizes.yushoByDivision).toBeDefined();
      expect(SIMULATION_CONFIG.prizes.yushoByDivision.makuuchi).toBe(20_000_000);
      expect(SIMULATION_CONFIG.prizes.yushoByDivision.juryo).toBe(3_000_000);
      expect(SIMULATION_CONFIG.prizes.yushoByDivision.makushita).toBe(700_000);
      expect(SIMULATION_CONFIG.prizes.yushoByDivision.sandanme).toBe(500_000);
      expect(SIMULATION_CONFIG.prizes.yushoByDivision.jonidan).toBe(300_000);
      expect(SIMULATION_CONFIG.prizes.yushoByDivision.jonokuchi).toBe(200_000);
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
