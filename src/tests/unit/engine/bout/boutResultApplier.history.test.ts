/**
 * boutResultApplier.history.test.ts
 *
 * Regression test for the dead `rikishi.history` field (audit WS6 residual).
 *
 * `Rikishi.history: MatchResultLog[]` is the authoritative per-bout log —
 * `getH2HReport`, `calculateStreak`, `calculateMostFrequentKimarite`, and the
 * career match-log transformers all read it. Nothing ever wrote it, so every
 * one of those surfaces rendered empty/placeholder data.
 *
 * applyBoutResult must append a MatchResultLog entry to BOTH participants'
 * history on every resolved bout.
 */
import { describe, it, expect } from "vitest";
import { applyBoutResult } from "@/engine/bout/boutResultApplier";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { getH2HReport } from "@/engine/h2h";
import { makeMockWorld, makeMockBasho, mockRikishi } from "../utils";
import type { WorldState } from "@/engine/types/world";
import type { BoutResult, MatchSchedule } from "@/engine/types/basho";

function makeBoutWorld(): { world: WorldState; match: MatchSchedule; result: BoutResult } {
  const world = makeMockWorld({ year: 2025 });
  const east = mockRikishi("east", { division: "makuuchi", rank: "maegashira" });
  const west = mockRikishi("west", { division: "makuuchi", rank: "maegashira" });
  world.rikishi.set("east", east);
  world.rikishi.set("west", west);
  world.currentBasho = makeMockBasho({
    id: "hatsu-2025",
    bashoName: "hatsu",
    year: 2025,
    day: 3,
    standings: new Map([
      ["east", { wins: 2, losses: 0, absences: 0 }],
      ["west", { wins: 1, losses: 1, absences: 0 }],
    ]),
  });

  const match: MatchSchedule = {
    boutId: "d3-east-west",
    day: 3,
    eastRikishiId: "east",
    westRikishiId: "west",
  };

  const result: BoutResult = {
    boutId: "d3-east-west",
    winner: "east",
    winnerRikishiId: "east",
    loserRikishiId: "west",
    kimarite: "oshidashi",
    kimariteName: "Oshidashi",
    stance: "migi-yotsu",
    tachiaiWinner: "east",
    duration: 5.2,
    upset: false,
    isKinboshi: false,
    log: [],
    kenshoEnvelopes: 0,
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
  } as BoutResult;

  return { world, match, result };
}

describe("applyBoutResult — rikishi.history write", () => {
  it("appends a MatchResultLog to the winner's history", () => {
    const { world, match, result } = makeBoutWorld();
    const next = resolveImpacts(world, [applyBoutResult(world, match, result)]);

    const east = next.rikishi.get("east")!;
    const entry = east.history?.[east.history.length - 1];
    expect(entry).toBeDefined();
    expect(entry.opponentId).toBe("west");
    expect(entry.win).toBe(true);
    expect(entry.kimarite).toBe("oshidashi");
    expect(entry.year).toBe(2025);
    expect(entry.day).toBe(3);
  });

  it("appends a MatchResultLog to the loser's history", () => {
    const { world, match, result } = makeBoutWorld();
    const next = resolveImpacts(world, [applyBoutResult(world, match, result)]);

    const west = next.rikishi.get("west")!;
    const entry = west.history?.[west.history.length - 1];
    expect(entry).toBeDefined();
    expect(entry.opponentId).toBe("east");
    expect(entry.win).toBe(false);
    expect(entry.kimarite).toBe("oshidashi");
  });

  it("makes getH2HReport report the meeting end-to-end", () => {
    const { world, match, result } = makeBoutWorld();
    const next = resolveImpacts(world, [applyBoutResult(world, match, result)]);

    const report = getH2HReport(next.rikishi.get("east")!, next.rikishi.get("west")!);
    expect(report.totalMeetings).toBe(1);
    expect(report.aWins).toBe(1);
    expect(report.recentMeetings[0]?.winnerId).toBe("east");
  });
});
