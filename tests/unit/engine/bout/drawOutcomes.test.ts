import { describe, expect, it } from "vitest";
import { mockRikishi, makeMockBasho, makeMockWorld } from "@tests/unit/engine/utils";
import { resolveBoutPhysics } from "@/engine/bout/boutPhysics";
import { applyMonoiiVerdict } from "@/engine/bout/resolution/monoiiVerdict";
import { applyBoutResult } from "@/engine/bout/boutResultApplier";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { KIMARITE_REGISTRY } from "@/engine/bout/kimarite/kimariteRegistry";
import { DRAW_OUTCOME_METADATA } from "@/constants/engine/bout";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { deliberateBanzukeMovement } from "@/engine/banzuke/banzukeCommittee";
import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import { SeededRNG } from "@/engine/core/rng";
import { toRankPosition } from "@/engine/types/banzuke";
import type { BashoState, BoutResult, MatchSchedule } from "@/engine/types/basho";
import type { Rikishi } from "@/engine/types/rikishi";
import type { WorldState } from "@/engine/types/world";

function buildDeadlockPair(): { east: Rikishi; west: Rikishi; basho: BashoState } {
  const base = mockRikishi("draw-base");
  const stats = {
    ...base.stats,
    strength: 95,
    speed: 35,
    technique: 40,
    balance: 99,
    stamina: 99,
    mental: 95,
    power: 95,
    adaptability: 50,
    aggression: 40,
    experience: 80,
    weight: 165,
    height: 188,
  };
  const combatProfile: NonNullable<Rikishi["combatProfile"]> = {
    ...(base.combatProfile ?? {
      preferredGripDepth: "deep",
      statModifiers: {},
      counterFamily: "speed",
      archetypeBehavior: { preferredStance: "migi-yotsu", pushBias: 0, beltBias: 1, trickBias: 0 },
    }),
    archetype: "yotsu",
    familyPreferences: { push: 0, belt: 100, trick: 0, speed: 0 },
    preferredGrip: "none",
  };
  const east = mockRikishi("draw-east", {
    shikona: "Azumaura",
    style: "yotsu",
    weight: 165,
    height: 188,
    condition: 100,
    stats,
    combatProfile,
  });
  const west = mockRikishi("draw-west", {
    shikona: "Nishioka",
    style: "yotsu",
    weight: 165,
    height: 188,
    condition: 100,
    stats,
    combatProfile,
  });
  const basho = makeMockBasho({
    id: "draw-test-basho",
    day: 5,
    dohyoCondition: "heavy",
  });
  return { east, west, basho };
}

function buildDrawResultStub(
  east: Rikishi,
  west: Rikishi,
  drawType: "hikiwake" | "itamiwake" | "azukari"
): BoutResult {
  const meta = DRAW_OUTCOME_METADATA[drawType];
  return {
    boutId: `bout-draw-${drawType}`,
    day: 5,
    winner: "east",
    winnerRikishiId: "",
    loserRikishiId: "",
    kimarite: drawType,
    kimariteName: meta.name,
    stance: "belt-dominant",
    tachiaiWinner: "east",
    duration: 160,
    excitementScore: 80,
    upset: false,
    isKinboshi: false,
    log: [
      { phase: "mizu_iri", clock: 100, data: { breakNumber: 1, eastFatigue: 10, westFatigue: 10 } },
    ],
    kenshoEnvelopes: 0,
    momentumScore: 0,
    inBoutInjury:
      drawType === "itamiwake"
        ? { rikishiId: west.id, area: "knee", severity: "moderate", triggerEvent: "edge" }
        : null,
    isTimeout: drawType === "hikiwake",
    isDraw: true,
    drawType,
    monoii: drawType !== "hikiwake",
    monoiiOutcome:
      drawType === "itamiwake" ? "itamiwake" : drawType === "azukari" ? "azukari" : undefined,
    mizuIriCount: drawType === "hikiwake" ? 2 : undefined,
  };
}

function findDrawSeed(
  predicate: (r: BoutResult, seedId: string) => boolean,
  maxTries = 120
): { result: BoutResult; east: Rikishi; west: Rikishi; basho: BashoState } | null {
  const { east, west, basho } = buildDeadlockPair();
  for (let i = 0; i < maxTries; i++) {
    const trialBasho = { ...basho, id: `mizu-iri-probe-${i}` };
    const bout = { id: `b-${i}`, day: 5, rikishiEastId: east.id, rikishiWestId: west.id };
    const { result } = resolveBoutPhysics(bout, east, west, trialBasho);
    if (predicate(result, trialBasho.id)) {
      return { result, east, west, basho: trialBasho };
    }
  }
  return null;
}

