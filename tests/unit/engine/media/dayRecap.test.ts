import { describe, it, expect } from "vitest";
import { generateDayRecapHeadline } from "@/engine/media/MediaBoutService";
import { advanceBashoDay } from "@/engine/core/world";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { createDefaultMediaState } from "@/engine/media/MediaStateService";
import { makeMockWorld, mockRikishi, makeMockHeya, makeMockBasho } from "@tests/unit/engine/utils";
import type { BoutResult, MatchSchedule } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";

function makeResult(overrides: Partial<BoutResult>): BoutResult {
  return {
    boutId: "b-1",
    winner: "east",
    winnerRikishiId: "r1",
    loserRikishiId: "r2",
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    stance: "migi",
    tachiaiWinner: "east",
    duration: 6,
    upset: false,
    kenshoEnvelopes: 0,
    log: [],
    momentumScore: 10,
    inBoutInjury: null,
    isTimeout: false,
    ...overrides,
  } as BoutResult;
}

function match(day: number, result: BoutResult | null): MatchSchedule {
  return {
    boutId: result?.boutId ?? `unplayed-${day}`,
    day,
    eastRikishiId: result?.winnerRikishiId ?? "e",
    westRikishiId: result?.loserRikishiId ?? "w",
    result,
  };
}

function dayWorld(day: number, matches: MatchSchedule[]): WorldState {
  return makeMockWorld({
    year: 2025,
    week: 10,
    cyclePhase: "active_basho",
    rikishi: new Map([
      ["yoko", mockRikishi("yoko", { rank: "yokozuna", division: "makuuchi" })],
      ["ozeki1", mockRikishi("ozeki1", { rank: "ozeki", division: "makuuchi" })],
      ["seki", mockRikishi("seki", { rank: "sekiwake", division: "makuuchi" })],
      ["m1", mockRikishi("m1", { rank: "maegashira", division: "makuuchi", rankNumber: 3 })],
      ["m2", mockRikishi("m2", { rank: "maegashira", division: "makuuchi", rankNumber: 5 })],
      ["m3", mockRikishi("m3", { rank: "maegashira", division: "makuuchi", rankNumber: 8 })],
      ["j1", mockRikishi("j1", { rank: "juryo", division: "juryo", rankNumber: 2 })],
    ]),
    heyas: new Map([["h1", makeMockHeya("h1")]]),
    mediaState: createDefaultMediaState(),
    currentBasho: makeMockBasho({ day, matches }),
  });
}

