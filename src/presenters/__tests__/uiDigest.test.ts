import { describe, it, expect, vi } from "vitest";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- Test file global mock
// @ts-ignore
global.calculatePerceivedStats = vi.fn(() => ({ strength: "Dominant" }));
vi.mock("../../engine/events", () => ({
  queryEvents: vi.fn(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock
    (world: any) => world.events?.log?.map((e: any) => ({ ...e, type: e.type || "GENERIC" })) || []
  ),
}));
import type { StandingsTableRuntime } from "../../engine/types/basho";
import {
  enrichRikishiForUI,
  formatRadarData,
  formatMetaTrends,
  getOzekiRunCandidates,
  buildWeeklyDigest,
  getKadobanDrama,
} from "../uiDigest";
import { mockRikishi as generateMockRikishi } from "../../engine/__tests__/utils";
import type { RikishiStats, Rikishi } from "../../engine/types/rikishi";
import type { WorldState } from "../../engine/types/world";

// Mock calculatePerceivedStats properly
vi.mock("../rikishiUI", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
  calculatePerceivedStats: vi.fn().mockReturnValue({ strength: "Dominant" }),
  toRikishiDescriptor: vi.fn().mockReturnValue("Veteran"),
  }
});

describe("UI Digest: Rikishi Perception Boundary", () => {
  it("MUST NOT leak raw numerical stats into the UI model", () => {
    const rawEngineRikishi = generateMockRikishi("r_1", {
      stats: { strength: 85, technique: 40 } as unknown as RikishiStats,
    });
    const uiRikishi = enrichRikishiForUI(rawEngineRikishi);

    expect((uiRikishi as Record<string, unknown>).stats).toBeUndefined();
    expect((uiRikishi as Record<string, unknown>).strength).toBeUndefined();

    expect(uiRikishi.perceivedStats).toBeDefined();
    expect(typeof uiRikishi.perceivedStats.strength).toBe("string");
  });

  it("MUST expose public biographical data correctly", () => {
    const rawEngineRikishi = generateMockRikishi("r_123", { shikona: "Asashoryu" });
    const uiRikishi = enrichRikishiForUI(rawEngineRikishi);

    expect(uiRikishi.id).toBe("r_123");
    expect(uiRikishi.shikona).toBe("Asashoryu");
  });

  describe("formatRadarData (v2.0 Visuals)", () => {
    it("should map rikishi attributes to radar points with C5 labels", () => {
      const mockRikishi: Partial<Rikishi> = {
        power: 90,
        speed: 70,
        technique: 50,
        balance: 60,
        stamina: 80,
        aggression: 85,
      };

      const result = formatRadarData(mockRikishi as Rikishi);
      expect(result).toHaveLength(5);
      expect(result[0].subject).toBe("Power");
      expect(result[0].A).toBe(5);
    });
  });

  describe("formatMetaTrends (Streamgraph Data)", () => {
    it("should format world history into stacked components totaling 100%", () => {
      const mockWorld: Partial<WorldState> = {
        history: [
          { bashoName: "hatsu", year: 2024, metaBias: "oshi" },
          { bashoName: "haru", year: 2024, metaBias: "yotsu" },
        ],
        bashoNumber: 2,
      };

      const result = formatMetaTrends(mockWorld as WorldState);
      expect(result).toHaveLength(2);
      expect(result[0].basho).toBe("H24");
      expect(result[0].oshi + result[0].yotsu + result[0].hybrid).toBe(100);

      expect(result[0].oshi).toBeGreaterThan(result[0].yotsu);
    });

    it("should return empty if no history", () => {
      const mockWorld: Partial<WorldState> = { history: [], bashoNumber: 0 };
      expect(formatMetaTrends(mockWorld as WorldState)).toEqual([]);
    });
  });

  describe("getOzekiRunCandidates", () => {
    it("returns empty array if no historyIndex", () => {
      const world = {
        rikishi: new Map(),
      } as unknown as WorldState;
      expect(getOzekiRunCandidates(world)).toEqual([]);
    });

    it("returns empty array if no candidates (sekiwake/komusubi)", () => {
      const mockR = generateMockRikishi("r1", { rank: "maegashira" });
      const world = {
        historyIndex: { rikishi: {} },
        rikishi: new Map([["r1", mockR]]),
        heyas: new Map(),
      } as unknown as WorldState;

      expect(getOzekiRunCandidates(world)).toEqual([]);
    });

    it("calculates recent wins from last 3 basho results", () => {
      const mockR = generateMockRikishi("r1", { rank: "sekiwake", heyaId: "h2" });
      const world = {
        playerHeyaId: "h1",
        historyIndex: {
          rikishi: {
            r1: [{ wins: 5 }, { wins: 8 }, { wins: 8 }, { wins: 10 }, { wins: 11 }],
          },
        },
        rikishi: new Map([["r1", mockR]]),
        heyas: new Map(),
      } as unknown as WorldState;

      const res = getOzekiRunCandidates(world);
      expect(res).toHaveLength(1);
      expect(res[0].recentWins).toBe(29);
      expect(res[0].narrative).toBe("Building a solid case, but needs a spectacular finish.");
    });

    it("includes current basho standings in recent wins", () => {
      const mockR = generateMockRikishi("r1", { rank: "sekiwake", heyaId: "h2" });
      const world = {
        playerHeyaId: "h1",
        historyIndex: {
          rikishi: {
            r1: [{ wins: 10 }, { wins: 10 }],
          },
        },
        rikishi: new Map([["r1", mockR]]),
        heyas: new Map(),
        currentBasho: {
          standings: new Map([["r1", { wins: 12 }]]) as StandingsTableRuntime,
        },
      } as unknown as WorldState;

      const res = getOzekiRunCandidates(world);
      expect(res).toHaveLength(1);
      expect(res[0].recentWins).toBe(32);
      expect(res[0].narrative).toBe("On the brink. A few more wins will secure the rank.");
    });

    it("filters NPC rikishi with < 20 wins, but includes player rikishi", () => {
      const npcR = generateMockRikishi("r1", { rank: "sekiwake", heyaId: "npc_heya" });
      const playerR = generateMockRikishi("r2", { rank: "komusubi", heyaId: "player_heya" });

      const world = {
        playerHeyaId: "player_heya",
        historyIndex: {
          rikishi: {
            r1: [{ wins: 5 }, { wins: 5 }],
            r2: [{ wins: 5 }, { wins: 5 }],
          },
        },
        rikishi: new Map([
          ["r1", npcR],
          ["r2", playerR],
        ]),
        heyas: new Map(),
      } as unknown as WorldState;

      const res = getOzekiRunCandidates(world);

      expect(res).toHaveLength(1);
      expect(res[0].rikishi.id).toBe("r2");
      expect(res[0].recentWins).toBe(10);
    });

    it("sorts candidates descending by recentWins and assigns >=33 narrative", () => {
      const r1 = generateMockRikishi("r1", { rank: "sekiwake", heyaId: "h" });
      const r2 = generateMockRikishi("r2", { rank: "komusubi", heyaId: "h" });

      const world = {
        playerHeyaId: "player_heya",
        historyIndex: {
          rikishi: {
            r1: [{ wins: 11 }, { wins: 11 }, { wins: 11 }],
            r2: [{ wins: 12 }, { wins: 12 }, { wins: 10 }],
          },
        },
        rikishi: new Map([
          ["r1", r1],
          ["r2", r2],
        ]),
        heyas: new Map(),
      } as unknown as WorldState;

      const res = getOzekiRunCandidates(world);
      expect(res).toHaveLength(2);

      expect(res[0].rikishi.id).toBe("r2");
      expect(res[0].recentWins).toBe(34);
      expect(res[1].rikishi.id).toBe("r1");
      expect(res[1].recentWins).toBe(33);

      expect(res[0].narrative).toBe(
        "Has reached the traditional 33-win threshold. An Ozeki promotion is imminent."
      );
      expect(res[1].narrative).toBe(
        "Has reached the traditional 33-win threshold. An Ozeki promotion is imminent."
      );
    });
  });

  describe("buildWeeklyDigest", () => {
    it("returns null if world is null", () => {
      expect(buildWeeklyDigest(null)).toBeNull();
    });

    it("returns a basic digest when no events or injuries exist", () => {
      const mockWorld = {
        cyclePhase: "training",
        rikishi: new Map(),
        heyas: new Map(),
        events: { log: [] },
      } as unknown as WorldState;

      const digest = buildWeeklyDigest(mockWorld);
      expect(digest).not.toBeNull();
      expect(digest?.headline).toBe("No major events recorded this week.");
      expect(digest?.sections).toEqual([]);
      expect(digest?.counts).toEqual({
        trainingEvents: 0,
        injuries: 0,
        recoveries: 0,
        economy: 0,
        scouting: 0,
      });
    });

    it("includes injury section when rikishi are injured", () => {
      const mockR = generateMockRikishi("r1", {
        shikona: "InjuredRikishi",
        injury: { isInjured: true, severity: "moderate", weeksRemaining: 2 },
        injured: true,
      });
      const mockWorld = {
        cyclePhase: "training",
        rikishi: new Map([["r1", mockR]]),
        heyas: new Map(),
        events: { log: [] },
      } as unknown as WorldState;

      const digest = buildWeeklyDigest(mockWorld);
      expect(digest?.sections).toHaveLength(1);
      expect(digest?.sections[0].id).toBe("injuries");
      expect(digest?.sections[0].items).toHaveLength(1);
      expect(digest?.sections[0].items[0].title).toBe("InjuredRikishi injured");
      expect(digest?.sections[0].items[0].detail).toBe("moderate — 2w remaining");
      expect(digest?.headline).toBe("1 injury update this week.");
      expect(digest?.counts.injuries).toBe(1);
    });

    it("includes key matchups during active basho", () => {
      const r1 = generateMockRikishi("r1", { shikona: "East1" });
      const r2 = generateMockRikishi("r2", { shikona: "West1" });

      const mockWorld = {
        week: 2,
        cyclePhase: "active_basho",
        week: 2, // Must be > 1 to include matchups
        currentBasho: {
          day: 1,
          matches: [{ day: 1, eastRikishiId: "r1", westRikishiId: "r2" }],
        },
        rikishi: new Map([
          ["r1", r1],
          ["r2", r2],
        ]),
        heyas: new Map(),
        events: { log: [] },
      } as unknown as WorldState;

      const digest = buildWeeklyDigest(mockWorld);
      expect(digest?.sections).toHaveLength(1);
      expect(digest?.sections[0].id).toBe("matchups");
      expect(digest?.sections[0].items).toHaveLength(1);
      expect(digest?.sections[0].items[0].title).toBe("East1 vs West1");
      expect(digest?.headline).toBe("Basho Day 1: Key matchups highlighted.");
    });

    it("groups engine events into correct sections", () => {
      const mockWorld = {
        cyclePhase: "training",
        rikishi: new Map(),
        heyas: new Map(),
        events: {
          log: [
            {
              type: "TRAINING",
              id: "e1",
              category: "training",
              title: "Training Camp",
              summary: "Good training",
              timestamp: Date.now(),
            },
            {
              type: "ECONOMY",
              id: "e2",
              category: "economy",
              title: "Sponsor Bonus",
              summary: "Money earned",
              timestamp: Date.now(),
            },
            {
              type: "SCOUTING",
              id: "e3",
              category: "scouting",
              title: "New Recruit",
              summary: "Found someone",
              timestamp: Date.now(),
            },
            {
              type: "NARRATIVE",
              id: "e4",
              category: "narrative",
              title: "Rumor",
              summary: "Something happened",
              timestamp: Date.now(),
            },
          ],
        },
      } as unknown as WorldState;

      const digest = buildWeeklyDigest(mockWorld);

      const sectionIds = digest?.sections.map((s) => s.id) || [];
      expect(sectionIds).toContain("narrative");
      expect(sectionIds).toContain("training");
      expect(sectionIds).toContain("scouting");
      expect(sectionIds).toContain("economy");

      expect(digest?.counts.trainingEvents).toBe(1);
      expect(digest?.counts.economy).toBe(1);
      expect(digest?.counts.scouting).toBe(1);
    });
  });
});

