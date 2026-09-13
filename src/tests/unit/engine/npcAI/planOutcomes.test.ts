import { describe, it, expect } from "vitest";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { evaluatePlanOutcome, computePlanBaseline } from "@/engine/npcAI/planOutcomes";
import type { AIPlan } from "@/engine/ai/types";
import type { WorldState } from "@/engine/types/world";
import type { BashoResult } from "@/engine/types/basho";
import type { RivalriesState } from "@/constants/engine/rivalry";

/**
 * WS2 contract tests — plan outcome evaluation.
 *
 * Plans archive with real outcomes (success/partial/abandoned) computed by
 * comparing the plan's baseline snapshot against current world state.
 */

const BASELINE = {
  runwayOrdinal: 1, // critical
  rosterSize: 10,
  sekitoriCount: 2,
  maxRivalryHeat: 60,
  yushoWins: 0,
};

function makePlan(planId: string, baseline = BASELINE): AIPlan {
  return {
    heyaId: "heya-a",
    archetype: "traditionalist",
    planId,
    goals: [],
    constraints: [],
    estimatedWeeks: 8,
    startedWeek: 1,
    reasoning: [],
    baseline,
  };
}

interface WorldOpts {
  heyaOverrides?: Parameters<typeof MockFactory.createHeya>[1];
  rikishiRanks?: string[];
  history?: BashoResult[];
  rivalriesState?: RivalriesState;
  standings?: Map<string, { wins: number; losses: number }>;
}

function makeWorld(opts: WorldOpts = {}): WorldState {
  const rikishi = new Map(
    (opts.rikishiRanks ?? ["maegashira", "maegashira"]).map((rank, i) => {
      const r = MockFactory.createRikishi(`r${i}`, {
        heyaId: "heya-a",
        rank: rank as never,
      });
      return [`r${i}`, r];
    })
  );
  const heya = MockFactory.createHeya("heya-a", {
    rikishiIds: [...rikishi.keys()],
    ...opts.heyaOverrides,
  });
  const basho = opts.standings
    ? MockFactory.createBasho({ standings: opts.standings })
    : undefined;
  return MockFactory.createWorld({
    rikishi,
    heyas: new Map([["heya-a", heya]]),
    history: opts.history ?? [],
    rivalriesState: opts.rivalriesState,
    currentBasho: basho,
  });
}

function rivalryPair(aId: string, bId: string, heat: number) {
  return {
    key: `${aId}|${bId}`,
    aId,
    bId,
    heat,
    meetings: 3,
    lastMetWeek: 10,
    aWins: 1,
    bWins: 2,
    closeness: 50,
    spite: 20,
    tone: "grudge" as const,
    triggers: {},
    sameHeya: false,
  };
}

