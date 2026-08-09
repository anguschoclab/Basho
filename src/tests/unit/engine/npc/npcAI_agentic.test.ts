import { describe, it, expect, vi } from "vitest";
import { consolidateOyakataMemory, makeNPCWeeklyDecision } from "@/engine/npcAI";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import * as PersonaService from "@/engine/systems/NPCPersonaService";
import { MockFactory } from "../../../helpers/utils/MockFactory";
import type { Id } from "@/engine/types/common";

vi.mock("@/engine/systems/NPCPersonaService", () => ({
  getManagerPersona: vi.fn(),
}));

const mockPersona = {
  perception: {
    moraleBand: "neutral",
    runwayBand: "comfortable",
    rosterSize: 5,
    rosterStrengthBand: "competitive",
    rikishiPerceptions: [],
  } as any,
  riskAppetite: 0.5,
  welfareDiscipline: 0.5,
  mood: "content",
  archetype: "traditionalist",
  traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
  quirks: [],
  styleBias: "neutral",
};

describe("NPC AI Agentic Refactor", () => {
  const heyaId = "heya-1" as Id;
  const oyakataId = "oyakata-1" as Id;

  const world = MockFactory.createWorld({
    week: 1,
    year: 1990,
    npcScoutingPriorities: {},
  });

  const heya = MockFactory.createHeya(heyaId, {
    oyakataId: oyakataId,
  });

  const oyakata = MockFactory.createOyakata(oyakataId, {
    heyaId,
    archetype: "traditionalist",
    mood: "content",
  });

  world.heyas.set(heyaId, heya);
  world.oyakata.set(oyakataId, oyakata);

  describe("Phase 1: Background Consolidation", () => {
    it("should initialize memory! if missing", () => {
      const impact = consolidateOyakataMemory(world, heyaId, { moraleBand: "neutral" } as any);
      const updatedWorld = resolveImpacts(world, [impact]);
      const updatedOyakata = updatedWorld.oyakata.get(oyakataId);
      expect(updatedOyakata?.memory).toBeDefined();
      expect(updatedOyakata?.memory?.coreDirectives).toContain("Prioritize traditionalist values");
    });

    it("should flag skeptical conflicts (e.g. morale drop vs content mood)", () => {
      oyakata.mood = "content";
      const impact = consolidateOyakataMemory(world, heyaId, { moraleBand: "mutinous" } as any);
      const updatedWorld = resolveImpacts(world, [impact]);
      const updatedOyakata = updatedWorld.oyakata.get(oyakataId);
      const obs = updatedOyakata?.memory?.observations.find((o) => o.type === "alignment");
      expect(obs).toBeDefined();
      expect(obs?.summary).toContain("Unexpected morale collapse");
    });

    it("should prune noise (limit to 10 observations)", () => {
      const workingOyakata = world.oyakata.get(oyakataId);
      if (!workingOyakata) throw new Error("Oyakata not found");
      workingOyakata.memory = {
        observations: [],
        coreDirectives: [],
        lastConsolidationTick: 0,
        planHistory: [],
        decisionHistory: [],
        opponentModels: {},
      };

      const memory = workingOyakata.memory!;
      memory.observations = [];
      for (let i = 0; i < 15; i++) {
        memory.observations.push({
          tick: i,
          type: "alignment", // Changed from 'test' to valid type
          summary: `obs ${i}`,
          importance: i,
        });
      }
      const impact = consolidateOyakataMemory(world, heyaId, { moraleBand: "neutral" } as any);
      const updatedWorld = resolveImpacts(world, [impact]);
      const updatedOyakata = updatedWorld.oyakata.get(oyakataId);
      const updatedMemory = updatedOyakata?.memory;
      expect(updatedMemory?.observations.length).toBeLessThanOrEqual(10);
      // Ensure most important remains
      expect(updatedMemory?.observations.some((o) => o.importance === 14)).toBe(true);
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
      });

      const decision = makeNPCWeeklyDecision(world, heyaId);
      expect(decision.mood).toBe("furious");
      expect(decision.trainingIntensity).toBe("punishing");
      expect(decision.reasoning.some((r) => r.includes("[Lead Review]"))).toBe(true);
    });
  });
});
