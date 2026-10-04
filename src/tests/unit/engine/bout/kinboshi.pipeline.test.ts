/**
 * kinboshi.pipeline.test.ts
 * ==========================
 * End-to-end pipeline tests for the kinboshi (gold star) mechanic:
 *   resolveBout → applyBoutResult → resolveImpacts → concludeBashoCompetition
 *
 * These tests guard three properties that were previously broken:
 *   1. `basho.kinboshiThisBasho` survives impact resolution (a stale
 *      `currentBasho` write in applyBoutResult used to clobber it, leaving
 *      the mochikyukin accumulation and stipend reads permanently empty).
 *   2. Achievement counters increment exactly once (+1 earned / +1 conceded),
 *      not the asymmetric +2/+1 produced by in-place mutation + re-increment.
 *   3. `resolveBout` never mutates its input rikishi objects.
 */

import { describe, it, expect } from "vitest";
import { simulateBoutForToday } from "@/engine/world";
import { concludeBashoCompetition } from "@/engine/lifecycle/CompetitionService";
import { applyImpact, resolveImpacts } from "@/engine/core/ImpactResolver";
import { mockRikishi, makeMockWorld, makeMockBasho } from "../utils";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { MatchSchedule } from "@/engine/types/basho";

/**
 * Build a world with a single day-1 bout: east maegashira vs west yokozuna.
 * East is given a dominant stat profile so the physics outcome is a
 * deterministic east win for the fixed seed (verified by assertion inside
 * each test — a west win would skip kinboshi assertions, so we assert the
 * winner first to make that explicit).
 */
function makeKinboshiWorld(): { world: WorldState; match: MatchSchedule } {
  const east = mockRikishi("r-east", {
    rank: "maegashira",
    division: "makuuchi",
    shikona: "Underdog East",
    power: 99,
    speed: 99,
    technique: 99,
    balance: 99,
    stamina: 99,
    mental: 99,
    aggression: 80,
    injured: false,
    heyaId: "heya-a",
  });
  const west = mockRikishi("r-west", {
    rank: "yokozuna",
    division: "makuuchi",
    shikona: "Grand Champion",
    power: 10,
    speed: 10,
    technique: 10,
    balance: 10,
    stamina: 10,
    mental: 10,
    aggression: 10,
    injured: false,
    heyaId: "heya-b",
    side: "west",
  });

  const match: MatchSchedule = {
    boutId: "bout-test-001",
    day: 1,
    eastRikishiId: "r-east",
    westRikishiId: "r-west",
  };

  const basho = makeMockBasho({
    year: 2025,
    bashoName: "hatsu",
    day: 1,
    matches: [match],
    standings: new Map([
      ["r-east", { wins: 0, losses: 0, absences: 0 }],
      ["r-west", { wins: 10, losses: 0, absences: 0 }],
    ]),
  });

  const world = makeMockWorld({
    rikishi: new Map<string, Rikishi>([
      ["r-east", east],
      ["r-west", west],
    ]),
    currentBasho: basho,
    cyclePhase: "active_basho",
    year: 2025,
  });

  return { world, match };
}

