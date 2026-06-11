import { describe, it, expect, vi } from "vitest";
import {
  advanceOneDay,
  advanceDays,
  advanceDaysFast,
  enterPostBasho,
  enterInterim,
} from "@/engine/tick/tickDaily";
import { makeMockWorld } from "../utils";
import * as pipelineRunner from "@/engine/tick/pipelineRunner";

describe("tickDaily", () => {
  describe("advanceOneDay", () => {
    it("increments dayIndexGlobal and advances calendar", () => {
      const world = makeMockWorld({
        dayIndexGlobal: 10,
        calendar: { year: 2025, month: 1, currentWeek: 1, currentDay: 1 },
      });

      const nextWorld = advanceOneDay(world);

      expect(nextWorld.dayIndexGlobal).toBe(11);
      expect(nextWorld.calendar!.currentDay).toBe(2);
      expect(nextWorld.calendar!.month).toBe(1);
      expect(nextWorld.calendar!.year).toBe(2025);
    });

    it("resets _daysSinceLastWeeklyTick on weekly tick (7 days)", () => {
      const world = makeMockWorld({
        _daysSinceLastWeeklyTick: 6,
        calendar: { year: 2025, month: 1, currentWeek: 1, currentDay: 7 },
      });

      const nextWorld = advanceOneDay(world);

      expect(nextWorld._daysSinceLastWeeklyTick).toBe(0);
    });

    it("increments _daysSinceLastWeeklyTick when not a weekly tick", () => {
      const world = makeMockWorld({
        _daysSinceLastWeeklyTick: 3,
        calendar: { year: 2025, month: 1, currentWeek: 1, currentDay: 4 },
      });

      const nextWorld = advanceOneDay(world);

      expect(nextWorld._daysSinceLastWeeklyTick).toBe(4);
    });

    it("runs month boundary logic when calendar crosses month", () => {
      const world = makeMockWorld({
        calendar: { year: 2025, month: 1, currentWeek: 4, currentDay: 31 },
      });

      const runPipelineSpy = vi.spyOn(pipelineRunner, "runPipeline");

      const nextWorld = advanceOneDay(world);

      expect(nextWorld.calendar!.currentDay).toBe(1);
      expect(nextWorld.calendar!.month).toBe(2);
      expect(nextWorld.transientContext?.boundaries?.monthBoundary).toBe(true);

      // Should have run month boundary pipeline
      expect(runPipelineSpy).toHaveBeenCalled();

      runPipelineSpy.mockRestore();
    });

    it("runs year boundary logic when calendar crosses year", () => {
      const world = makeMockWorld({
        calendar: { year: 2025, month: 12, currentWeek: 52, currentDay: 31 },
        _daysSinceLastWeeklyTick: 6, // make it a weekly tick
      });

      const runPipelineSpy = vi.spyOn(pipelineRunner, "runPipeline");

      const nextWorld = advanceOneDay(world);

      expect(nextWorld.calendar!.currentDay).toBe(1);
      expect(nextWorld.calendar!.month).toBe(1);
      expect(nextWorld.calendar!.year).toBe(2026);

      // Year boundary logic depends on if phase6 runs. For this test, verifying calendar is enough.

      expect(runPipelineSpy).toHaveBeenCalled();

      runPipelineSpy.mockRestore();
    });

    it("populates daily tick report correctly", () => {
      const world = makeMockWorld({
        dayIndexGlobal: 5,
        cyclePhase: "post_basho",
        _postBashoDays: 5, // keep it in post_basho
        _daysSinceLastWeeklyTick: 2,
      });

      const nextWorld = advanceOneDay(world);

      expect(nextWorld.transientContext?.lastReport).toBeDefined();
      expect(nextWorld.transientContext?.lastReport?.dayIndexGlobal).toBe(6);
      expect(nextWorld.transientContext?.lastReport?.phase).toBe("post_basho");
      expect(nextWorld.transientContext?.lastReport?.subsystemsRun).toContain("daily_micro");
    });
  });

  describe("advanceDays", () => {
    it("advances the world state by the specified number of days", () => {
      const world = makeMockWorld({ dayIndexGlobal: 0 });
      const nextWorld = advanceDays(world, 5);
      expect(nextWorld.dayIndexGlobal).toBe(5);
    });

    it("clamps days to at least 1", () => {
      const world = makeMockWorld({ dayIndexGlobal: 0 });
      const nextWorld = advanceDays(world, 0);
      expect(nextWorld.dayIndexGlobal).toBe(1);
    });

    it("clamps days to at most 365", () => {
      const world = makeMockWorld({ dayIndexGlobal: 0 });
      const nextWorld = advanceDays(world, 400);
      expect(nextWorld.dayIndexGlobal).toBe(365);
    });
  });

  describe("advanceDaysFast", () => {
    it("advances the world state by the specified number of days", () => {
      const world = makeMockWorld({ dayIndexGlobal: 0 });
      const nextWorld = advanceDaysFast(world, 5);
      expect(nextWorld.dayIndexGlobal).toBe(5);
    });

    it("clamps days to at least 1", () => {
      const world = makeMockWorld({ dayIndexGlobal: 0 });
      const nextWorld = advanceDaysFast(world, 0);
      expect(nextWorld.dayIndexGlobal).toBe(1);
    });

    it("clamps days to at most 365", () => {
      const world = makeMockWorld({ dayIndexGlobal: 0 });
      const nextWorld = advanceDaysFast(world, 400);
      expect(nextWorld.dayIndexGlobal).toBe(365);
    });

    it("is deterministic: produces same end-state as individual advanceOneDay calls", () => {
      const world = makeMockWorld({
        cyclePhase: "interim",
        dayIndexGlobal: 0,
        calendar: { year: 2025, month: 1, currentWeek: 1, currentDay: 1 },
      });

      // Slow path: 7 individual advanceOneDay calls
      let slowWorld = world;
      for (let i = 0; i < 7; i++) {
        slowWorld = advanceOneDay(slowWorld);
      }

      // Fast path: advanceDaysFast(7)
      const fastWorld = advanceDaysFast(world, 7);

      // Compare deterministic fields (ignore ephemeral transientContext)
      expect(fastWorld.dayIndexGlobal).toBe(slowWorld.dayIndexGlobal);
      expect(fastWorld.calendar!).toEqual(slowWorld.calendar!);
      expect(fastWorld.week).toBe(slowWorld.week);
      expect(fastWorld.cyclePhase).toBe(slowWorld.cyclePhase);
    });
  });

  describe("phase initializers", () => {
    it("enterPostBasho sets correct phase and days", () => {
      const world = makeMockWorld({ cyclePhase: "active_basho" });
      const nextWorld = enterPostBasho(world);

      expect(nextWorld.cyclePhase).toBe("post_basho");
      expect(nextWorld._postBashoDays).toBe(7);
    });

    it("enterInterim sets correct phase and days", () => {
      const world = makeMockWorld({ cyclePhase: "post_basho" });
      const nextWorld = enterInterim(world);

      expect(nextWorld.cyclePhase).toBe("interim");
      expect(nextWorld._interimDaysRemaining).toBe(42);
    });
  });
});
