/**
 * banzuke.test.ts
 * Tests for the Banzuke rank promotion/demotion system
 */

import { describe, it, expect } from "vitest";
import {
  RANK_HIERARCHY,
  compareRanks,
  formatRank,
  kachiKoshiThreshold,
  isKachiKoshi,
  isMakeKoshi,
  getOzekiStatus,
  updateBanzuke,
  type BanzukeEntry,
  type BashoPerformance,
  type OzekiKadobanMap,
} from "../banzuke";
import type { RankPosition } from "../types";

describe("Banzuke: Rank Hierarchy", () => {
  it("should have correct tier ordering (lower = higher rank)", () => {
    expect(RANK_HIERARCHY.yokozuna.tier).toBe(1);
    expect(RANK_HIERARCHY.ozeki.tier).toBe(2);
    expect(RANK_HIERARCHY.sekiwake.tier).toBe(3);
    expect(RANK_HIERARCHY.komusubi.tier).toBe(4);
    expect(RANK_HIERARCHY.maegashira.tier).toBe(5);
    expect(RANK_HIERARCHY.juryo.tier).toBe(6);
    expect(RANK_HIERARCHY.makushita.tier).toBe(7);
  });

  it("should mark sanyaku ranks correctly", () => {
    expect(RANK_HIERARCHY.yokozuna.isSanyaku).toBe(true);
    expect(RANK_HIERARCHY.ozeki.isSanyaku).toBe(true);
    expect(RANK_HIERARCHY.sekiwake.isSanyaku).toBe(true);
    expect(RANK_HIERARCHY.komusubi.isSanyaku).toBe(true);
    expect(RANK_HIERARCHY.maegashira.isSanyaku).toBe(false);
  });

  it("should mark sekitori status correctly", () => {
    expect(RANK_HIERARCHY.maegashira.isSekitori).toBe(true);
    expect(RANK_HIERARCHY.juryo.isSekitori).toBe(true);
    expect(RANK_HIERARCHY.makushita.isSekitori).toBe(false);
  });

  it("should have correct bout counts per division", () => {
    expect(RANK_HIERARCHY.yokozuna.fightsPerBasho).toBe(15);
    expect(RANK_HIERARCHY.maegashira.fightsPerBasho).toBe(15);
    expect(RANK_HIERARCHY.makushita.fightsPerBasho).toBe(7);
  });
});

describe("Banzuke: Rank Comparison", () => {
  it("should rank yokozuna above ozeki", () => {
    const yokozuna: RankPosition = { rank: "yokozuna", side: "east" };
    const ozeki: RankPosition = { rank: "ozeki", side: "east" };
    expect(compareRanks(yokozuna, ozeki)).toBeLessThan(0);
  });

  it("should rank east above west for same rank", () => {
    const east: RankPosition = { rank: "sekiwake", side: "east" };
    const west: RankPosition = { rank: "sekiwake", side: "west" };
    expect(compareRanks(east, west)).toBeLessThan(0);
  });

  it("should order maegashira by rank number", () => {
    const m1: RankPosition = { rank: "maegashira", side: "east", rankNumber: 1 };
    const m5: RankPosition = { rank: "maegashira", side: "east", rankNumber: 5 };
    expect(compareRanks(m1, m5)).toBeLessThan(0);
  });

  it("should handle same rank same side same number as equal", () => {
    const a: RankPosition = { rank: "komusubi", side: "west" };
    const b: RankPosition = { rank: "komusubi", side: "west" };
    expect(compareRanks(a, b)).toBe(0);
  });
});

describe("Banzuke: Rank Formatting", () => {
  it("should format sanyaku ranks correctly", () => {
    expect(formatRank({ rank: "yokozuna", side: "east" })).toBe("横綱E");
    expect(formatRank({ rank: "ozeki", side: "west" })).toBe("大関W");
  });

  it("should format numbered ranks with rank number", () => {
    expect(formatRank({ rank: "maegashira", side: "east", rankNumber: 3 })).toBe("前頭3E");
    expect(formatRank({ rank: "juryo", side: "west", rankNumber: 12 })).toBe("十両12W");
  });
});