describe("getKadobanDrama", () => {
  it("should return empty array if ozekiKadoban is undefined/empty", () => {
    const world = {
      ozekiKadoban: undefined,
      rikishi: new Map(),
      heyas: new Map(),
    } as unknown as WorldState;
    expect(getKadobanDrama(world)).toEqual([]);
  });

  it("should skip if !isKadoban and consecutiveMakeKoshi < 2", () => {
    const r1 = generateMockRikishi("r_1", { rank: "ozeki" });
    const world = {
      ozekiKadoban: {
        r_1: { isKadoban: false, consecutiveMakeKoshi: 1 },
      },
      rikishi: new Map([["r_1", r1]]),
      heyas: new Map(),
    } as unknown as WorldState;
    expect(getKadobanDrama(world)).toEqual([]);
  });

  it('should return "Failed to clear Kadoban. Demotion to Sekiwake confirmed." when demoted', () => {
    const r1 = generateMockRikishi("r_1", { rank: "ozeki" });
    const world = {
      ozekiKadoban: {
        r_1: { isKadoban: true, consecutiveMakeKoshi: 2 },
      },
      rikishi: new Map([["r_1", r1]]),
      heyas: new Map(),
      currentBasho: {
        standings: new Map([["r_1", { wins: 0, losses: 8 }]]),
      },
    } as unknown as WorldState;
    const result = getKadobanDrama(world);
    expect(result).toHaveLength(1);
    expect(result[0].narrative).toBe("Failed to clear Kadoban. Demotion to Sekiwake confirmed.");
    expect(result[0].isDemoted).toBe(true);
  });

  it('should return "Cleared Kadoban. Retains Ozeki rank." when cleared', () => {
    const r1 = generateMockRikishi("r_1", { rank: "ozeki" });
    const world = {
      ozekiKadoban: {
        r_1: { isKadoban: true, consecutiveMakeKoshi: 2 },
      },
      rikishi: new Map([["r_1", r1]]),
      heyas: new Map(),
      currentBasho: {
        standings: new Map([["r_1", { wins: 8, losses: 0 }]]),
      },
    } as unknown as WorldState;
    const result = getKadobanDrama(world);
    expect(result).toHaveLength(1);
    expect(result[0].narrative).toBe("Cleared Kadoban. Retains Ozeki rank.");
    expect(result[0].isDemoted).toBe(false);
  });

  it('should return "Fighting for survival as Kadoban Ozeki." when isKadoban is true and < 8 wins/losses', () => {
    const r1 = generateMockRikishi("r_1", { rank: "ozeki" });
    const world = {
      ozekiKadoban: {
        r_1: { isKadoban: true, consecutiveMakeKoshi: 2 },
      },
      rikishi: new Map([["r_1", r1]]),
      heyas: new Map(),
      currentBasho: {
        standings: new Map([["r_1", { wins: 7, losses: 7 }]]),
      },
    } as unknown as WorldState;
    const result = getKadobanDrama(world);
    expect(result).toHaveLength(1);
    expect(result[0].narrative).toBe("Fighting for survival as Kadoban Ozeki.");
    expect(result[0].isDemoted).toBe(false);
  });
});
