import { describe, it, expect, vi } from "vitest";
import { phase_pre_basho_schedule } from "@/engine/tick/phases/phase_pre_basho_schedule";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import * as schedule from "@/engine/schedule";
import type { BashoState } from "@/engine/types/basho";

vi.mock("@/engine/schedule", () => ({
  scheduleDivisionDay: vi.fn(() => ({ scheduled: [{ matchId: "m1" }] })),
}));

describe("phase_pre_basho_schedule", () => {
  it("does nothing if cyclePhase is not pre_basho", () => {
    const world = MockFactory.createWorld({
      cyclePhase: "active_basho",
      _interimDaysRemaining: 2,
    });
    const impact = phase_pre_basho_schedule(world);
    expect(impact.metadata?.preGeneratedSchedules).toBeUndefined();
  });

  it("does nothing if schedules already generated", () => {
    const world = MockFactory.createWorld({
      cyclePhase: "pre_basho",
      _interimDaysRemaining: 2,
      _preGeneratedSchedules: { day1: [], day2: [], announcedAtWeek: 0 },
    });
    const impact = phase_pre_basho_schedule(world);
    expect(impact.metadata?.preGeneratedSchedules).toBeUndefined();
  });

  it("does nothing if days until basho > 2", () => {
    const world = MockFactory.createWorld({
      cyclePhase: "pre_basho",
      _interimDaysRemaining: 3,
    });
    const impact = phase_pre_basho_schedule(world);
    expect(impact.metadata?.preGeneratedSchedules).toBeUndefined();
  });

  it("generates schedule if exactly 2 days before and stores it in impact metadata", () => {
    const world = MockFactory.createWorld({
      cyclePhase: "pre_basho",
      _interimDaysRemaining: 2,
      currentBasho: { id: "b1", days: [] } as unknown as BashoState,
      calendar: { currentWeek: 12 },
    });
    const impact = phase_pre_basho_schedule(world);

    expect(schedule.scheduleDivisionDay).toHaveBeenCalled();
    expect(impact.metadata?.preGeneratedSchedules).toBeDefined();

    const meta = impact.metadata?.preGeneratedSchedules as
      { day1: string[]; day2: string[]; announcedAtWeek: number } | undefined;
    expect(meta!.day1.length).toBeGreaterThan(0);
    expect(meta!.day2.length).toBeGreaterThan(0);
    expect(meta!.announcedAtWeek).toBe(12);
  });
});
