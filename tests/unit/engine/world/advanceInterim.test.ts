import { describe, it, expect, vi } from "vitest";
import { advanceInterim, advanceDay, getRikishiBashoStats } from "@/engine/core/world";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import * as tickDaily from "@/engine/tick/tickDaily";

vi.mock("@/engine/tick/tickDaily", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/engine/tick/tickDaily")>();
  return {
    ...actual,
    advanceDaysFast: vi.fn((world: any) => ({ ...world, _mockAdvanced: true })),
    advanceOneDay: vi.fn((world: any) => ({ ...world, _mockAdvancedDay: true })),
  };
});

describe("advanceInterim", () => {
  it("does not advance if cyclePhase is active_basho", () => {
    const world = MockFactory.createWorld({ cyclePhase: "active_basho" });
    const result = advanceInterim(world, 1);
    expect(result).toBe(world);
    expect(tickDaily.advanceDaysFast).not.toHaveBeenCalled();
  });

  it("advances 7 days by default when cyclePhase is interim", () => {
    const world = MockFactory.createWorld({ cyclePhase: "interim" });
    const result = advanceInterim(world);
    expect(tickDaily.advanceDaysFast).toHaveBeenCalledWith(world, 7);
    expect((result as any)._mockAdvanced).toBe(true);
  });

  it("advances Math.max(1, Math.trunc(weeks)) * 7 days when cyclePhase is pre_basho", () => {
    const world = MockFactory.createWorld({ cyclePhase: "pre_basho" });
    advanceInterim(world, 2.5);
    expect(tickDaily.advanceDaysFast).toHaveBeenCalledWith(world, 14);
  });

  it("advances at least 7 days even if weeks < 1", () => {
    const world = MockFactory.createWorld({ cyclePhase: "post_basho" });
    advanceInterim(world, 0.5);
    expect(tickDaily.advanceDaysFast).toHaveBeenCalledWith(world, 7);
  });
});

describe("advanceDay", () => {
  it("calls advanceOneDay", () => {
    const world = MockFactory.createWorld();
    const result = advanceDay(world);
    expect(tickDaily.advanceOneDay).toHaveBeenCalledWith(world);
    expect((result as any)._mockAdvancedDay).toBe(true);
  });
});

describe("getRikishiBashoStats", () => {
  it("returns zeros if no currentBasho", () => {
    const world = MockFactory.createWorld({ currentBasho: undefined });
    expect(getRikishiBashoStats(world, "r1")).toEqual({ wins: 0, losses: 0, absences: 0 });
  });

  it("returns zeros if standings are missing", () => {
    const world = MockFactory.createWorld({ currentBasho: { id: "test", standings: undefined } as any });
    expect(getRikishiBashoStats(world, "r1")).toEqual({ wins: 0, losses: 0, absences: 0 });
  });

  it("returns zeros if rikishi not in standings", () => {
    const world = MockFactory.createWorld({
      currentBasho: {
        id: "test",
        standings: new Map([["r2", { wins: 1, losses: 1, absences: 0 }]])
      } as any
    });
    expect(getRikishiBashoStats(world, "r1")).toEqual({ wins: 0, losses: 0, absences: 0 });
  });

  it("returns correct stats from standings", () => {
    const world = MockFactory.createWorld({
      currentBasho: {
        id: "test",
        standings: new Map([["r1", { wins: 10, losses: 5, absences: 0 }]])
      } as any
    });
    expect(getRikishiBashoStats(world, "r1")).toEqual({ wins: 10, losses: 5, absences: 0 });
  });

  it("defaults undefined stats to 0", () => {
    const world = MockFactory.createWorld({
      currentBasho: {
        id: "test",
        standings: new Map([["r1", { wins: 10 }]]) // losses and absences missing
      } as any
    });
    expect(getRikishiBashoStats(world, "r1")).toEqual({ wins: 10, losses: 0, absences: 0 });
  });
});