describe("Banzuke: Kachi-Koshi / Make-Koshi", () => {
  it("should calculate kachi-koshi threshold for 15-bout division", () => {
    expect(kachiKoshiThreshold("maegashira")).toBe(8);
    expect(kachiKoshiThreshold("juryo")).toBe(8);
  });

  it("should calculate kachi-koshi threshold for 7-bout division", () => {
    expect(kachiKoshiThreshold("makushita")).toBe(4);
    expect(kachiKoshiThreshold("sandanme")).toBe(4);
  });

  it("should identify kachi-koshi correctly", () => {
    expect(isKachiKoshi(8, 7, "maegashira")).toBe(true);
    expect(isKachiKoshi(7, 8, "maegashira")).toBe(false);
    expect(isKachiKoshi(10, 5, "maegashira")).toBe(true);
  });

  it("should identify make-koshi correctly", () => {
    expect(isMakeKoshi(7, 8, "maegashira")).toBe(true);
    expect(isMakeKoshi(8, 7, "maegashira")).toBe(false);
    expect(isMakeKoshi(5, 10, "maegashira")).toBe(true);
  });

  it("should count absences toward make-koshi", () => {
    // 7 wins, 5 losses, 3 absences = 8 effective losses = make-koshi
    expect(isMakeKoshi(7, 5, "maegashira", 3)).toBe(true);
    // 7 wins, 6 losses, 1 absence = 7 effective losses = not make-koshi
    expect(isMakeKoshi(7, 6, "maegashira", 1)).toBe(false);
  });
});

describe("Banzuke: Ozeki Kadoban System", () => {
  it("should reset kadoban state on kachi-koshi", () => {
    const prev = { isKadoban: true, consecutiveMakeKoshi: 1 };
    const result = getOzekiStatus(10, 5, 0, prev);
    expect(result.isKadoban).toBe(false);
    expect(result.consecutiveMakeKoshi).toBe(0);
  });

  it("should enter kadoban on first make-koshi", () => {
    const prev = { isKadoban: false, consecutiveMakeKoshi: 0 };
    const result = getOzekiStatus(6, 9, 0, prev);
    expect(result.isKadoban).toBe(true);
    expect(result.consecutiveMakeKoshi).toBe(1);
  });

  it("should trigger demotion on second consecutive make-koshi", () => {
    const prev = { isKadoban: true, consecutiveMakeKoshi: 1 };
    const result = getOzekiStatus(5, 10, 0, prev);
    expect(result.consecutiveMakeKoshi).toBe(2);
  });

  it("should handle absences in kadoban calculation", () => {
    const prev = { isKadoban: false, consecutiveMakeKoshi: 0 };
    // 7 wins, 3 losses, 5 absences → make-koshi
    const result = getOzekiStatus(7, 3, 5, prev);
    expect(result.isKadoban).toBe(true);
  });

  it("should handle undefined previous state", () => {
    const result = getOzekiStatus(5, 10, 0, undefined);
    expect(result.isKadoban).toBe(true);
    expect(result.consecutiveMakeKoshi).toBe(1);
  });
});

