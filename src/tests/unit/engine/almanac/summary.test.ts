import { describe, it, expect } from "vitest";
import { getRikishiCareerSummary } from "../../../../engine/almanac/summary";
import type { RikishiCareerRecord } from "../../../../engine/almanac/types";

describe("getRikishiCareerSummary", () => {
  const baseRecord: RikishiCareerRecord = {
    rikishiId: "r1",
    shikona: "Test Rikishi",
    debutYear: 2020,
    debutBasho: "Hatsu",
    totalWins: 50,
    totalLosses: 30,
    totalAbsences: 0,
    yushoCount: 0,
    junYushoCount: 0,
    sanshoCounts: { ginoSho: 0, kantosho: 0, shukunsho: 0 },
    kinboshiCount: 0,
    highestRank: "Maegashira 1",
    highestRankNumber: 1,
    ozekiRunCount: 0,
    bashoHistory: [],
    currentWinStreak: 0,
    longestWinStreak: 0,
    currentLossStreak: 0,
    isActive: true,
  };

  it("returns only win-loss record when no awards present", () => {
    const summary = getRikishiCareerSummary(baseRecord);
    expect(summary).toBe("50-30");
  });

  it("includes Yusho when present", () => {
    const record = { ...baseRecord, yushoCount: 2 };
    const summary = getRikishiCareerSummary(record);
    expect(summary).toBe("2 Yusho • 50-30");
  });

  it("includes Jun-Yusho when present", () => {
    const record = { ...baseRecord, junYushoCount: 3 };
    const summary = getRikishiCareerSummary(record);
    expect(summary).toBe("3 Jun-Yusho • 50-30");
  });

  it("includes total Sansho when any sansho present", () => {
    const record = {
      ...baseRecord,
      sanshoCounts: { ginoSho: 1, kantosho: 2, shukunsho: 0 },
    };
    const summary = getRikishiCareerSummary(record);
    expect(summary).toBe("3 Sansho • 50-30");
  });

  it("includes Kinboshi when present", () => {
    const record = { ...baseRecord, kinboshiCount: 4 };
    const summary = getRikishiCareerSummary(record);
    expect(summary).toBe("4 Kinboshi • 50-30");
  });

  it("combines all components in correct order", () => {
    const record = {
      ...baseRecord,
      yushoCount: 1,
      junYushoCount: 2,
      sanshoCounts: { ginoSho: 1, kantosho: 0, shukunsho: 1 },
      kinboshiCount: 3,
    };
    const summary = getRikishiCareerSummary(record);
    expect(summary).toBe("1 Yusho • 2 Jun-Yusho • 2 Sansho • 3 Kinboshi • 50-30");
  });
});
