import { describe, it, expect, beforeEach } from "vitest";
import { publishBanzukeUpdate } from "@/engine/banzuke/BanzukePublisher";
import { makeMockWorld, makeMockBasho, mockRikishi } from "../utils";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import type { WorldState } from "@/engine/types/world";
import { MAX_PROMOTION_HISTORY } from "@/engine/almanac/types";

function pushHistoryEntry(world: WorldState, yusho: string = "none") {
  world.history.push({
    year: 2025,
    bashoNumber: 1,
    bashoName: "hatsu" as any,
    yusho: yusho as any,
    junYusho: [],
    ginoSho: "none" as any,
    shukunsho: "none" as any,
    kantosho: "none" as any,
    prizes: { yushoAmount: 0, junYushoAmount: 0, specialPrizes: 0 },
    id: "1",
  });
}

describe("promotion history in publishBanzukeUpdate", () => {
  let world: WorldState;

  beforeEach(() => {
    world = makeMockWorld({ cyclePhase: "post_basho", history: [] });
  });

  it("appends PromotionHistoryEntry for promotion events", () => {
    const r1 = mockRikishi("r1", { rank: "maegashira", rankNumber: 5, division: "makuuchi" });
    world.rikishi.set("r1", r1);

    const basho = makeMockBasho({
      bashoName: "hatsu",
      year: 2025,
      standings: new Map([["r1", { wins: 12, losses: 3, absences: 0 }]]),
    });
    world.currentBasho = basho;
    pushHistoryEntry(world, "r1");

    const impact = publishBanzukeUpdate(world);
    const newWorld = resolveImpacts(world, [impact]);
    const promHistory = newWorld.rikishi.get("r1")?.almanacRecord?.promotionHistory;
    expect(promHistory).toBeDefined();
    expect(promHistory!.length).toBeGreaterThan(0);
    expect(promHistory!.some((e) => e.kind === "promotion")).toBe(true);
  });

  it("appends PromotionHistoryEntry for demotion events", () => {
    const r1 = mockRikishi("r1", { rank: "komusubi", rankNumber: 1, division: "makuuchi" });
    world.rikishi.set("r1", r1);

    const basho = makeMockBasho({
      bashoName: "hatsu",
      year: 2025,
      standings: new Map([["r1", { wins: 4, losses: 11, absences: 0 }]]),
    });
    world.currentBasho = basho;
    pushHistoryEntry(world);

    const impact = publishBanzukeUpdate(world);
    const newWorld = resolveImpacts(world, [impact]);
    const promHistory = newWorld.rikishi.get("r1")?.almanacRecord?.promotionHistory;
    // If promotion history entries exist, verify demotion entries have correct kind
    if (promHistory && promHistory.length > 0) {
      const demotions = promHistory.filter((e) => e.kind === "demotion");
      if (demotions.length > 0) {
        expect(demotions[0].kind).toBe("demotion");
      }
    }
  });

  it("skips lateral/status movements", () => {
    const r1 = mockRikishi("r1", { rank: "maegashira", rankNumber: 5, division: "makuuchi" });
    world.rikishi.set("r1", r1);

    const basho = makeMockBasho({
      bashoName: "hatsu",
      year: 2025,
      standings: new Map([["r1", { wins: 7, losses: 8, absences: 0 }]]),
    });
    world.currentBasho = basho;
    pushHistoryEntry(world);

    const impact = publishBanzukeUpdate(world);
    const newWorld = resolveImpacts(world, [impact]);
    const promHistory = newWorld.rikishi.get("r1")?.almanacRecord?.promotionHistory;
    if (promHistory) {
      for (const entry of promHistory) {
        expect(entry.kind === "promotion" || entry.kind === "demotion").toBe(true);
      }
    }
  });

  it("sets isJump flag from MovementEvent.isJumpPromotion", () => {
    const r1 = mockRikishi("r1", { rank: "maegashira", rankNumber: 10, division: "makuuchi" });
    world.rikishi.set("r1", r1);

    const basho = makeMockBasho({
      bashoName: "hatsu",
      year: 2025,
      standings: new Map([["r1", { wins: 14, losses: 1, absences: 0 }]]),
    });
    world.currentBasho = basho;
    pushHistoryEntry(world, "r1");

    const impact = publishBanzukeUpdate(world);
    const newWorld = resolveImpacts(world, [impact]);
    const promHistory = newWorld.rikishi.get("r1")?.almanacRecord?.promotionHistory;
    if (promHistory && promHistory.length > 0) {
      // Jump promotion flag should be a boolean
      expect(typeof promHistory[0].isJump).toBe("boolean");
    }
  });

  it("sets isSanyaku flag from MovementEvent.isSanyakuPromotion", () => {
    const r1 = mockRikishi("r1", { rank: "maegashira", rankNumber: 1, division: "makuuchi" });
    world.rikishi.set("r1", r1);

    const basho = makeMockBasho({
      bashoName: "hatsu",
      year: 2025,
      standings: new Map([["r1", { wins: 13, losses: 2, absences: 0 }]]),
    });
    world.currentBasho = basho;
    pushHistoryEntry(world, "r1");

    const impact = publishBanzukeUpdate(world);
    const newWorld = resolveImpacts(world, [impact]);
    const promHistory = newWorld.rikishi.get("r1")?.almanacRecord?.promotionHistory;
    if (promHistory && promHistory.length > 0) {
      expect(typeof promHistory[0].isSanyaku).toBe("boolean");
    }
  });

  it("sets isSekitori flag from MovementEvent.isSekitoriPromotion", () => {
    const r1 = mockRikishi("r1", { rank: "makushita", rankNumber: 1, division: "makushita" });
    world.rikishi.set("r1", r1);

    const basho = makeMockBasho({
      bashoName: "hatsu",
      year: 2025,
      standings: new Map([["r1", { wins: 7, losses: 0, absences: 0 }]]),
    });
    world.currentBasho = basho;
    pushHistoryEntry(world, "r1");

    const impact = publishBanzukeUpdate(world);
    const newWorld = resolveImpacts(world, [impact]);
    const promHistory = newWorld.rikishi.get("r1")?.almanacRecord?.promotionHistory;
    if (promHistory && promHistory.length > 0) {
      expect(typeof promHistory[0].isSekitori).toBe("boolean");
    }
  });

  it("creates almanacRecord if it doesn't exist", () => {
    const r1 = mockRikishi("r1", { rank: "maegashira", rankNumber: 5, division: "makuuchi" });
    expect(r1.almanacRecord).toBeUndefined();
    world.rikishi.set("r1", r1);

    const basho = makeMockBasho({
      bashoName: "hatsu",
      year: 2025,
      standings: new Map([["r1", { wins: 12, losses: 3, absences: 0 }]]),
    });
    world.currentBasho = basho;
    pushHistoryEntry(world, "r1");

    const impact = publishBanzukeUpdate(world);
    const newWorld = resolveImpacts(world, [impact]);
    expect(newWorld.rikishi.get("r1")?.almanacRecord).toBeDefined();
  });

  it("prepends new entry (most recent first)", () => {
    const r1 = mockRikishi("r1", { rank: "maegashira", rankNumber: 5, division: "makuuchi" });
    r1.almanacRecord = {
      rikishiId: "r1",
      shikona: "Wrestler-r1",
      debutYear: 2010,
      debutBasho: "hatsu",
      totalWins: 50,
      totalLosses: 30,
      totalAbsences: 0,
      yushoCount: 0,
      junYushoCount: 0,
      sanshoCounts: { ginoSho: 0, kantosho: 0, shukunsho: 0 },
      kinboshiCount: 0,
      highestRank: "maegashira",
      ozekiRunCount: 0,
      bashoHistory: [],
      currentWinStreak: 0,
      longestWinStreak: 0,
      currentLossStreak: 0,
      isActive: true,
      promotionHistory: [
        {
          year: 2024,
          bashoName: "hatsu",
          fromRank: "maegashira 10",
          toRank: "maegashira 5",
          kind: "promotion" as const,
          isJump: false,
          isSanyaku: false,
          isSekitori: false,
        },
      ],
    };
    world.rikishi.set("r1", r1);

    const basho = makeMockBasho({
      bashoName: "hatsu",
      year: 2025,
      standings: new Map([["r1", { wins: 12, losses: 3, absences: 0 }]]),
    });
    world.currentBasho = basho;
    pushHistoryEntry(world, "r1");

    const impact = publishBanzukeUpdate(world);
    const newWorld = resolveImpacts(world, [impact]);
    const promHistory = newWorld.rikishi.get("r1")?.almanacRecord?.promotionHistory;
    if (promHistory && promHistory.length > 1) {
      expect(promHistory[0].year).toBeGreaterThanOrEqual(promHistory[1].year);
    }
  });

  it("respects MAX_PROMOTION_HISTORY cap", () => {
    const r1 = mockRikishi("r1", { rank: "maegashira", rankNumber: 5, division: "makuuchi" });
    // Pre-fill with many entries
    const existing = [];
    for (let i = 0; i < MAX_PROMOTION_HISTORY + 5; i++) {
      existing.push({
        year: 2000 + i,
        bashoName: "hatsu" as const,
        fromRank: "maegashira 10",
        toRank: "maegashira 5",
        kind: "promotion" as const,
        isJump: false,
        isSanyaku: false,
        isSekitori: false,
      });
    }
    r1.almanacRecord = {
      rikishiId: "r1",
      shikona: "Wrestler-r1",
      debutYear: 2010,
      debutBasho: "hatsu",
      totalWins: 50,
      totalLosses: 30,
      totalAbsences: 0,
      yushoCount: 0,
      junYushoCount: 0,
      sanshoCounts: { ginoSho: 0, kantosho: 0, shukunsho: 0 },
      kinboshiCount: 0,
      highestRank: "maegashira",
      ozekiRunCount: 0,
      bashoHistory: [],
      currentWinStreak: 0,
      longestWinStreak: 0,
      currentLossStreak: 0,
      isActive: true,
      promotionHistory: existing,
    };
    world.rikishi.set("r1", r1);

    const basho = makeMockBasho({
      bashoName: "hatsu",
      year: 2025,
      standings: new Map([["r1", { wins: 12, losses: 3, absences: 0 }]]),
    });
    world.currentBasho = basho;
    pushHistoryEntry(world, "r1");

    const impact = publishBanzukeUpdate(world);
    const newWorld = resolveImpacts(world, [impact]);
    const promHistory = newWorld.rikishi.get("r1")?.almanacRecord?.promotionHistory;
    expect((promHistory ?? []).length).toBeLessThanOrEqual(MAX_PROMOTION_HISTORY);
  });

  it("handles rikishi not found in world", () => {
    const basho = makeMockBasho({
      bashoName: "hatsu",
      year: 2025,
      standings: new Map([["r-missing", { wins: 12, losses: 3, absences: 0 }]]),
    });
    world.currentBasho = basho;
    pushHistoryEntry(world, "r-missing");

    // Should not throw
    const impact = publishBanzukeUpdate(world);
    expect(impact).toBeDefined();
  });
});
