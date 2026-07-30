import { describe, it, expect } from "vitest";
import { getOzekiStatus } from "@/engine/banzuke/ozekiLogic";

describe("ozekiLogic", () => {
  describe("getOzekiStatus", () => {
    it("returns to normal state when winning", () => {
      const state = getOzekiStatus(8, 7, 0, { isKadoban: true, consecutiveMakeKoshi: 1 });
      expect(state).toEqual({ isKadoban: false, consecutiveMakeKoshi: 0 });
    });

    it("becomes kadoban after first make-koshi", () => {
      const state = getOzekiStatus(7, 8, 0, undefined);
      expect(state).toEqual({ isKadoban: true, consecutiveMakeKoshi: 1 });
    });

    it("increases consecutive make-koshi and clears kadoban flag after second make-koshi (will be demoted elsewhere)", () => {
      const state = getOzekiStatus(7, 8, 0, { isKadoban: true, consecutiveMakeKoshi: 1 });
      expect(state).toEqual({ isKadoban: false, consecutiveMakeKoshi: 2 });
    });

    it("treats absences as losses for make koshi checks", () => {
      // 7 wins, 0 losses, 8 absences -> Make Koshi
      const state = getOzekiStatus(7, 0, 8, undefined);
      expect(state).toEqual({ isKadoban: true, consecutiveMakeKoshi: 1 });
    });
  });
});
