/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { consolidateOyakataMemory, makeNPCWeeklyDecision } from "../npcAI";
import { resolveImpacts } from "../core/ImpactResolver";
import * as PersonaService from "../systems/NPCPersonaService";
import { WorldState } from "../types/world";
import { Id } from "../types/common";

vi.mock("../systems/NPCPersonaService", () => ({
  getManagerPersona: vi.fn(),
}));

const mockPersona = {
  perception: {
    moraleBand: "neutral",
    runwayBand: "comfortable",
    rosterSize: 5,
    rosterStrengthBand: "competitive",
    rikishiPerceptions: [],
  },
  riskAppetite: 0.5,
  welfareDiscipline: 0.5,
  mood: "content",
  archetype: "traditionalist",
  traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
  quirks: [],
  styleBias: "neutral",
};

describe("NPC AI Agentic Refactor", () => {
  const mockWorld = {
    week: 1,
    year: 1990,
    heyas: new Map(),
    oyakata: new Map(),
    rikishi: new Map(),
    npcScoutingPriorities: {},
  } as unknown as WorldState;

  const heyaId = "heya-1" as Id;
  const oyakataId = "oyakata-1" as Id;

  const mockHeya = {
    id: heyaId,
    name: "Test Heya",
    oyakataId: oyakataId,
    rikishiIds: [],
  };

  const mockOyakata = {
    id: oyakataId,
    archetype: "traditionalist",
    mood: "content",
    memory: undefined,
  };

  mockWorld.heyas.set(heyaId, mockHeya as any);
  mockWorld.oyakata.set(oyakataId, mockOyakata as any);

  describe("Phase 1: Background Consolidation", () => {
    it("should initialize memory if missing", () => {
      const impact = consolidateOyakataMemory(mockWorld, heyaId, { moraleBand: "neutral" });
      const updatedWorld = resolveImpacts(mockWorld, [impact]);
      const updatedOyakata = updatedWorld.oyakata.get(oyakataId);
      expect(updatedOyakata?.memory).toBeDefined();
      expect((updatedOyakata?.memory as any).coreDirectives).toContain(
        "Prioritize traditionalist values"
      );
    });

    it("should flag skeptical conflicts (e.g. morale drop vs content mood)", () => {
      mockOyakata.mood = "content";
      const impact = consolidateOyakataMemory(mockWorld, heyaId, { moraleBand: "mutinous" });
      const updatedWorld = resolveImpacts(mockWorld, [impact]);
      const updatedOyakata = updatedWorld.oyakata.get(oyakataId);
      const obs = (updatedOyakata?.memory as any).observations.find(
        (o: any) => o.type === "alignment"
      );
      expect(obs).toBeDefined();
      expect(obs.summary).toContain("Unexpected morale collapse");
    });

    it("should prune noise (limit to 10 observations)", () => {
      if (!mockOyakata.memory) {
        (mockOyakata as any).memory = {
          observations: [],
          coreDirectives: [],
          lastConsolidationTick: 0,
        };
      }
      const memory = mockOyakata.memory as any;
      memory.observations = [];
      for (let i = 0; i < 15; i++) {
        memory.observations.push({ tick: i, type: "test", summary: `obs ${i}`, importance: i });
      }
      const impact = consolidateOyakataMemory(mockWorld, heyaId, { moraleBand: "neutral" });
      const updatedWorld = resolveImpacts(mockWorld, [impact]);
      const updatedOyakata = updatedWorld.oyakata.get(oyakataId);
      const updatedMemory = updatedOyakata?.memory as any;
      expect(updatedMemory.observations.length).toBeLessThanOrEqual(10);
      // Ensure most important remains
      expect(updatedMemory.observations.some((o: any) => o.importance === 14)).toBe(true);
    });
  });

  describe("Phase 2 & 3: Delegation & Lead Review", () => {
    it("should override worker caution with punishing intensity when furious", () => {
      (PersonaService.getManagerPersona as ReturnType<typeof vi.fn>).mockReturnValue({
        ...mockPersona,
        perception: {
          ...mockPersona.perception,
          welfareRiskBand: "critical", // This forces the Training Worker to be conservative
        },
        mood: "furious",
      } as any);

      const decision = makeNPCWeeklyDecision(mockWorld, heyaId);
      expect(decision.mood).toBe("furious");
      expect(decision.trainingIntensity).toBe("punishing");
      expect(decision.reasoning.some((r) => r.includes("[Lead Review]"))).toBe(true);
    });
  });
});
