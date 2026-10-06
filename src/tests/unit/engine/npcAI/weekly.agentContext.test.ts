import { describe, it, expect } from "vitest";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";
import { makeNPCWeeklyDecision } from "@/engine/npcAI";
import type { AIPlan } from "@/engine/ai/types";

/**
 * Characterization coverage for the agent-context plumbing inside
 * makeNPCWeeklyDecision: the agents must receive real heya data
 * (governanceStatus, roster-derived burn, own-roster rikishi, strongest
 * candidate) and plan constraints must survive the post-pass adjustments.
 */
function setupWorld(heyaOverrides: Parameters<typeof makeMockHeya>[1] = {}) {
  const world = makeMockWorld();
  const heya = makeMockHeya("h1", {
    oyakataId: "o1",
    runwayBand: "comfortable",
    rikishiIds: [],
    ...heyaOverrides,
  });
  world.heyas.set("h1", heya);
  world.oyakata.set("o1", {
    id: "o1",
    heyaId: "h1",
    name: "Oya",
    archetype: "hardliner",
    traits: { ambition: 80, risk: 80, tradition: 50, patience: 20, compassion: 10 },
  } as any);
  world.playerHeyaId = "player";
  return { world, heya };
}

describe("makeNPCWeeklyDecision — agent context integrity", () => {
  it("passes heya.governanceStatus (not welfare complianceState) to the governance agent", () => {
    const { world, heya } = setupWorld({
      governanceStatus: "probation",
      scandalScore: 40,
      welfareState: { complianceState: "compliant" } as any,
    });
    const decision = makeNPCWeeklyDecision(world, "h1");
    expect(heya.governanceStatus).toBe("probation");
    expect(decision.reasoning.some((r) => r.includes("Status: probation"))).toBe(true);
    expect(decision.reasoning.some((r) => r.includes("Status: compliant"))).toBe(false);
  });

  it("computes runway from a roster-derived monthly burn instead of a hardcoded 0", () => {
    const { world, heya } = setupWorld({ funds: 15_000_000 });
    for (let i = 0; i < 10; i++) {
      world.rikishi.set(`r${i}`, mockRikishi(`r${i}`, { heyaId: "h1" }));
    }
    heya.rikishiIds = Array.from({ length: 10 }, (_, i) => `r${i}`);

    const decision = makeNPCWeeklyDecision(world, "h1");
    // 10 rikishi * 150k burn = 1.5M/mo; 15M funds / 1.5M = 10.0 months.
    expect(decision.reasoning.some((r) => /Current runway: 10\.0 months/.test(r))).toBe(true);
    expect(decision.reasoning.some((r) => /999/.test(r))).toBe(false);
  });

  it("evaluates the strongest available talent-pool candidate, not the first key", () => {
    const { world } = setupWorld();
    world.talentPool = {
      candidates: {
        weak: { candidateId: "weak", talentSeed: 30, availabilityState: "available" },
        strong: { candidateId: "strong", talentSeed: 95, availabilityState: "available" },
      },
      pools: {},
    } as any;
    const decision = makeNPCWeeklyDecision(world, "h1");
    expect(decision.reasoning.some((r) => r.includes("Evaluating candidate with talent 95"))).toBe(
      true
    );
  });

  it("re-applies the plan max_intensity cap after promotion/injury post-passes", () => {
    const { world, heya } = setupWorld();
    world.rikishi.set("oz", mockRikishi("oz", { heyaId: "h1", rank: "ozeki" }));
    heya.rikishiIds = ["oz"];
    const plan: AIPlan = {
      heyaId: "h1",
      archetype: "tyrant",
      planId: "discipline",
      goals: [],
      constraints: [{ domain: "training", type: "max_intensity", value: "conservative" }],
      estimatedWeeks: 8,
      startedWeek: 0,
      reasoning: [],
    };
    const decision = makeNPCWeeklyDecision(world, "h1", plan);
    // Ozeki post-pass raises conservative/balanced -> intensive; the plan cap
    // must still hold in the final decision.
    expect(decision.trainingIntensity).toBe("conservative");
  });
});
