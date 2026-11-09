import { describe, it, expect } from "vitest";
import { SerializationService } from "@/engine/persistence/SerializationService";
import type { SerializedBashoState } from "@/engine/types/save";
import type { BashoState, AwardLogEntry, MatchSchedule } from "@/engine/types/basho";
import { advanceOneDay } from "@/engine/tick/tickDaily";
import { makeMockWorld, makeMockBasho, mockRikishi, makeMockHeya } from "@tests/unit/engine/utils";

const baseBasho = (): BashoState =>
  ({
    id: "b-1",
    year: 2026,
    bashoNumber: 1,
    bashoName: "hatsu",
    day: 3,
    matches: [
      {
        boutId: "bout-kin-1",
        day: 3,
        eastRikishiId: "m1",
        westRikishiId: "y1",
        result: {
          boutId: "bout-kin-1",
          winner: "east",
          winnerRikishiId: "m1",
          loserRikishiId: "y1",
          kimarite: "yorikiri",
          isKinboshi: true,
          awardFact: "kinboshi",
          awards: [
            { type: "kinboshi", winnerId: "m1", loserId: "y1", day: 3, boutId: "bout-kin-1" },
          ],
          log: [],
          kenshoEnvelopes: 45,
          momentumScore: 0,
          inBoutInjury: null,
          isTimeout: false,
          upset: true,
          day: 3,
        } as never,
      },
    ],
    standings: new Map(),
    kinboshiThisBasho: { m1: 1 },
    isActive: true,
  }) as unknown as BashoState;

describe("SerializationService — kinboshi persistence", () => {
  it("round-trips kinboshiThisBasho on currentBasho", () => {
    const serialized = SerializationService.serializeBashoState(baseBasho());
    expect(serialized.kinboshiThisBasho).toEqual({ m1: 1 });
    const restored = SerializationService.deserializeBashoState(serialized);
    expect(restored.kinboshiThisBasho).toEqual({ m1: 1 });
  });

  it("round-trips BoutResult.awards on completed matches", () => {
    const serialized = SerializationService.serializeBashoState(baseBasho());
    const restored = SerializationService.deserializeBashoState(serialized);
    const match = restored.matches.find((m) => m.boutId === "bout-kin-1");
    expect(match?.result?.isKinboshi).toBe(true);
    expect(match?.result?.awards?.[0]).toMatchObject({
      type: "kinboshi",
      winnerId: "m1",
      loserId: "y1",
    });
  });

  it("deserializes safely when kinboshiThisBasho is absent (older saves)", () => {
    const serialized = SerializationService.serializeBashoState(baseBasho());
    delete (serialized as SerializedBashoState).kinboshiThisBasho;
    const restored = SerializationService.deserializeBashoState(serialized);
    expect(restored.kinboshiThisBasho ?? {}).toEqual({});
  });

  it("kinboshi AwardLogEntry shape is serializable", () => {
    const entry: AwardLogEntry = {
      bashoName: "hatsu",
      year: 2026,
      type: "kinboshi",
      winnerId: "m1",
      opponentId: "y1",
      boutId: "bout-kin-1",
      day: 3,
    };
    expect(() => JSON.parse(JSON.stringify(entry))).not.toThrow();
    expect(JSON.parse(JSON.stringify(entry)).type).toBe("kinboshi");
  });
});

// ── V18-B05 — BashoState.id must survive a save/load round-trip ────────────
// SerializedBashoState (types/save.ts:55-75) omits `id`/`isActive`/`currentDay`;
// serializeBashoState never writes them and deserializeBashoState hardcodes
// isActive:true. basho.id feeds bout-physics/NPC-tactic/officiating seeds via
// `?? "basho"` fallbacks (boutPhaseLoop.ts:212, phase01_basho_npc_tactics.ts:179,
// tactics.ts:57, officiating.ts:48, boutResultApplier.ts:193) — a mid-basho
// reload silently switches every RNG stream.

describe("V18-B05 — BashoState.id round-trip", () => {
  it("deserializeBashoState preserves the serialized basho id", () => {
    const serialized = SerializationService.serializeBashoState(baseBasho());
    const restored = SerializationService.deserializeBashoState(serialized);
    expect(restored.id).toBe("b-1");
  });

  it("a mid-basho save→load produces identical bout outcomes", () => {
    // 8 makuuchi rikishi → 4 day-3 bouts through the real tick path.
    const ids = ["r-e1", "r-w1", "r-e2", "r-w2", "r-e3", "r-w3", "r-e4", "r-w4"];
    const rikishi = ids.map((id) =>
      mockRikishi(id, {
        heyaId: "h-npc",
        division: "makuuchi",
        side: id.includes("e") ? "east" : "west",
      })
    );
    const matches: MatchSchedule[] = [
      { boutId: "b1", day: 3, eastRikishiId: "r-e1", westRikishiId: "r-w1" },
      { boutId: "b2", day: 3, eastRikishiId: "r-e2", westRikishiId: "r-w2" },
      { boutId: "b3", day: 3, eastRikishiId: "r-e3", westRikishiId: "r-w3" },
      { boutId: "b4", day: 3, eastRikishiId: "r-e4", westRikishiId: "r-w4" },
    ];
    const world = makeMockWorld({
      rikishi: new Map(rikishi.map((r) => [r.id, r])),
      heyas: new Map([["h-npc", makeMockHeya("h-npc", { rikishiIds: ids })]]),
      currentBasho: makeMockBasho({
        id: "bs-live",
        day: 3,
        matches,
        standings: new Map(ids.map((id) => [id, { wins: 0, losses: 0 }])),
      }),
      cyclePhase: "active_basho",
      currentBashoName: "hatsu",
    });

    const restored = SerializationService.deserializeWorld(
      SerializationService.serializeWorld(world)
    );

    // Causal check: the ONLY difference between these two worlds is basho.id
    // (patched restores what serialization dropped). Identical tick input must
    // produce identical bout outcomes — today the seeds diverge on "basho".
    const withId = {
      ...restored,
      currentBasho: { ...restored.currentBasho!, id: "bs-live" },
    };
    const tickedA = advanceOneDay(withId);
    const tickedB = advanceOneDay(restored);
    const outcomeOf = (w: typeof tickedA) =>
      (w.currentBasho?.matches ?? [])
        .filter((m) => m.day === 3 && m.result)
        .map((m) => `${m.result!.winnerRikishiId}:${m.result!.kimarite}`);
    expect(outcomeOf(tickedB)).toEqual(outcomeOf(tickedA));

    // The basho id itself must round-trip — this is the dropped field.
    expect(restored.currentBasho?.id).toBe("bs-live");
  });
});
