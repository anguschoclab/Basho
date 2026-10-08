import { describe, it, expect, beforeAll } from "vitest";
import { advanceOneDay, advanceDaysFast } from "@/engine/tick/tickDaily";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";
import type { WorldState } from "@/engine/types/world";

describe("Batch preflight (B1.1)", () => {
  describe("advanceCalendarDays equivalence", () => {
    const N = 30;

    // Shared 30-day worlds computed once (previously each of the 5 tests
    // regenerated + re-advanced its own pair on a full ~440-rikishi world).
    // Semantics preserved: batchWithSkip matches the old test-1 call, and
    // batchNoSkip matches the old tests 2–5 calls (which passed NO options —
    // the seq side always used skipDailyMicroPhases).
    let seqWorld: WorldState;
    let batchWithSkip: WorldState;
    let batchNoSkip: WorldState;

    beforeAll(() => {
      seqWorld = generateInitialWorld("batch-preflight-seed");
      const world2 = generateInitialWorld("batch-preflight-seed");
      const world3 = generateInitialWorld("batch-preflight-seed");

      for (let i = 0; i < N; i++) {
        seqWorld = advanceOneDay(seqWorld, { skipDailyMicroPhases: true });
      }
      batchWithSkip = advanceDaysFast(world2, N, { skipDailyMicroPhases: true });
      batchNoSkip = advanceDaysFast(world3, N);
    });

    it("advanceDaysFast(N) produces same dayIndexGlobal as N × advanceOneDay with skipDailyMicroPhases", () => {
      expect(batchWithSkip.dayIndexGlobal).toBe(seqWorld.dayIndexGlobal);
    });

    it("advanceDaysFast(N) produces same calendar as N × advanceOneDay", () => {
      expect(batchNoSkip.calendar).toEqual(seqWorld.calendar);
    });

    it("advanceDaysFast(N) produces same _daysSinceLastWeeklyTick as N × advanceOneDay", () => {
      expect(batchNoSkip._daysSinceLastWeeklyTick).toBe(seqWorld._daysSinceLastWeeklyTick);
    });

    it("advanceDaysFast(N) produces same cyclePhase as N × advanceOneDay", () => {
      expect(batchNoSkip.cyclePhase).toBe(seqWorld.cyclePhase);
    });

    it("advanceDaysFast(N) produces same week as N × advanceOneDay", () => {
      expect(batchNoSkip.week).toBe(seqWorld.week);
    });

    it("advanceDaysFast(7) triggers exactly one weekly tick", () => {
      const world = generateInitialWorld("batch-preflight-seed-006");
      const batchWorld = advanceDaysFast(world, 7);

      // After 7 days, _daysSinceLastWeeklyTick should reset to 0 or 1
      expect(batchWorld._daysSinceLastWeeklyTick ?? 0).toBeLessThanOrEqual(1);
    });

    it("advanceDaysFast(1) is equivalent to advanceOneDay with skipDailyMicroPhases", () => {
      const world1 = generateInitialWorld("batch-preflight-seed-007");
      const world2 = generateInitialWorld("batch-preflight-seed-007");

      const seqWorld1 = advanceOneDay(world1, { skipDailyMicroPhases: true });
      const batchWorld = advanceDaysFast(world2, 1);

      expect(batchWorld.dayIndexGlobal).toBe(seqWorld1.dayIndexGlobal);
      expect(batchWorld.calendar).toEqual(seqWorld1.calendar);
      expect(batchWorld.cyclePhase).toBe(seqWorld1.cyclePhase);
    });
  });
});
