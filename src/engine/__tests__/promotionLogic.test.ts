import { describe, it, expect } from "vitest";
import { computeMovementUnits, bestTierAllowed } from "../banzuke/promotionLogic";
import type { BanzukeEntry, BashoPerformance, Rank } from "../types/banzuke";

describe("promotionLogic.test.ts", () => {
  const createEntry = (id: string, rank: Rank, rankNumber?: number): BanzukeEntry => ({
    rikishiId: id,
    position: { rank, side: "east", rankNumber },
  });

  describe("computeMovementUnits", () => {
    it("returns 0 if no performance", () => {
      const entry = createEntry("r1", "maegashira", 5);
      expect(computeMovementUnits(entry, undefined, new Set())).toBe(0);
    });

    it("calculates movement for maegashira (normal kachi-koshi)", () => {
      const entry = createEntry("r1", "maegashira", 5);
      const perf: BashoPerformance = {
        rikishiId: "r1",
        wins: 9,
        losses: 6,
        absences: 0,
        boutIds: [],
      };
      // req = 8. wins = 9. move = 1
      expect(computeMovementUnits(entry, perf, new Set())).toBe(1);
    });

    it("applies absence penalty correctly", () => {
      const entry = createEntry("r1", "maegashira", 5);
      const perf1: BashoPerformance = {
        rikishiId: "r1",
        wins: 8,
        losses: 6,
        absences: 1,
        boutIds: [],
      }; // 1 absence = light kyujo (1.25) -> round to 1
      // base move: 8 - 8 = 0. penalty = 1. move = -1
      expect(computeMovementUnits(entry, perf1, new Set())).toBe(-1);

      const perf2: BashoPerformance = {
        rikishiId: "r1",
        wins: 0,
        losses: 0,
        absences: 15,
        boutIds: [],
      }; // 15 absences (>= 7) = heavy kyujo (1.75) -> round to 26
      // base move: 0 - 8 = -8. penalty = 26. move = -34 -> min clamped to -10
      expect(computeMovementUnits(entry, perf2, new Set())).toBe(-10);
    });

    it("adds performance bonuses (yusho, kinboshi)", () => {
      const entry = createEntry("r1", "maegashira", 1);
      const perf: BashoPerformance = {
        rikishiId: "r1",
        wins: 14,
        losses: 1,
        absences: 0,
        boutIds: [],
        yusho: true,
        kinboshi: 2,
      };
      // req = 8, wins = 14. delta = +6.
      // bonus = yusho(5) + kinboshi(2) = 7.
      // move = 13. clamped to 10
      expect(computeMovementUnits(entry, perf, new Set())).toBe(10);
    });

    it("handles yokozuna clamping", () => {
      const entry = createEntry("r1", "yokozuna");
      const perf: BashoPerformance = {
        rikishiId: "r1",
        wins: 15,
        losses: 0,
        absences: 0,
        boutIds: [],
      };
      expect(computeMovementUnits(entry, perf, new Set())).toBe(2);
    });

    it("handles ozeki damping and demotion penalty", () => {
      const entry = createEntry("r1", "ozeki");
      const perf: BashoPerformance = {
        rikishiId: "r1",
        wins: 12,
        losses: 3,
        absences: 0,
        boutIds: [],
      };
      // delta = 12 - 8 = 4. move = 4. damped = Math.round(4 * 0.65) = 3
      expect(computeMovementUnits(entry, perf, new Set())).toBe(3);

      const perf2: BashoPerformance = {
        rikishiId: "r1",
        wins: 5,
        losses: 10,
        absences: 0,
        boutIds: [],
      };
      // delta = -3. damped = Math.round(-3 * 0.65) = -2.
      // with demotedOzeki.has('r1')
      const demoted = new Set(["r1"]);
      expect(computeMovementUnits(entry, perf2, demoted)).toBe(-6);
    });

    it("handles sanyaku (sekiwake) scaling", () => {
      const entry = createEntry("r1", "sekiwake");
      const perf: BashoPerformance = {
        rikishiId: "r1",
        wins: 12,
        losses: 3,
        absences: 0,
        boutIds: [],
      };
      // delta = 12 - 8 = 4. move = 4 * 0.8 = 3.2 -> 3
      expect(computeMovementUnits(entry, perf, new Set())).toBe(3);
    });

    it("incorporates opponentAvgTier into bonus", () => {
      const entry = createEntry("r1", "maegashira", 15);
      const perf: BashoPerformance = {
        rikishiId: "r1",
        wins: 8,
        losses: 7,
        absences: 0,
        boutIds: [],
        opponentAvgTier: 2,
      };
      expect(computeMovementUnits(entry, perf, new Set())).toBe(1); // delta 0 + bonus 1

      const perf2: BashoPerformance = {
        rikishiId: "r1",
        wins: 8,
        losses: 7,
        absences: 0,
        boutIds: [],
        opponentAvgTier: 6,
      };
      expect(computeMovementUnits(entry, perf2, new Set())).toBe(0);
    });

    it("handles junYusho and specialPrizes", () => {
      const entry = createEntry("r1", "maegashira", 15);
      const perf: BashoPerformance = {
        rikishiId: "r1",
        wins: 8,
        losses: 7,
        absences: 0,
        boutIds: [],
        junYusho: true,
        specialPrizes: 2,
      };
      expect(computeMovementUnits(entry, perf, new Set())).toBe(4);
    });
  });

  describe("bestTierAllowed", () => {
    it("yokozuna always allowed tier 1", () => {
      expect(bestTierAllowed(createEntry("y1", "yokozuna"), undefined, undefined, new Set())).toBe(
        1
      );
    });

    it("ozeki demoted allowed up to tier 3 (sekiwake)", () => {
      const demoted = new Set(["o1"]);
      expect(bestTierAllowed(createEntry("o1", "ozeki"), undefined, undefined, demoted)).toBe(3);
    });

    it("ozeki promote to yokozuna", () => {
      const perf: BashoPerformance = {
        rikishiId: "o2",
        wins: 15,
        losses: 0,
        boutIds: [],
        promoteToYokozuna: true,
      };
      expect(bestTierAllowed(createEntry("o2", "ozeki"), perf, undefined, new Set())).toBe(1);
    });

    it("sekiwake with 11+ wins allowed tier 2 (ozeki)", () => {
      const perf: BashoPerformance = { rikishiId: "s1", wins: 11, losses: 4, boutIds: [] };
      expect(bestTierAllowed(createEntry("s1", "sekiwake"), perf, undefined, new Set())).toBe(2);
      const perf2: BashoPerformance = { rikishiId: "s2", wins: 10, losses: 5, boutIds: [] };
      expect(bestTierAllowed(createEntry("s2", "sekiwake"), perf2, undefined, new Set())).toBe(3); // stays tier 3
    });

    it("allows promotion to tier 3 (sekiwake) for a komusubi with 10+ wins", () => {
      const perf: BashoPerformance = { rikishiId: "k1", wins: 10, losses: 5, boutIds: [] };
      expect(bestTierAllowed(createEntry("k1", "komusubi"), perf, undefined, new Set())).toBe(3);
    });

    it("maegashira yusho allowed tier 3 (sekiwake)", () => {
      const perf: BashoPerformance = {
        rikishiId: "m1",
        wins: 14,
        losses: 1,
        boutIds: [],
        yusho: true,
      };
      expect(bestTierAllowed(createEntry("m1", "maegashira", 10), perf, undefined, new Set())).toBe(
        3
      );
    });

    it("high maegashira with 10+ wins allowed tier 4 (komusubi)", () => {
      const perf: BashoPerformance = { rikishiId: "m2", wins: 10, losses: 5, boutIds: [] };
      expect(bestTierAllowed(createEntry("m2", "maegashira", 4), perf, undefined, new Set())).toBe(
        4
      );
      expect(bestTierAllowed(createEntry("m3", "maegashira", 5), perf, undefined, new Set())).toBe(
        5
      ); // tier 5
    });

    it("returns default tier if no special conditions met", () => {
      expect(
        bestTierAllowed(createEntry("m1", "maegashira", 10), undefined, undefined, new Set())
      ).toBe(5);
      expect(
        bestTierAllowed(
          createEntry("m1", "maegashira", 10),
          { rikishiId: "m1", wins: 8, losses: 7, boutIds: [] },
          undefined,
          new Set()
        )
      ).toBe(5);
    });
  });
});