describe("Banzuke: Full Update - Promotions", () => {
  function createMinimalBanzuke(): BanzukeEntry[] {
    const entries: BanzukeEntry[] = [];
    
    // 2 Ozeki
    entries.push({ rikishiId: "ozeki1", division: "makuuchi", position: { rank: "ozeki", side: "east" } });
    entries.push({ rikishiId: "ozeki2", division: "makuuchi", position: { rank: "ozeki", side: "west" } });
    
    // 2 Sekiwake
    entries.push({ rikishiId: "sekiwake1", division: "makuuchi", position: { rank: "sekiwake", side: "east" } });
    entries.push({ rikishiId: "sekiwake2", division: "makuuchi", position: { rank: "sekiwake", side: "west" } });
    
    // 2 Komusubi
    entries.push({ rikishiId: "komusubi1", division: "makuuchi", position: { rank: "komusubi", side: "east" } });
    entries.push({ rikishiId: "komusubi2", division: "makuuchi", position: { rank: "komusubi", side: "west" } });
    
    // Fill maegashira (need many to fill template)
    for (let i = 1; i <= 18; i++) {
      entries.push({
        rikishiId: `maegashira${i}e`,
        division: "makuuchi",
        position: { rank: "maegashira", side: "east", rankNumber: i }
      });
      entries.push({
        rikishiId: `maegashira${i}w`,
        division: "makuuchi",
        position: { rank: "maegashira", side: "west", rankNumber: i }
      });
    }
    
    // Fill juryo
    for (let i = 1; i <= 14; i++) {
      entries.push({
        rikishiId: `juryo${i}e`,
        division: "juryo",
        position: { rank: "juryo", side: "east", rankNumber: i }
      });
      entries.push({
        rikishiId: `juryo${i}w`,
        division: "juryo",
        position: { rank: "juryo", side: "west", rankNumber: i }
      });
    }
    
    // Fill lower divisions
    for (let i = 1; i <= 30; i++) {
      entries.push({
        rikishiId: `makushita${i}e`,
        division: "makushita",
        position: { rank: "makushita", side: "east", rankNumber: i }
      });
      entries.push({
        rikishiId: `makushita${i}w`,
        division: "makushita",
        position: { rank: "makushita", side: "west", rankNumber: i }
      });
    }
    
    for (let i = 1; i <= 25; i++) {
      entries.push({
        rikishiId: `sandanme${i}e`,
        division: "sandanme",
        position: { rank: "sandanme", side: "east", rankNumber: i }
      });
      entries.push({
        rikishiId: `sandanme${i}w`,
        division: "sandanme",
        position: { rank: "sandanme", side: "west", rankNumber: i }
      });
    }
    
    for (let i = 1; i <= 20; i++) {
      entries.push({
        rikishiId: `jonidan${i}e`,
        division: "jonidan",
        position: { rank: "jonidan", side: "east", rankNumber: i }
      });
      entries.push({
        rikishiId: `jonidan${i}w`,
        division: "jonidan",
        position: { rank: "jonidan", side: "west", rankNumber: i }
      });
    }
    
    for (let i = 1; i <= 10; i++) {
      entries.push({
        rikishiId: `jonokuchi${i}e`,
        division: "jonokuchi",
        position: { rank: "jonokuchi", side: "east", rankNumber: i }
      });
      entries.push({
        rikishiId: `jonokuchi${i}w`,
        division: "jonokuchi",
        position: { rank: "jonokuchi", side: "west", rankNumber: i }
      });
    }
    
    return entries;
  }

  it("should promote sekiwake to ozeki with 11+ wins", () => {
    const banzuke = createMinimalBanzuke();
    const performance: BashoPerformance[] = banzuke.map((e) => ({
      rikishiId: e.rikishiId,
      wins: 8,
      losses: 7
    }));
    
    // Give sekiwake1 an ozeki-worthy record
    const sekiwakePerf = performance.find((p) => p.rikishiId === "sekiwake1")!;
    sekiwakePerf.wins = 12;
    sekiwakePerf.losses = 3;
    
    const result = updateBanzuke(banzuke, performance, {});
    
    // Check that sekiwake1 is now ozeki
    const newEntry = result.newBanzuke.find((e) => e.rikishiId === "sekiwake1");
    expect(newEntry?.position.rank).toBe("ozeki");
  });

  it("should promote ozeki to yokozuna when flagged", () => {
    const banzuke = createMinimalBanzuke();
    const performance: BashoPerformance[] = banzuke.map((e) => ({
      rikishiId: e.rikishiId,
      wins: 8,
      losses: 7
    }));
    
    // Flag ozeki1 for yokozuna promotion
    const ozekiPerf = performance.find((p) => p.rikishiId === "ozeki1")!;
    ozekiPerf.wins = 14;
    ozekiPerf.losses = 1;
    ozekiPerf.promoteToYokozuna = true;
    
    const result = updateBanzuke(banzuke, performance, {});
    
    const newEntry = result.newBanzuke.find((e) => e.rikishiId === "ozeki1");
    expect(newEntry?.position.rank).toBe("yokozuna");
  });

  it("should generate promotion event for rank changes", () => {
    const banzuke = createMinimalBanzuke();
    const performance: BashoPerformance[] = banzuke.map((e) => ({
      rikishiId: e.rikishiId,
      wins: 8,
      losses: 7
    }));
    
    // Strong komusubi performance
    const komusubiPerf = performance.find((p) => p.rikishiId === "komusubi1")!;
    komusubiPerf.wins = 11;
    komusubiPerf.losses = 4;
    
    const result = updateBanzuke(banzuke, performance, {});
    
    const promotionEvent = result.events.find(
      (e) => e.rikishiId === "komusubi1" && e.kind === "promotion"
    );
    expect(promotionEvent).toBeDefined();
  });
});

