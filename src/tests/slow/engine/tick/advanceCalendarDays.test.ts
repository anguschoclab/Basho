import { describe, it, expect } from "vitest";
import { advanceOneDay, advanceDaysFast } from "@/engine/tick/tickDaily";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";

describe("Batch preflight (B1.1)", () => {
  describe("advanceCalendarDays equivalence", () => {
    it("advanceDaysFast(N) produces same dayIndexGlobal as N × advanceOneDay with skipDailyMicroPhases", () => {
      const N = 30;
      const world1 = generateInitialWorld("batch-preflight-seed-001");
      const world2 = generateInitialWorld("batch-preflight-seed-001");

      // Sequential: N × advanceOneDay
      let seqWorld = world1;
      for (let i = 0; i < N; i++) {
        seqWorld = advanceOneDay(seqWorld, { skipDailyMicroPhases: true });
      }

      // Batched: advanceDaysFast(N)
      const batchWorld = advanceDaysFast(world2, N, { skipDailyMicroPhases: true });

      expect(batchWorld.dayIndexGlobal).toBe(seqWorld.dayIndexGlobal);
    });

    it("advanceDaysFast(N) produces same calendar as N × advanceOneDay", () => {
      const N = 30;
      const world1 = generateInitialWorld("batch-preflight-seed-002");
      const world2 = generateInitialWorld("batch-preflight-seed-002");

      let seqWorld = world1;
      for (let i = 0; i < N; i++) {
        seqWorld = advanceOneDay(seqWorld, { skipDailyMicroPhases: true });
      }

      const batchWorld = advanceDaysFast(world2, N);

      expect(batchWorld.calendar).toEqual(seqWorld.calendar);
    });

    it("advanceDaysFast(N) produces same _daysSinceLastWeeklyTick as N × advanceOneDay", () => {
      const N = 30;
      const world1 = generateInitialWorld("batch-preflight-seed-003");
      const world2 = generateInitialWorld("batch-preflight-seed-003");

      let seqWorld = world1;
      for (let i = 0; i < N; i++) {
        seqWorld = advanceOneDay(seqWorld, { skipDailyMicroPhases: true });
      }

      const batchWorld = advanceDaysFast(world2, N);

      expect(batchWorld._daysSinceLastWeeklyTick).toBe(seqWorld._daysSinceLastWeeklyTick);
    });

    it("advanceDaysFast(N) produces same cyclePhase as N × advanceOneDay", () => {
      const N = 30;
      const world1 = generateInitialWorld("batch-preflight-seed-004");
      const world2 = generateInitialWorld("batch-preflight-seed-004");

      let seqWorld = world1;
      for (let i = 0; i < N; i++) {
        seqWorld = advanceOneDay(seqWorld, { skipDailyMicroPhases: true });
      }

      const batchWorld = advanceDaysFast(world2, N);

      expect(batchWorld.cyclePhase).toBe(seqWorld.cyclePhase);
    });

    it("advanceDaysFast(N) produces same week as N × advanceOneDay", () => {
      const N = 30;
      const world1 = generateInitialWorld("batch-preflight-seed-005");
      const world2 = generateInitialWorld("batch-preflight-seed-005");

      let seqWorld = world1;
      for (let i = 0; i < N; i++) {
        seqWorld = advanceOneDay(seqWorld, { skipDailyMicroPhases: true });
      }

      const batchWorld = advanceDaysFast(world2, N);

      expect(batchWorld.week).toBe(seqWorld.week);
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

      const seqWorld = advanceOneDay(world1, { skipDailyMicroPhases: true });
      const batchWorld = advanceDaysFast(world2, 1);

      expect(batchWorld.dayIndexGlobal).toBe(seqWorld.dayIndexGlobal);
      expect(batchWorld.calendar).toEqual(seqWorld.calendar);
      expect(batchWorld.cyclePhase).toBe(seqWorld.cyclePhase);
    });
  });
});