describe("generateDayRecapHeadline", () => {
  it("emits 'day of upsets' when ≥2 san'yaku-ranked losers fall to upsets", () => {
    const world = dayWorld(5, [
      match(5, makeResult({ boutId: "b1", winnerRikishiId: "m1", loserRikishiId: "yoko", upset: true })),
      match(5, makeResult({ boutId: "b2", winnerRikishiId: "m2", loserRikishiId: "ozeki1", upset: true })),
      match(5, makeResult({ boutId: "b3", winnerRikishiId: "m3", loserRikishiId: "m2" })),
    ]);

    const impact = generateDayRecapHeadline(world);
    expect(impact).not.toBeNull();
    const media = impact!.worldFields?.mediaState;
    const recap = media?.headlines.at(-1);
    expect(recap?.tags).toContain("day_recap");
    expect(recap?.beat).toBe("upset");
    expect(recap?.title.length).toBeGreaterThan(0);
  });

  it("suppresses the upset-day headline below the threshold", () => {
    const world = dayWorld(5, [
      match(5, makeResult({ boutId: "b1", winnerRikishiId: "m1", loserRikishiId: "yoko", upset: true })),
      match(5, makeResult({ boutId: "b2", winnerRikishiId: "m2", loserRikishiId: "m3" })),
    ]);

    expect(generateDayRecapHeadline(world)).toBeNull();
  });

  it("ignores non-upset losses by san'yaku (expected results)", () => {
    const world = dayWorld(5, [
      match(5, makeResult({ boutId: "b1", winnerRikishiId: "ozeki1", loserRikishiId: "yoko" })),
      match(5, makeResult({ boutId: "b2", winnerRikishiId: "seki", loserRikishiId: "m1" })),
    ]);

    expect(generateDayRecapHeadline(world)).toBeNull();
  });

  it("emits a kinboshi headline on the first gold star of the basho", () => {
    const world = dayWorld(3, [
      match(3, makeResult({ boutId: "b1", winnerRikishiId: "m1", loserRikishiId: "yoko", upset: true, isKinboshi: true })),
      match(3, makeResult({ boutId: "b2", winnerRikishiId: "m2", loserRikishiId: "m3" })),
    ]);

    const impact = generateDayRecapHeadline(world);
    const recap = impact!.worldFields?.mediaState?.headlines.at(-1);
    expect(recap?.tier).toBe("main_event");
    expect(recap?.title.length).toBeGreaterThan(0);
  });

  it("does not repeat the first-kinboshi headline on later days", () => {
    const world = dayWorld(6, [
      // day 4 already had the first kinboshi
      match(4, makeResult({ boutId: "b0", winnerRikishiId: "m2", loserRikishiId: "yoko", upset: true, isKinboshi: true })),
      // day 6 has a second kinboshi — falls through to upset-day check (only 1 sanyaku upset)
      match(6, makeResult({ boutId: "b1", winnerRikishiId: "m1", loserRikishiId: "yoko", upset: true, isKinboshi: true })),
      match(6, makeResult({ boutId: "b2", winnerRikishiId: "m2", loserRikishiId: "m3" })),
    ]);

    expect(generateDayRecapHeadline(world)).toBeNull();
  });

  it("emits a leader-change headline when a new sole leader emerges", () => {
    // Before day 5: m1 4-0, m2 4-0 (tied). Day 5: m1 wins, m2 loses → m1 sole leader.
    const world = dayWorld(5, [
      ...[1, 2, 3, 4].flatMap((d) => [
        match(d, makeResult({ boutId: `w-${d}`, winnerRikishiId: "m1", loserRikishiId: "m3" })),
        match(d, makeResult({ boutId: `v-${d}`, winnerRikishiId: "m2", loserRikishiId: "yoko" })),
      ]),
      match(5, makeResult({ boutId: "b1", winnerRikishiId: "m1", loserRikishiId: "m3" })),
      match(5, makeResult({ boutId: "b2", winnerRikishiId: "yoko", loserRikishiId: "m2" })),
    ]);

    const impact = generateDayRecapHeadline(world);
    const recap = impact!.worldFields?.mediaState?.headlines.at(-1);
    expect(recap?.beat).toBe("title_race");
    expect(recap?.rikishiIds).toContain("m1");
  });

  it("returns null when nothing resolved today", () => {
    const world = dayWorld(5, [match(5, null)]);
    expect(generateDayRecapHeadline(world)).toBeNull();
  });

  it("is deterministic — same fixture yields the same headline", () => {
    const build = () =>
      dayWorld(5, [
        match(5, makeResult({ boutId: "b1", winnerRikishiId: "m1", loserRikishiId: "yoko", upset: true })),
        match(5, makeResult({ boutId: "b2", winnerRikishiId: "m2", loserRikishiId: "ozeki1", upset: true })),
      ]);
    const a = generateDayRecapHeadline(build())!.worldFields?.mediaState?.headlines.at(-1);
    const b = generateDayRecapHeadline(build())!.worldFields?.mediaState?.headlines.at(-1);
    expect(a).toEqual(b);
  });
});

describe("advanceBashoDay integration", () => {
  it("appends a recap headline for the resolved day before incrementing", () => {
    const world = dayWorld(3, [
      match(3, makeResult({ boutId: "b1", winnerRikishiId: "m1", loserRikishiId: "yoko", upset: true })),
      match(3, makeResult({ boutId: "b2", winnerRikishiId: "m2", loserRikishiId: "ozeki1", upset: true })),
    ]);

    const next = advanceBashoDay(world);
    const headlines = next.mediaState!.headlines;
    expect(headlines.some((h) => h.tags.includes("day_recap"))).toBe(true);
    expect(next.currentBasho!.day).toBe(4);
  });
});
