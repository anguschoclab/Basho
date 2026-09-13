import { describe, it, expect } from "vitest";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { onBoutResolvedOpponentModels } from "@/engine/npcAI/opponentLearning";
import type { BoutResult, MatchSchedule } from "@/engine/types/basho";
import type { Rikishi } from "@/engine/types/rikishi";
import type { WorldState } from "@/engine/types/world";
import type { OpponentTacticModel } from "@/engine/ai/types";

/**
 * WS2 contract tests — opponent-model learning.
 *
 * Every resolved bout is an observation for the participating NPC heyas:
 * each side's oyakata updates its learned model of the opposing rikishi.
 * Winner observations record the winning kimarite's family; loser
 * observations record the family of the tactic they were resolved with.
 */

function makeResult(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "b1",
    winner: "east",
    winnerRikishiId: "east",
    loserRikishiId: "west",
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    stance: "migi",
    tachiaiWinner: "east",
    duration: 8,
    upset: false,
    kenshoEnvelopes: 0,
    log: [],
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
    tactics: { east: "OSHI_THRUST", west: "YOTSU_BELT" },
    ...overrides,
  } as BoutResult;
}

function makeMatch(): MatchSchedule {
  return { boutId: "b1", day: 5, eastRikishiId: "east", westRikishiId: "west" };
}

interface WorldOpts {
  eastHeyaId?: string;
  westHeyaId?: string;
  eastModels?: Record<string, OpponentTacticModel>;
  westModels?: Record<string, OpponentTacticModel>;
  playerHeyaId?: string;
}

function makeWorld(opts: WorldOpts = {}): { world: WorldState; east: Rikishi; west: Rikishi } {
  const eastHeyaId = opts.eastHeyaId ?? "heya-a";
  const westHeyaId = opts.westHeyaId ?? "heya-b";
  const east = MockFactory.createRikishi("east", { heyaId: eastHeyaId });
  const west = MockFactory.createRikishi("west", { heyaId: westHeyaId, style: "yotsu" });

  const oyaA = MockFactory.createOyakata("oya-a", {
    heyaId: eastHeyaId,
    memory: {
      observations: [],
      coreDirectives: [],
      lastConsolidationTick: 0,
      planHistory: [],
      decisionHistory: [],
      opponentModels: opts.eastModels ?? {},
    },
  });
  const oyaB = MockFactory.createOyakata("oya-b", {
    heyaId: westHeyaId,
    memory: {
      observations: [],
      coreDirectives: [],
      lastConsolidationTick: 0,
      planHistory: [],
      decisionHistory: [],
      opponentModels: opts.westModels ?? {},
    },
  });

  const oyaP = MockFactory.createOyakata("oya-player", {
    heyaId: "player-heya",
    memory: {
      observations: [],
      coreDirectives: [],
      lastConsolidationTick: 0,
      planHistory: [],
      decisionHistory: [],
      opponentModels: {},
    },
  });

  const heyas = new Map([
    [eastHeyaId, MockFactory.createHeya(eastHeyaId, { oyakataId: eastHeyaId === "player-heya" ? "oya-player" : "oya-a" })],
    [westHeyaId, MockFactory.createHeya(westHeyaId, { oyakataId: "oya-b" })],
  ]);
  if (!heyas.has("player-heya")) {
    heyas.set("player-heya", MockFactory.createHeya("player-heya", { oyakataId: "oya-player" }));
  }

  const world = MockFactory.createWorld({
    rikishi: new Map([
      ["east", east],
      ["west", west],
    ]),
    heyas,
    oyakata: new Map([
      ["oya-a", oyaA],
      ["oya-b", oyaB],
      ["oya-player", oyaP],
    ]),
    playerHeyaId: opts.playerHeyaId ?? "player-heya",
    week: 12,
  });
  return { world, east, west };
}

