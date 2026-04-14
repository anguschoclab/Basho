import { describe, it, expect } from "vitest";
import { projectBashoSummary, projectBoutRow } from "../bashoUI";
import { mockRikishi } from "../../engine/__tests__/utils";
import type { BashoState, BashoResult, MatchSchedule } from "../../engine/types/basho";
import type { WorldState } from "../../engine/types/world";
import type { IdMapRuntime } from "../../engine/types/common";
import type { Rikishi } from "../../engine/types/rikishi";

describe("Basho UI Presenters", () => {
  describe("projectBashoSummary", () => {
    it("maps an active basho correctly (no results)", () => {
      const state: Partial<BashoState> = {
        year: 2024,
        bashoNumber: 1,
        bashoName: "hatsu",
        day: 5,
        isActive: true,
      };

      const result = projectBashoSummary(state as BashoState);

      expect(result.year).toBe(2024);
      expect(result.bashoNumber).toBe(1);
      expect(result.bashoName).toBe("hatsu");
      expect(result.totalDays).toBe(15);
      expect(result.currentDay).toBe(5);
      expect(result.isActive).toBe(true);
      expect(result.yushoId).toBeUndefined();
      expect(result.yushoShikona).toBeUndefined();
      expect(result.junYushoIds).toEqual([]);
      expect(result.specialPrizes).toEqual({
        shukunSho: undefined,
        kantoSho: undefined,
        ginoSho: undefined,
      });
    });

    it("maps a completed basho with results (no world state)", () => {
      const state: Partial<BashoState> = {
        year: 2024,
        bashoNumber: 2,
        bashoName: "haru",
        day: 15,
        isActive: false,
      };

      const bashoResult: Partial<BashoResult> = {
        yusho: "r_yusho",
        junYusho: ["r_jun1", "r_jun2"],
        shukunsho: "r_shukun",
        kantosho: "r_kanto",
        ginoSho: "r_gino",
      };

      const result = projectBashoSummary(state as BashoState, bashoResult as BashoResult);

      expect(result.yushoId).toBe("r_yusho");
      expect(result.yushoShikona).toBeUndefined(); // Needs world to resolve
      expect(result.junYushoIds).toEqual(["r_jun1", "r_jun2"]);
      expect(result.specialPrizes).toEqual({
        shukunSho: "r_shukun",
        kantoSho: "r_kanto",
        ginoSho: "r_gino",
      });
    });

    it("resolves yusho winner shikona when world state is provided", () => {
      const state: Partial<BashoState> = {
        year: 2024,
        bashoNumber: 3,
        bashoName: "natsu",
        day: 15,
        isActive: false,
      };

      const bashoResult: Partial<BashoResult> = {
        yusho: "r_123",
      };

      const mockMap = new Map<string, Rikishi>();
      mockMap.set("r_123", mockRikishi("r_123", { shikona: "Hakuho" }));

      const world: Partial<WorldState> = {
        rikishi: mockMap as IdMapRuntime<Rikishi>,
      };

      const result = projectBashoSummary(
        state as BashoState,
        bashoResult as BashoResult,
        world as WorldState
      );

      expect(result.yushoId).toBe("r_123");
      expect(result.yushoShikona).toBe("Hakuho");
    });
  });

  describe("projectBoutRow", () => {
    it("handles fallback values when rikishi are not in world state", () => {
      const match: Partial<MatchSchedule> = {
        boutId: "b_1",
        day: 1,
        eastRikishiId: "e_1",
        westRikishiId: "w_1",
      };

      const world: Partial<WorldState> = {
        rikishi: new Map() as unknown as IdMapRuntime<Rikishi>,
      };

      const result = projectBoutRow(match as MatchSchedule, world as WorldState);

      expect(result.eastShikona).toBe("Unknown");
      expect(result.eastRank).toBe("??");
      expect(result.eastRankShort).toBe("??");
      expect(result.eastRecord).toBe("0-0");

      expect(result.westShikona).toBe("Unknown");
      expect(result.westRank).toBe("??");
      expect(result.westRankShort).toBe("??");
      expect(result.westRecord).toBe("0-0");
    });

    it("maps complete bout information correctly", () => {
      const match: Partial<MatchSchedule> = {
        boutId: "b_2",
        day: 5,
        eastRikishiId: "e_2",
        westRikishiId: "w_2",
        result: {
          winner: "east",
          kimariteName: "Oshidashi",
          duration: 3.5,
          upset: true,
          isKinboshi: false,
        } as unknown as MatchSchedule["result"],
      };

      const mockMap = new Map<string, Rikishi>();
      mockMap.set(
        "e_2",
        mockRikishi("e_2", {
          shikona: "Asashoryu",
          rank: "yokozuna",
          rankNumber: 1,
          currentBashoWins: 4,
          currentBashoLosses: 0,
        })
      );
      mockMap.set(
        "w_2",
        mockRikishi("w_2", {
          shikona: "Takakeisho",
          rank: "ozeki",
          rankNumber: 1,
          currentBashoWins: 3,
          currentBashoLosses: 1,
        })
      );

      const world: Partial<WorldState> = {
        rikishi: mockMap as unknown as IdMapRuntime<Rikishi>,
      };

      const result = projectBoutRow(match as MatchSchedule, world as WorldState);

      expect(result.eastShikona).toBe("Asashoryu");
      expect(result.eastRankShort).toBe("Y1");
      expect(result.eastRecord).toBe("4-0");

      expect(result.westShikona).toBe("Takakeisho");
      expect(result.westRankShort).toBe("O1");
      expect(result.westRecord).toBe("3-1");

      expect(result.winner).toBe("east");
      expect(result.kimarite).toBe("Oshidashi");
      expect(result.duration).toBe(3.5);
      expect(result.isUpset).toBe(true);
      expect(result.isKinboshi).toBe(false);
    });
  });

  it("handles rank but no rankNumber", () => {
    const match: Partial<MatchSchedule> = {
      boutId: "b_3",
      day: 6,
      eastRikishiId: "e_3",
      westRikishiId: "w_3",
    };

    const mockMap = new Map<string, Rikishi>();
    mockMap.set(
      "e_3",
      mockRikishi("e_3", {
        shikona: "Rikishi A",
        rank: "maegashira",
        rankNumber: undefined,
      })
    );
    mockMap.set(
      "w_3",
      mockRikishi("w_3", {
        shikona: "Rikishi B",
        rank: "juryo",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing edge case with invalid rankNumber
        rankNumber: 0 as any,
      })
    );

    const world: Partial<WorldState> = {
      rikishi: mockMap as unknown as IdMapRuntime<Rikishi>,
    };

    const result = projectBoutRow(match as MatchSchedule, world as WorldState);

    expect(result.eastRankShort).toBe("M");
    expect(result.westRankShort).toBe("J");
  });
});