describe("evaluatePlanOutcome", () => {
  it("yokozuna_push → success when a heya rikishi won a basho during the plan", () => {
    const world = makeWorld({
      history: [{ yusho: "r0" } as unknown as BashoResult],
    });
    const outcome = evaluatePlanOutcome(world, "heya-a", makePlan("yokozuna_push"));
    expect(outcome.outcome).toBe("success");
  });

  it("yokozuna_push → partial when a heya rikishi leads the basho without winning yet", () => {
    const world = makeWorld({
      standings: new Map([
        ["r0", { wins: 12, losses: 2 }],
        ["r1", { wins: 8, losses: 6 }],
      ]),
    });
    const outcome = evaluatePlanOutcome(world, "heya-a", makePlan("yokozuna_push"));
    expect(outcome.outcome).toBe("partial");
  });

  it("yokozuna_push → abandoned when the heya produced no title run", () => {
    const world = makeWorld();
    const outcome = evaluatePlanOutcome(world, "heya-a", makePlan("yokozuna_push"));
    expect(outcome.outcome).toBe("abandoned");
  });

  it("financial_consolidation → success when runway recovered to a healthy band", () => {
    const world = makeWorld({ heyaOverrides: { runwayBand: "secure" } });
    const outcome = evaluatePlanOutcome(
      world,
      "heya-a",
      makePlan("financial_consolidation")
    );
    expect(outcome.outcome).toBe("success");
  });

  it("financial_consolidation → partial on improvement that hasn't reached healthy bands", () => {
    const world = makeWorld({ heyaOverrides: { runwayBand: "tight" } });
    const outcome = evaluatePlanOutcome(
      world,
      "heya-a",
      makePlan("financial_consolidation")
    );
    expect(outcome.outcome).toBe("partial");
  });

  it("financial_consolidation → abandoned when runway did not improve", () => {
    const world = makeWorld({ heyaOverrides: { runwayBand: "critical" } });
    const outcome = evaluatePlanOutcome(
      world,
      "heya-a",
      makePlan("financial_consolidation")
    );
    expect(outcome.outcome).toBe("abandoned");
  });

  it("rebuilding → success when sekitori count grew", () => {
    const world = makeWorld({ rikishiRanks: ["ozeki", "sekiwake", "maegashira"] });
    const outcome = evaluatePlanOutcome(world, "heya-a", makePlan("rebuilding"));
    expect(outcome.outcome).toBe("success");
  });

  it("rebuilding → partial when only roster size grew", () => {
    const world = makeWorld({
      rikishiRanks: ["maegashira", "maegashira", "jonokuchi", "jonokuchi", "jonokuchi",
        "jonokuchi", "jonokuchi", "jonokuchi", "jonokuchi", "jonokuchi", "jonokuchi"],
    });
    const outcome = evaluatePlanOutcome(world, "heya-a", makePlan("rebuilding"));
    expect(outcome.outcome).toBe("partial");
  });

  it("rivalry_suppression → success when heat collapsed", () => {
    const world = makeWorld({
      rivalriesState: {
        version: "1.0.0",
        pairs: { "r0|opp-x": rivalryPair("r0", "opp-x", 30) },
      },
    });
    const outcome = evaluatePlanOutcome(world, "heya-a", makePlan("rivalry_suppression"));
    expect(outcome.outcome).toBe("success");
  });

  it("rivalry_suppression → abandoned when heat is unchanged or worse", () => {
    const world = makeWorld({
      rivalriesState: {
        version: "1.0.0",
        pairs: { "r0|opp-x": rivalryPair("r0", "opp-x", 75) },
      },
    });
    const outcome = evaluatePlanOutcome(world, "heya-a", makePlan("rivalry_suppression"));
    expect(outcome.outcome).toBe("abandoned");
  });

  it("recruitment_blitz → success when the roster grew", () => {
    const world = makeWorld({
      rikishiRanks: Array(12).fill("maegashira"),
    });
    const outcome = evaluatePlanOutcome(world, "heya-a", makePlan("recruitment_blitz"));
    expect(outcome.outcome).toBe("success");
  });

  it("archives as abandoned when the plan carries no baseline", () => {
    const world = makeWorld();
    const plan = makePlan("yokozuna_push");
    delete (plan as Partial<AIPlan>).baseline;
    const outcome = evaluatePlanOutcome(world, "heya-a", plan);
    expect(outcome.outcome).toBe("abandoned");
  });

  it("computePlanBaseline measures real world state", () => {
    const world = makeWorld({
      heyaOverrides: { runwayBand: "comfortable" },
      rikishiRanks: ["ozeki", "jonokuchi"],
      rivalriesState: {
        version: "1.0.0",
        pairs: { "r0|opp-x": rivalryPair("r0", "opp-x", 45) },
      },
      history: [{ yusho: "r0" } as unknown as BashoResult],
    });
    const base = computePlanBaseline(world, "heya-a");
    expect(base.runwayOrdinal).toBe(3);
    expect(base.rosterSize).toBe(2);
    expect(base.sekitoriCount).toBe(1);
    expect(base.maxRivalryHeat).toBe(45);
    expect(base.yushoWins).toBe(1);
  });
});