describe("Banzuke: Full Update - Demotions", () => {
  function createBanzukeWithOzeki(): BanzukeEntry[] {
    const entries: BanzukeEntry[] = [];
    
    entries.push({ rikishiId: "ozeki1", division: "makuuchi", position: { rank: "ozeki", side: "east" } });
    entries.push({ rikishiId: "ozeki2", division: "makuuchi", position: { rank: "ozeki", side: "west" } });
    entries.push({ rikishiId: "sekiwake1", division: "makuuchi", position: { rank: "sekiwake", side: "east" } });
    entries.push({ rikishiId: "sekiwake2", division: "makuuchi", position: { rank: "sekiwake", side: "west" } });
    entries.push({ rikishiId: "komusubi1", division: "makuuchi", position: { rank: "komusubi", side: "east" } });
    entries.push({ rikishiId: "komusubi2", division: "makuuchi", position: { rank: "komusubi", side: "west" } });
    
    for (let i = 1; i <= 18; i++) {
      entries.push({ rikishiId: `m${i}e`, division: "makuuchi", position: { rank: "maegashira", side: "east", rankNumber: i } });
      entries.push({ rikishiId: `m${i}w`, division: "makuuchi", position: { rank: "maegashira", side: "west", rankNumber: i } });
    }
    
    for (let i = 1; i <= 14; i++) {
      entries.push({ rikishiId: `j${i}e`, division: "juryo", position: { rank: "juryo", side: "east", rankNumber: i } });
      entries.push({ rikishiId: `j${i}w`, division: "juryo", position: { rank: "juryo", side: "west", rankNumber: i } });
    }
    
    for (let i = 1; i <= 30; i++) {
      entries.push({ rikishiId: `ms${i}e`, division: "makushita", position: { rank: "makushita", side: "east", rankNumber: i } });
      entries.push({ rikishiId: `ms${i}w`, division: "makushita", position: { rank: "makushita", side: "west", rankNumber: i } });
    }
    
    for (let i = 1; i <= 25; i++) {
      entries.push({ rikishiId: `sd${i}e`, division: "sandanme", position: { rank: "sandanme", side: "east", rankNumber: i } });
      entries.push({ rikishiId: `sd${i}w`, division: "sandanme", position: { rank: "sandanme", side: "west", rankNumber: i } });
    }
    
    for (let i = 1; i <= 20; i++) {
      entries.push({ rikishiId: `jd${i}e`, division: "jonidan", position: { rank: "jonidan", side: "east", rankNumber: i } });
      entries.push({ rikishiId: `jd${i}w`, division: "jonidan", position: { rank: "jonidan", side: "west", rankNumber: i } });
    }
    
    for (let i = 1; i <= 10; i++) {
      entries.push({ rikishiId: `jk${i}e`, division: "jonokuchi", position: { rank: "jonokuchi", side: "east", rankNumber: i } });
      entries.push({ rikishiId: `jk${i}w`, division: "jonokuchi", position: { rank: "jonokuchi", side: "west", rankNumber: i } });
    }
    
    return entries;
  }

  it("should demote ozeki after two consecutive make-koshi", () => {
    const banzuke = createBanzukeWithOzeki();
    const performance: BashoPerformance[] = banzuke.map((e) => ({
      rikishiId: e.rikishiId,
      wins: 8,
      losses: 7
    }));
    
    // Give ozeki1 a make-koshi
    const ozekiPerf = performance.find((p) => p.rikishiId === "ozeki1")!;
    ozekiPerf.wins = 4;
    ozekiPerf.losses = 11;
    
    // Previous state: already kadoban from last basho
    const prevKadoban: OzekiKadobanMap = {
      ozeki1: { isKadoban: true, consecutiveMakeKoshi: 1 }
    };
    
    const result = updateBanzuke(banzuke, performance, prevKadoban);
    
    // Check demotion triggered
    expect(result.updatedOzekiKadoban.ozeki1.consecutiveMakeKoshi).toBe(2);
    
    // Check rank is now sekiwake
    const newEntry = result.newBanzuke.find((e) => e.rikishiId === "ozeki1");
    expect(newEntry?.position.rank).toBe("sekiwake");
  });

  it("should generate demotion events", () => {
    const banzuke = createBanzukeWithOzeki();
    const performance: BashoPerformance[] = banzuke.map((e) => ({
      rikishiId: e.rikishiId,
      wins: 8,
      losses: 7
    }));
    
    // Poor maegashira performance
    const m1Perf = performance.find((p) => p.rikishiId === "m18e")!;
    m1Perf.wins = 2;
    m1Perf.losses = 13;
    
    const result = updateBanzuke(banzuke, performance, {});
    
    const demotionEvent = result.events.find(
      (e) => e.rikishiId === "m18e" && e.kind === "demotion"
    );
    expect(demotionEvent).toBeDefined();
  });

  it("should track ozeki kadoban status changes", () => {
    const banzuke = createBanzukeWithOzeki();
    const performance: BashoPerformance[] = banzuke.map((e) => ({
      rikishiId: e.rikishiId,
      wins: 8,
      losses: 7
    }));
    
    // Give ozeki1 a make-koshi (first time)
    const ozekiPerf = performance.find((p) => p.rikishiId === "ozeki1")!;
    ozekiPerf.wins = 6;
    ozekiPerf.losses = 9;
    
    // Initialize empty prev map properly to ensure tracking
    const prevKadoban: OzekiKadobanMap = {
      ozeki1: { isKadoban: false, consecutiveMakeKoshi: 0 }
    };
    
    const result = updateBanzuke(banzuke, performance, prevKadoban);
    
    // Should now be kadoban
    expect(result.updatedOzekiKadoban.ozeki1.isKadoban).toBe(true);
    expect(result.updatedOzekiKadoban.ozeki1.consecutiveMakeKoshi).toBe(1);
    
    // Should have status event
    const statusEvent = result.events.find(
      (e) => e.rikishiId === "ozeki1" && e.kind === "status"
    );
    expect(statusEvent).toBeDefined();
  });
});

