import { describe, it, expect, vi, beforeEach } from "vitest";
import { DefaultFinanceStrategy } from "../npcFinanceStrategy";
import { DefaultRecruitmentStrategy } from "../npcRecruitmentStrategy";
import { DefaultRetirementStrategy } from "../npcRetirementStrategy";
import { WorldState } from "../types/world";
import { Heya } from "../types/heya";
import { Oyakata } from "../types/oyakata";
import { Rikishi } from "../types/rikishi";
import * as lifeCycle from "../lifecycle";
import * as market from "../myosekiMarket";

vi.mock("../lifecycle", () => ({
  checkRetirement: vi.fn()
}));

vi.mock("../myosekiMarket", () => ({
  buyMyoseki: vi.fn()
}));

describe("NPC Strategies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Finance Strategy", () => {
    it("should buy myoseki if funds are above threshold and oyakata is ambitious", () => {
      const world = {
        myosekiMarket: {
          stocks: {
            "s1": { id: "s1", status: "available", askingPrice: 100_000_000 }
          }
        }
      } as unknown as WorldState;
      const heya = { id: "h1", funds: 600_000_000 } as unknown as Heya;
      const oyakata = { id: "o1", traits: { ambition: 90, risk: 50 } } as unknown as Oyakata;

      DefaultFinanceStrategy.evaluateFinances(world, heya, oyakata);
      expect(market.buyMyoseki).toHaveBeenCalledWith(world, "o1", "h1", "s1");
    });

    it("should NOT buy myoseki if funds are below threshold", () => {
      const world = {
        myosekiMarket: {
          stocks: {
            "s1": { id: "s1", status: "available", askingPrice: 100_000_000 }
          }
        }
      } as unknown as WorldState;
      const heya = { id: "h1", funds: 200_000_000 } as unknown as Heya;
      const oyakata = { id: "o1", traits: { ambition: 90, risk: 50 } } as unknown as Oyakata;

      DefaultFinanceStrategy.evaluateFinances(world, heya, oyakata);
      expect(market.buyMyoseki).not.toHaveBeenCalled();
    });
  });

  describe("Recruitment Strategy", () => {
    it("should return correct number of vacancies based on ambition", () => {
      const world = {} as WorldState;
      const heya = { id: "h1", rikishiIds: ["r1", "r2", "r3", "r4", "r5"] } as unknown as Heya;
      const oyakata = { id: "o1", traits: { ambition: 90, tradition: 50 } } as unknown as Oyakata;

      const vacancies = DefaultRecruitmentStrategy.evaluateVacancies(world, heya, oyakata);
      // Target = 8 + 2 (ambition > 75) = 10. Current = 5. Vacancies = 5.
      expect(vacancies).toBe(5);
    });

    it("should return 0 vacancies if recruitment freeze is active", () => {
      const world = {} as WorldState;
      const heya = { 
        id: "h1", 
        rikishiIds: ["r1"],
        welfareState: { sanctions: { recruitmentFreezeWeeks: 2 } }
      } as unknown as Heya;
      const oyakata = { id: "o1", traits: { ambition: 90, tradition: 50 } } as unknown as Oyakata;

      const vacancies = DefaultRecruitmentStrategy.evaluateVacancies(world, heya, oyakata);
      expect(vacancies).toBe(0);
    });
  });

  describe("Retirement Strategy", () => {
    it("should retire rikishi if checkRetirement returns a reason", () => {
      const rikishi = { id: "r1", shikona: "TestR" } as Rikishi;
      const world = {
        rikishi: new Map([["r1", rikishi]]),
        seed: "test",
        calendar: { year: 2026 }
      } as unknown as WorldState;
      const heya = { id: "h1", rikishiIds: ["r1"] } as unknown as Heya;
      const oyakata = { id: "o1", archetype: "nurturer" } as unknown as Oyakata;

      vi.mocked(lifeCycle.checkRetirement).mockReturnValue("Injury");

      DefaultRetirementStrategy.evaluateRetirements(world, heya, oyakata);

      expect(heya.rikishiIds).not.toContain("r1");
      expect(world.rikishi.has("r1")).toBe(false);
    });
  });
});
