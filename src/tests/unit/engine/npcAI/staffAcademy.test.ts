import { describe, it, expect } from "vitest";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { executeAgentDecisions } from "@/engine/npcAI/execution";
import { applyImpact } from "@/engine/core/ImpactResolver";
import type { AgentDecisions } from "@/engine/npcAI/types";
import type { WorldState } from "@/engine/types/world";

/**
 * WS5 contract tests — infrastructure agent decisions execute real staff and
 * academy changes via the canonical services.
 */

function makeDecisions(overrides: Partial<AgentDecisions> = {}): AgentDecisions {
  return {
    finance: {
      shouldBuyMyoseki: false,
      shouldInvestInFacilities: false,
      shouldBuildReserves: false,
      riskLevel: "moderate",
    },
    governance: {
      shouldReduceScandal: false,
      shouldUsePoliticalFavor: false,
      shouldSabotageRival: false,
    },
    recruitment: { maxBid: 0, shouldBid: false, bidStrategy: "conservative" },
    rivalry: { escalateRivalry: false, deescalateRivalry: false, targetRivalForMatchmaking: [] },
    narrative: { shouldTriggerEvent: false, narrativeTone: "neutral" },
    infrastructure: {
      shouldHireStaff: false,
      shouldBuildAcademy: false,
      shouldUpgradeAcademy: false,
    },
    ...overrides,
  };
}

function makeWorld(heyaOverrides: Parameters<typeof MockFactory.createHeya>[1] = {}): WorldState {
  const oyakata = MockFactory.createOyakata("oya-a", { heyaId: "heya-a" });
  const heya = MockFactory.createHeya("heya-a", {
    oyakataId: "oya-a",
    funds: 500_000_000,
    ...heyaOverrides,
  });
  return MockFactory.createWorld({
    heyas: new Map([["heya-a", heya]]),
    oyakata: new Map([["oya-a", oyakata]]),
  });
}

describe("executeAgentDecisions — infrastructure", () => {
  it("shouldHireStaff hires a staff member for the heya", () => {
    const world = makeWorld({ staffIds: [] });
    const impact = executeAgentDecisions(
      world,
      "heya-a",
      makeDecisions({
        infrastructure: {
          shouldHireStaff: true,
          staffRole: "technique_coach",
          shouldBuildAcademy: false,
          shouldUpgradeAcademy: false,
        },
      }),
      world.oyakata.get("oya-a")!
    );
    const resolved = applyImpact(world, impact);
    expect(resolved.heyas.get("heya-a")!.staffIds!.length).toBe(1);
  });

  it("shouldBuildAcademy creates a youth academy when none exists", () => {
    const world = makeWorld();
    const impact = executeAgentDecisions(
      world,
      "heya-a",
      makeDecisions({
        infrastructure: {
          shouldHireStaff: false,
          shouldBuildAcademy: true,
          shouldUpgradeAcademy: false,
        },
      }),
      world.oyakata.get("oya-a")!
    );
    const resolved = applyImpact(world, impact);
    expect(resolved.heyas.get("heya-a")!.youthAcademy).toBeDefined();
    expect(resolved.heyas.get("heya-a")!.youthAcademy!.level).toBe(1);
  });

  it("shouldUpgradeAcademy raises academy level when one exists", () => {
    const world = makeWorld({
      youthAcademy: {
        level: 1,
        prospects: [],
        totalGraduated: 0,
        budget: 10_000,
        staff: [],
        lastIntakeYear: 0,
      } as never,
    });
    const impact = executeAgentDecisions(
      world,
      "heya-a",
      makeDecisions({
        infrastructure: {
          shouldHireStaff: false,
          shouldBuildAcademy: false,
          shouldUpgradeAcademy: true,
        },
      }),
      world.oyakata.get("oya-a")!
    );
    const resolved = applyImpact(world, impact);
    expect(resolved.heyas.get("heya-a")!.youthAcademy!.level).toBe(2);
  });

  it("academy build is skipped when funds are insufficient", () => {
    const world = makeWorld({ funds: 0 });
    const impact = executeAgentDecisions(
      world,
      "heya-a",
      makeDecisions({
        infrastructure: {
          shouldHireStaff: false,
          shouldBuildAcademy: true,
          shouldUpgradeAcademy: false,
        },
      }),
      world.oyakata.get("oya-a")!
    );
    const resolved = applyImpact(world, impact);
    expect(resolved.heyas.get("heya-a")!.youthAcademy).toBeUndefined();
  });
});