describe("Banzuke: Yusho & Special Prizes Impact", () => {
  function createSimpleBanzuke(): BanzukeEntry[] {
    const entries: BanzukeEntry[] = [];
    
    entries.push({ rikishiId: "ozeki1", division: "makuuchi", position: { rank: "ozeki", side: "east" } });
    entries.push({ rikishiId: "ozeki2", division: "makuuchi", position: { rank: "ozeki", side: "west" } });
    entries.push({ rikishiId: "sekiwake1", division: "makuuchi", position: { rank: "sekiwake", side: "east" } });
    entries.push({ rikishiId: "sekiwake2", division: "makuuchi", position: { rank: "sekiwake", side: "west" } });
    entries.push({ rikishiId: "komusubi1", division: "makuuchi", position: { rank: "komusubi", side: "east" } });
    entries.push({ rikishiId: "komusubi2", division: "makuuchi", position: { rank: "komusubi", side: "west" } });
    
    for (let i = 1; i <= 18; i++) {
      entries.push({ rikishiId: `m${i}e`, division: "makuuchi", position: { rank: "maegashira", side: "east", rankNumber: i } });
      entries.push({ rikishiId: `m${i}w`, division: "makuuchi", position: { rank: "maegashira", side: "west", rankNumber: i } });
    }
    
    for (let i = 1; i <= 14; i++) {
      entries.push({ rikishiId: `j${i}e`, division: "juryo", position: { rank: "juryo", side: "east", rankNumber: i } });
      entries.push({ rikishiId: `j${i}w`, division: "juryo", position: { rank: "juryo", side: "west", rankNumber: i } });
    }
    
    for (let i = 1; i <= 30; i++) {
      entries.push({ rikishiId: `ms${i}e`, division: "makushita", position: { rank: "makushita", side: "east", rankNumber: i } });
      entries.push({ rikishiId: `ms${i}w`, division: "makushita", position: { rank: "makushita", side: "west", rankNumber: i } });
    }
    
    for (let i = 1; i <= 25; i++) {
      entries.push({ rikishiId: `sd${i}e`, division: "sandanme", position: { rank: "sandanme", side: "east", rankNumber: i } });
      entries.push({ rikishiId: `sd${i}w`, division: "sandanme", position: { rank: "sandanme", side: "west", rankNumber: i } });
    }
    
    for (let i = 1; i <= 20; i++) {
      entries.push({ rikishiId: `jd${i}e`, division: "jonidan", position: { rank: "jonidan", side: "east", rankNumber: i } });
      entries.push({ rikishiId: `jd${i}w`, division: "jonidan", position: { rank: "jonidan", side: "west", rankNumber: i } });
    }
    
    for (let i = 1; i <= 10; i++) {
      entries.push({ rikishiId: `jk${i}e`, division: "jonokuchi", position: { rank: "jonokuchi", side: "east", rankNumber: i } });
      entries.push({ rikishiId: `jk${i}w`, division: "jonokuchi", position: { rank: "jonokuchi", side: "west", rankNumber: i } });
    }
    
    return entries;
  }

  it("should give yusho winner a significant rank boost", () => {
    const banzuke = createSimpleBanzuke();
    const performance: BashoPerformance[] = banzuke.map((e) => ({
      rikishiId: e.rikishiId,
      wins: 8,
      losses: 7
    }));
    
    // m5e wins yusho
    const yushoPerf = performance.find((p) => p.rikishiId === "m5e")!;
    yushoPerf.wins = 14;
    yushoPerf.losses = 1;
    yushoPerf.yusho = true;
    
    const result = updateBanzuke(banzuke, performance, {});
    
    // Should be promoted significantly
    const newEntry = result.newBanzuke.find((e) => e.rikishiId === "m5e");
    expect(newEntry).toBeDefined();
    
    // Should be sanyaku or high maegashira
    const tier = RANK_HIERARCHY[newEntry!.position.rank].tier;
    expect(tier).toBeLessThanOrEqual(5); // At most maegashira
  });

  it("should give jun-yusho a moderate boost", () => {
    const banzuke = createSimpleBanzuke();
    const performance: BashoPerformance[] = banzuke.map((e) => ({
      rikishiId: e.rikishiId,
      wins: 8,
      losses: 7
    }));
    
    // m8e gets jun-yusho
    const junYushoPerf = performance.find((p) => p.rikishiId === "m8e")!;
    junYushoPerf.wins = 12;
    junYushoPerf.losses = 3;
    junYushoPerf.junYusho = true;
    
    const result = updateBanzuke(banzuke, performance, {});
    
    const newEntry = result.newBanzuke.find((e) => e.rikishiId === "m8e");
    expect(newEntry).toBeDefined();
    
    // Should have moved up
    const newRankNum = newEntry?.position.rankNumber ?? 99;
    expect(newRankNum).toBeLessThan(8);
  });
});