describe("onBoutResolvedOpponentModels", () => {
  it("updates BOTH NPC oyakata memories after an NPC-vs-NPC bout", () => {
    const { world, east, west } = makeWorld();
    const impact = onBoutResolvedOpponentModels(world, {
      match: makeMatch(),
      result: makeResult(),
      east,
      west,
    });
    const oyaA = impact.entities?.oyakataUpdates?.get("oya-a");
    const oyaB = impact.entities?.oyakataUpdates?.get("oya-b");
    expect(
      oyaA?.memory?.opponentModels?.["west"],
      "heya-a oyakata must record a model of west"
    ).toBeDefined();
    expect(
      oyaB?.memory?.opponentModels?.["east"],
      "heya-b oyakata must record a model of east"
    ).toBeDefined();
  });

  it("records the winner's kimarite family against the winner, and the loser's resolved tactic family", () => {
    const { world, east, west } = makeWorld();
    const impact = onBoutResolvedOpponentModels(world, {
      match: makeMatch(),
      result: makeResult(),
      east,
      west,
    });
    // east won by yorikiri (belt) — heya-b's model of east gains a belt count.
    const modelOfEast = impact.entities?.oyakataUpdates?.get("oya-b")?.memory
      ?.opponentModels?.["east"];
    expect(modelOfEast?.familyCounts.belt).toBeGreaterThanOrEqual(1);
    // west lost while resolved with YOTSU_BELT — heya-a's model of west gains a belt count.
    const modelOfWest = impact.entities?.oyakataUpdates?.get("oya-a")?.memory
      ?.opponentModels?.["west"];
    expect(modelOfWest?.familyCounts.belt).toBeGreaterThanOrEqual(1);
  });

  it("skips the player-owned heya (no AI memory for the player)", () => {
    const { world, east, west } = makeWorld({ eastHeyaId: "player-heya" });
    const impact = onBoutResolvedOpponentModels(world, {
      match: makeMatch(),
      result: makeResult(),
      east,
      west,
    });
    const oyaPlayer = impact.entities?.oyakataUpdates?.get("oya-player");
    expect(oyaPlayer, "player heya oyakata must not be updated").toBeUndefined();
    expect(
      impact.entities?.oyakataUpdates?.get("oya-b")?.memory?.opponentModels?.["east"]
    ).toBeDefined();
  });

  it("increments an existing model rather than resetting it", () => {
    const existing: OpponentTacticModel = {
      rikishiId: "west",
      sampleSize: 5,
      familyCounts: { push: 3, belt: 1, trick: 1, speed: 0 },
      lastUpdated: 10,
    };
    const { world, east, west } = makeWorld({ eastModels: { west: existing } });
    const impact = onBoutResolvedOpponentModels(world, {
      match: makeMatch(),
      result: makeResult(),
      east,
      west,
    });
    const updated = impact.entities?.oyakataUpdates?.get("oya-a")?.memory?.opponentModels?.[
      "west"
    ];
    expect(updated?.sampleSize).toBe(6);
    expect(updated?.lastUpdated).toBe(world.week);
  });

  it("bounds opponentModels at 40 entries, evicting the stalest", () => {
    const stale: Record<string, OpponentTacticModel> = {};
    for (let i = 0; i < 40; i++) {
      stale[`opp-${i}`] = {
        rikishiId: `opp-${i}`,
        sampleSize: 1,
        familyCounts: { push: 1, belt: 0, trick: 0, speed: 0 },
        lastUpdated: i, // opp-0 is the stalest
      };
    }
    const { world, east, west } = makeWorld({ eastModels: stale });
    const impact = onBoutResolvedOpponentModels(world, {
      match: makeMatch(),
      result: makeResult(),
      east,
      west,
    });
    const models = impact.entities?.oyakataUpdates?.get("oya-a")?.memory?.opponentModels ?? {};
    expect(Object.keys(models).length).toBeLessThanOrEqual(40);
    expect(models["west"], "the fresh observation is retained").toBeDefined();
    expect(models["opp-0"], "the stalest model is evicted").toBeUndefined();
  });

  it("skips intra-heya bouts (no self-scouting)", () => {
    const { world, east, west } = makeWorld({ westHeyaId: "heya-a" });
    const impact = onBoutResolvedOpponentModels(world, {
      match: makeMatch(),
      result: makeResult(),
      east,
      west,
    });
    expect(impact.entities?.oyakataUpdates?.size ?? 0).toBe(0);
  });

  it("is deterministic across identical calls", () => {
    const a = makeWorld();
    const b = makeWorld();
    const i1 = onBoutResolvedOpponentModels(a.world, {
      match: makeMatch(),
      result: makeResult(),
      east: a.east,
      west: a.west,
    });
    const i2 = onBoutResolvedOpponentModels(b.world, {
      match: makeMatch(),
      result: makeResult(),
      east: b.east,
      west: b.west,
    });
    expect(i1.entities?.oyakataUpdates?.get("oya-a")?.memory).toEqual(
      i2.entities?.oyakataUpdates?.get("oya-a")?.memory
    );
  });
});