describe("kinboshi pipeline — resolveBout → applyBoutResult → resolveImpacts", () => {
  it("produces a kinboshi result with awards stamped on the BoutResult", () => {
    const { world } = makeKinboshiWorld();
    const { world: next, result } = simulateBoutForToday(world, 0);

    expect(result).toBeDefined();
    expect(result!.winnerRikishiId).toBe("r-east");
    expect(result!.isKinboshi).toBe(true);
    expect(result!.awardFact).toBe("kinboshi");
    expect(result!.awards).toEqual([
      expect.objectContaining({
        type: "kinboshi",
        winnerId: "r-east",
        loserId: "r-west",
        boutId: "bout-test-001",
      }),
    ]);

    // The award must persist on the scheduled match (serialization path).
    const stored = next.currentBasho!.matches.find((m) => m.boutId === "bout-test-001");
    expect(stored?.result?.isKinboshi).toBe(true);
    expect(stored?.result?.awards?.[0]?.type).toBe("kinboshi");
  });

  it("increments kinboshiEarned/kinboshiConceded exactly once", () => {
    const { world } = makeKinboshiWorld();
    const { world: next, result } = simulateBoutForToday(world, 0);
    expect(result!.winnerRikishiId).toBe("r-east");

    const winner = next.rikishi.get("r-east")!;
    const loser = next.rikishi.get("r-west")!;
    expect(winner.stats.achievements?.kinboshiEarned).toBe(1);
    expect(loser.stats.achievements?.kinboshiConceded).toBe(1);
    // Legacy economics field stays in sync
    expect(winner.economics?.kinboshiCount).toBe(1);
  });

  it("persists kinboshiThisBasho on the basho (regression: stale currentBasho clobber)", () => {
    const { world } = makeKinboshiWorld();
    const { world: next, result } = simulateBoutForToday(world, 0);
    expect(result!.winnerRikishiId).toBe("r-east");

    expect(next.currentBasho?.kinboshiThisBasho?.["r-east"]).toBe(1);
  });

  it("does not mutate the input world's rikishi objects", () => {
    const { world } = makeKinboshiWorld();
    const inputWinner = world.rikishi.get("r-east")!;
    const inputLoser = world.rikishi.get("r-west")!;

    simulateBoutForToday(world, 0);

    expect(inputWinner.stats.achievements?.kinboshiEarned ?? 0).toBe(0);
    expect(inputLoser.stats.achievements?.kinboshiConceded ?? 0).toBe(0);
  });

  it("appends a kinboshi entry to awardLog with bout provenance", () => {
    const { world } = makeKinboshiWorld();
    const { world: next, result } = simulateBoutForToday(world, 0);
    expect(result!.winnerRikishiId).toBe("r-east");

    const entry = (next.awardLog ?? []).find((a) => a.type === "kinboshi");
    expect(entry).toBeDefined();
    expect(entry!.winnerId).toBe("r-east");
    expect(entry!.opponentId).toBe("r-west");
    expect(entry!.boutId).toBe("bout-test-001");
    expect(entry!.day).toBe(1);
    expect(entry!.bashoName).toBe("hatsu");
    expect(entry!.year).toBe(2025);
  });
});

describe("kinboshi pipeline — basho conclusion", () => {
  it("adds +10 mochikyukin points per kinboshi at basho end", () => {
    const { world } = makeKinboshiWorld();
    const { world: afterBout, result } = simulateBoutForToday(world, 0);
    expect(result!.winnerRikishiId).toBe("r-east");

    const before = afterBout.rikishi.get("r-east")!.stats.achievements?.mochikyukinPoints ?? 0;
    const impact = concludeBashoCompetition(afterBout);
    const concluded = applyImpact(afterBout, impact);
    const after = concluded.rikishi.get("r-east")!.stats.achievements?.mochikyukinPoints ?? 0;

    // +10 for the kinboshi; the east rikishi's lone win earns no other points
    // (west takes the yusho in this fixture, so no yusho/kachi-nokori bonus).
    expect(after - before).toBe(10);
  });

  it("pays no separate one-time kinboshi stipend (mochikyukin is the only payout)", () => {
    const { world } = makeKinboshiWorld();
    const { world: afterBout, result } = simulateBoutForToday(world, 0);
    expect(result!.winnerRikishiId).toBe("r-east");

    const cashBefore = afterBout.rikishi.get("r-east")!.economics?.cash ?? 0;
    const impact = concludeBashoCompetition(afterBout);
    const concluded = resolveImpacts(afterBout, [impact]);
    const cashAfter = concluded.rikishi.get("r-east")!.economics?.cash ?? 0;

    // A 1-win maegashira earns no yusho/sansho/teate — any cash delta would be
    // the deleted ¥40k stipend resurfacing.
    expect(cashAfter).toBe(cashBefore);
  });
});