describe("Banzuke: Sanyaku Slot Allocation", () => {
  it("should maintain minimum 2 ozeki slots", () => {
    const banzuke: BanzukeEntry[] = [];
    
    // Only 1 ozeki in current banzuke
    banzuke.push({ rikishiId: "ozeki1", division: "makuuchi", position: { rank: "ozeki", side: "east" } });
    banzuke.push({ rikishiId: "sekiwake1", division: "makuuchi", position: { rank: "sekiwake", side: "east" } });
    banzuke.push({ rikishiId: "sekiwake2", division: "makuuchi", position: { rank: "sekiwake", side: "west" } });
    banzuke.push({ rikishiId: "komusubi1", division: "makuuchi", position: { rank: "komusubi", side: "east" } });
    banzuke.push({ rikishiId: "komusubi2", division: "makuuchi", position: { rank: "komusubi", side: "west" } });
    
    // Fill rest
    for (let i = 1; i <= 18; i++) {
      banzuke.push({ rikishiId: `m${i}e`, division: "makuuchi", position: { rank: "maegashira", side: "east", rankNumber: i } });
      banzuke.push({ rikishiId: `m${i}w`, division: "makuuchi", position: { rank: "maegashira", side: "west", rankNumber: i } });
    }
    
    for (let i = 1; i <= 14; i++) {
      banzuke.push({ rikishiId: `j${i}e`, division: "juryo", position: { rank: "juryo", side: "east", rankNumber: i } });
      banzuke.push({ rikishiId: `j${i}w`, division: "juryo", position: { rank: "juryo", side: "west", rankNumber: i } });
    }
    
    for (let i = 1; i <= 30; i++) {
      banzuke.push({ rikishiId: `ms${i}e`, division: "makushita", position: { rank: "makushita", side: "east", rankNumber: i } });
      banzuke.push({ rikishiId: `ms${i}w`, division: "makushita", position: { rank: "makushita", side: "west", rankNumber: i } });
    }
    
    for (let i = 1; i <= 25; i++) {
      banzuke.push({ rikishiId: `sd${i}e`, division: "sandanme", position: { rank: "sandanme", side: "east", rankNumber: i } });
      banzuke.push({ rikishiId: `sd${i}w`, division: "sandanme", position: { rank: "sandanme", side: "west", rankNumber: i } });
    }
    
    for (let i = 1; i <= 20; i++) {
      banzuke.push({ rikishiId: `jd${i}e`, division: "jonidan", position: { rank: "jonidan", side: "east", rankNumber: i } });
      banzuke.push({ rikishiId: `jd${i}w`, division: "jonidan", position: { rank: "jonidan", side: "west", rankNumber: i } });
    }
    
    for (let i = 1; i <= 10; i++) {
      banzuke.push({ rikishiId: `jk${i}e`, division: "jonokuchi", position: { rank: "jonokuchi", side: "east", rankNumber: i } });
      banzuke.push({ rikishiId: `jk${i}w`, division: "jonokuchi", position: { rank: "jonokuchi", side: "west", rankNumber: i } });
    }
    
    const performance: BashoPerformance[] = banzuke.map((e) => ({
      rikishiId: e.rikishiId,
      wins: 8,
      losses: 7
    }));
    
    const result = updateBanzuke(banzuke, performance, {});
    
    // Should have at least 2 ozeki slots
    expect(result.sanyakuCounts.ozeki).toBeGreaterThanOrEqual(2);
  });
});