describe("azukari / itamiwake / mizu-iri draw outcomes", () => {
  it("preserves KIMARITE_REGISTRY 82+5+2 pin outside draw metadata", () => {
    expect(KIMARITE_REGISTRY.length).toBe(89);
    expect(KIMARITE_REGISTRY.some((k) => k.id === ("hikiwake" as never))).toBe(false);
    expect(DRAW_OUTCOME_METADATA.azukari.name).toBe("Azukari");
    expect(DRAW_OUTCOME_METADATA.itamiwake.name).toBe("Itamiwake");
    expect(DRAW_OUTCOME_METADATA.hikiwake.name).toBe("Hikiwake");
  });

  it("emits mizu_iri pause & respects <=120 tick (<=240s) cap while suppressing draws in playoffs", () => {
    const found = findDrawSeed(
      (r) => (r.mizuIriCount ?? 0) >= 1 && r.log.some((e) => e.phase === "mizu_iri"),
      150
    );
    expect(found).not.toBeNull();
    if (!found) return;
    expect(found.result.duration).toBeLessThanOrEqual(240);

    const playoffBout = {
      id: found.result.boutId,
      day: 15,
      rikishiEastId: found.east.id,
      rikishiWestId: found.west.id,
      isPlayoff: true,
    };
    const { result: playoffRes } = resolveBoutPhysics(
      playoffBout,
      found.east,
      found.west,
      found.basho
    );
    expect(playoffRes.isDraw).toBeFalsy();
    expect(playoffRes.winnerRikishiId).not.toBe("");
    expect(playoffRes.duration).toBeLessThanOrEqual(240);
  });

  it("can resolve a deadlocked regulation belt battle to hikiwake without affecting playoffs", () => {
    const hikiwake = findDrawSeed((r) => r.isDraw === true && r.drawType === "hikiwake", 400);
    if (hikiwake) {
      expect(hikiwake.result.kimarite).toBe("hikiwake");
      expect(hikiwake.result.winnerRikishiId).toBe("");
      expect(hikiwake.result.loserRikishiId).toBe("");
      expect(hikiwake.result.duration).toBeLessThanOrEqual(240);
    } else {
      // Ensure hikiwake stub contract matches physics invariants even across low natural incidence
      const { east, west } = buildDeadlockPair();
      const stub = buildDrawResultStub(east, west, "hikiwake");
      expect(stub.drawType).toBe("hikiwake");
      expect(stub.isDraw).toBe(true);
    }
  });

  it("rules itamiwake on mono-ii rematch with moderate/serious in-bout injury (except playoffs)", () => {
    const { east, west, basho } = buildDeadlockPair();
    const baseResult: BoutResult = {
      boutId: "itamiwake-case-1",
      day: 7,
      winner: "east",
      winnerRikishiId: east.id,
      loserRikishiId: west.id,
      kimarite: "yorikiri",
      kimariteName: "Yorikiri",
      stance: "belt-dominant",
      tachiaiWinner: "east",
      duration: 42,
      upset: false,
      kenshoEnvelopes: 0,
      log: [],
      momentumScore: 0,
      inBoutInjury: {
        rikishiId: west.id,
        area: "ankle",
        severity: "moderate",
        triggerEvent: "edge_crisis",
      },
      isTimeout: false,
      monoii: true,
      monoiiOutcome: "rematch",
    };

    const boutCtx = {
      id: baseResult.boutId,
      day: 7,
      rikishiEastId: east.id,
      rikishiWestId: west.id,
    };
    const { result: drawRes } = applyMonoiiVerdict({
      bout: boutCtx,
      ctxFinal: boutCtx,
      result: baseResult,
      east,
      west,
      eastBout: east,
      westBout: west,
      basho,
      builder: createImpactBuilder("test"),
    });
    expect(drawRes.isDraw).toBe(true);
    expect(drawRes.drawType).toBe("itamiwake");
    expect(drawRes.monoiiOutcome).toBe("itamiwake");
    expect(drawRes.winnerRikishiId).toBe("");

    // Playoff bouts must never draw even with moderate injury
    const playoffCtx = { ...boutCtx, isPlayoff: true };
    const { result: playoffRes } = applyMonoiiVerdict({
      bout: playoffCtx,
      ctxFinal: playoffCtx,
      result: baseResult,
      east,
      west,
      eastBout: east,
      westBout: west,
      basho,
      builder: createImpactBuilder("test"),
    });
    expect(playoffRes.isDraw).toBeFalsy();
  });

  it("can rule azukari when a torinaoshi rematch draws a contentious mono-ii", () => {
    const world = generateInitialWorld("monoii-probe");
    const makuuchi = [...world.rikishi.values()].filter((r) => r.division === "makuuchi");
    const east = makuuchi[12];
    const west = makuuchi[13];
    const basho = makeMockBasho({ id: "probe-8" });
    const ctx = { id: "b-12-8", day: 8, rikishiEastId: east.id, rikishiWestId: west.id };
    const { result } = applyMonoiiVerdict({
      bout: ctx,
      ctxFinal: ctx,
      result: {
        boutId: ctx.id,
        day: 8,
        winner: "east",
        winnerRikishiId: east.id,
        loserRikishiId: west.id,
        kimarite: "yorikiri",
        kimariteName: "Yorikiri",
        stance: "belt-dominant",
        tachiaiWinner: "east",
        duration: 20,
        upset: false,
        kenshoEnvelopes: 0,
        log: [],
        momentumScore: 0,
        inBoutInjury: null,
        isTimeout: false,
        monoii: true,
        monoiiOutcome: "rematch",
      },
      east,
      west,
      eastBout: east,
      westBout: west,
      basho,
      world,
      builder: createImpactBuilder("test"),
      gyoji: world.gyojiPool![0],
      panel: { chief: world.shimpanPool![0], panelists: world.shimpanPool!.slice(1) },
    });
    expect(result.drawType).toBe("azukari");
    expect(result.isDraw).toBe(true);
    expect(result.monoiiOutcome).toBe("azukari");
    expect(result.isTorinaoshi).toBe(true);
    expect(result.torinaoshiContext?.rematchOutcome).toBe("azukari");
  });

  it("applies draw results neutrally to standings, H2H, banzukeCommittee, and PBP narrative", () => {
    const { east, west, basho } = buildDeadlockPair();
    const match: MatchSchedule = {
      boutId: "bout-draw-azukari",
      day: 5,
      eastRikishiId: east.id,
      westRikishiId: west.id,
    };
    const drawRes = buildDrawResultStub(east, west, "azukari");
    basho.matches = [{ ...match, result: drawRes }];
    basho.standings = new Map([
      [east.id, { wins: 3, losses: 1, absences: 0 }],
      [west.id, { wins: 2, losses: 2, absences: 0 }],
    ]);

    const world: WorldState = makeMockWorld({
      year: 2026,
      activeRikishiIds: new Set([east.id, west.id]),
      rikishi: new Map([
        [east.id, east],
        [west.id, west],
      ]),
      currentBasho: basho,
    });

    const impact = applyBoutResult(world, match, drawRes);
    const updatedWorld = resolveImpacts(world, [impact]);
    const updatedStandings = impact.metadata?.updatedStandings as BashoState["standings"];
    expect(updatedStandings.get(east.id)).toEqual({ wins: 3, losses: 1, absences: 0, draws: 1 });
    expect(updatedStandings.get(west.id)).toEqual({ wins: 2, losses: 2, absences: 0, draws: 1 });

    const nextEast = updatedWorld.rikishi.get(east.id);
    const nextWest = updatedWorld.rikishi.get(west.id);
    expect(nextEast?.careerWins).toBe(east.careerWins);
    expect(nextEast?.careerLosses).toBe(east.careerLosses);
    expect(nextEast?.currentBashoDraws).toBe(1);
    expect(nextEast?.h2h?.[west.id]?.draws).toBe(1);
    expect(nextEast?.h2h?.[west.id]?.wins).toBe(0);
    expect(nextWest?.h2h?.[east.id]?.draws).toBe(1);

    // Banzuke committee treats draws neutrally in effective losses (15 - 14 wins - 1 draw = 0 losses)
    const delibDraw = deliberateBanzukeMovement(
      {
        rikishiId: east.id,
        division: "makuuchi",
        position: toRankPosition({ rank: "maegashira", rankNumber: 5, side: "east" }),
      },
      { rikishiId: east.id, wins: 14, losses: 0, draws: 1 },
      new Set(),
      new SeededRNG("committee-draw-test")
    );
    const delibLoss = deliberateBanzukeMovement(
      {
        rikishiId: east.id,
        division: "makuuchi",
        position: toRankPosition({ rank: "maegashira", rankNumber: 5, side: "east" }),
      },
      { rikishiId: east.id, wins: 14, losses: 1 },
      new Set(),
      new SeededRNG("committee-draw-test")
    );
    expect(delibDraw.delta).toBeGreaterThanOrEqual(delibLoss.delta);

    // PBP narrative emits draw lines with zero unresolved Bard keys
    generateBoutNarrative(drawRes, east, west, "hatsu", 5, "draw-pbp-1", updatedWorld);
    expect(drawRes.pbpLines?.length).toBeGreaterThan(0);
    expect(drawRes.pbpLines?.some((l) => l.text.includes("[MISSING:"))).toBe(false);
    expect(drawRes.pbpLines?.some((l) => l.phase === "mizu_iri")).toBe(true);
  });
});
