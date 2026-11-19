/**
 * W F — new record boards: careerBouts, makuuchiBouts,
 * consecutiveAppearances, kinboshiConceded.
 *
 * - createDefaultRecords() is the single source for empty WorldRecords
 *   (replaces the five hand-rolled literals across records.ts /
 *   WorldFactory / HistoryService / SerializationService).
 * - onBashoEnded populates all four boards on both allTime and active.
 * - onRikishiRetired strips the retiree from every active board but
 *   leaves allTime intact.
 */
import { describe, it, expect } from "vitest";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { createDefaultRecords } from "@/engine/types/records";
import { onBashoEnded, onRikishiRetired } from "@/engine/history/records";

describe("createDefaultRecords", () => {
  it("returns every board on both scopes, empty", () => {
    const r = createDefaultRecords();
    for (const scope of [r.allTime, r.active] as const) {
      expect(scope.careerWins).toEqual([]);
      expect(scope.makuuchiWins).toEqual([]);
      expect(scope.yusho).toEqual([]);
      expect(scope.consecutiveYusho).toEqual([]);
      expect(scope.kinboshi).toEqual([]);
      expect(scope.careerBouts).toEqual([]);
      expect(scope.makuuchiBouts).toEqual([]);
      expect(scope.consecutiveAppearances).toEqual([]);
      expect(scope.kinboshiConceded).toEqual([]);
      expect(scope.oldestMakuuchiKachiKoshi).toEqual([]);
    }
  });
});

describe("onBashoEnded — new leaderboards", () => {
  it("populates careerBouts as wins+losses+absences across the career", () => {
    const ironman = MockFactory.createRikishi("r_iron", {
      heyaId: "h1",
      division: "makuuchi",
      careerWins: 300,
      careerLosses: 200,
      careerAbsences: 14,
      consecutiveBashoFought: 40,
      stats: {
        ...MockFactory.createRikishi("tmp").stats,
        achievements: {
          kinboshiEarned: 0,
          ginboshiEarned: 0,
          kinboshiConceded: 0,
          ginboshiConceded: 0,
          specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
          mochikyukinPoints: 0,
        },
      },
    });
    const world = MockFactory.createWorld({
      year: 2030,
      rikishi: new Map([["r_iron", ironman]]),
    });

    const next = resolveImpacts(world, [onBashoEnded(world)]);

    const board = next.records.allTime.careerBouts;
    expect(board[0]?.rikishiId).toBe("r_iron");
    expect(board[0]?.value).toBe(300 + 200 + 14);
    expect(next.records.active.careerBouts[0]?.rikishiId).toBe("r_iron");
  });

  it("populates consecutiveAppearances from consecutiveBashoFought", () => {
    const vet = MockFactory.createRikishi("r_vet", {
      heyaId: "h1",
      consecutiveBashoFought: 55,
    });
    const world = MockFactory.createWorld({
      year: 2030,
      rikishi: new Map([["r_vet", vet]]),
    });

    const next = resolveImpacts(world, [onBashoEnded(world)]);
    expect(next.records.allTime.consecutiveAppearances[0]?.value).toBe(55);
  });

  it("populates makuuchiBouts from the makuuchi division record only", () => {
    const r = MockFactory.createRikishi("r_m", {
      heyaId: "h1",
      division: "makuuchi",
      divisionRecords: {
        makuuchi: { wins: 120, losses: 80 },
        juryo: { wins: 40, losses: 20 },
        makushita: { wins: 10, losses: 5 },
        sandanme: { wins: 0, losses: 0 },
        jonidan: { wins: 0, losses: 0 },
        jonokuchi: { wins: 0, losses: 0 },
      },
    });
    const world = MockFactory.createWorld({ year: 2030, rikishi: new Map([["r_m", r]]) });

    const next = resolveImpacts(world, [onBashoEnded(world)]);
    expect(next.records.allTime.makuuchiBouts[0]?.value).toBe(200);
  });

  it("populates kinboshiConceded from the yokozuna achievements ledger", () => {
    const yoko = MockFactory.createRikishi("r_y", {
      heyaId: "h1",
      rank: "yokozuna",
      division: "makuuchi",
      stats: {
        ...MockFactory.createRikishi("tmp").stats,
        achievements: {
          kinboshiEarned: 0,
          ginboshiEarned: 0,
          kinboshiConceded: 9,
          ginboshiConceded: 0,
          specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
          mochikyukinPoints: 0,
        },
      },
    });
    const world = MockFactory.createWorld({ year: 2030, rikishi: new Map([["r_y", yoko]]) });

    const next = resolveImpacts(world, [onBashoEnded(world)]);
    expect(next.records.allTime.kinboshiConceded[0]?.value).toBe(9);
  });

  it("populates oldestMakuuchiKachiKoshi with age for makuuchi KK winners only", () => {
    const vetMakuuchi = MockFactory.createRikishi("r_old_mk", {
      heyaId: "h1",
      division: "makuuchi",
      age: 42,
      currentBashoWins: 8,
      currentBashoLosses: 7,
    });
    const vetJuryo = MockFactory.createRikishi("r_old_ju", {
      heyaId: "h1",
      division: "juryo",
      age: 44,
      currentBashoWins: 9,
      currentBashoLosses: 6,
    });
    const vetMakeKoshi = MockFactory.createRikishi("r_old_lose", {
      heyaId: "h1",
      division: "makuuchi",
      age: 45,
      currentBashoWins: 7,
      currentBashoLosses: 8,
    });
    const world = MockFactory.createWorld({
      year: 2030,
      rikishi: new Map([
        ["r_old_mk", vetMakuuchi],
        ["r_old_ju", vetJuryo],
        ["r_old_lose", vetMakeKoshi],
      ]),
    });

    const next = resolveImpacts(world, [onBashoEnded(world)]);
    const board = next.records.allTime.oldestMakuuchiKachiKoshi;
    expect(board.map((e) => e.rikishiId)).toEqual(["r_old_mk"]);
    expect(board[0]?.value).toBe(42);
  });
});

describe("onRikishiRetired — active-board cleanup", () => {
  it("removes the retiree from every new active board, keeps allTime", () => {
    const r = MockFactory.createRikishi("r_ret", {
      heyaId: "h1",
      division: "makuuchi",
      age: 40,
      currentBashoWins: 8,
      currentBashoLosses: 7,
      careerWins: 500,
      careerLosses: 300,
      careerAbsences: 0,
      consecutiveBashoFought: 60,
      divisionRecords: {
        makuuchi: { wins: 400, losses: 250 },
        juryo: { wins: 0, losses: 0 },
        makushita: { wins: 0, losses: 0 },
        sandanme: { wins: 0, losses: 0 },
        jonidan: { wins: 0, losses: 0 },
        jonokuchi: { wins: 0, losses: 0 },
      },
      stats: {
        ...MockFactory.createRikishi("tmp").stats,
        achievements: {
          kinboshiEarned: 0,
          ginboshiEarned: 0,
          kinboshiConceded: 7,
          ginboshiConceded: 0,
          specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
          mochikyukinPoints: 0,
        },
      },
    });
    const world = MockFactory.createWorld({ year: 2030, rikishi: new Map([["r_ret", r]]) });

    const afterBasho = resolveImpacts(world, [onBashoEnded(world)]);
    const afterRetire = resolveImpacts(afterBasho, [onRikishiRetired(afterBasho, "r_ret")]);

    for (const board of [
      "careerBouts",
      "makuuchiBouts",
      "consecutiveAppearances",
      "kinboshiConceded",
      "oldestMakuuchiKachiKoshi",
    ] as const) {
      expect(afterRetire.records.active[board].some((e) => e.rikishiId === "r_ret")).toBe(false);
      expect(afterRetire.records.allTime[board].some((e) => e.rikishiId === "r_ret")).toBe(true);
    }
  });
});
