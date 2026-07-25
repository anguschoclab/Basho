import { describe, it, expect } from "vitest";
import { timeSlice } from "@/contexts/timeSlice";
import { initialGameState } from "@/contexts/gameTypes";
import type { GameState, GameAction } from "@/contexts/gameTypes";
import type { WorldState } from "@/engine/types/world";
import type { HolidayResult } from "@/engine/holiday";
import type { AutoSimResult } from "@/engine/autoSim";

function makeWorld(cyclePhase: WorldState["cyclePhase"]): WorldState {
  return {
    year: 2025,
    week: 1,
    dayIndexGlobal: 0,
    cyclePhase,
  } as unknown as WorldState;
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return { ...initialGameState, ...overrides };
}

function holidayAction(reports: WorldState[]): GameAction {
  return {
    type: "RUN_HOLIDAY",
    result: {
      daysAdvanced: reports.length,
      gateTriggered: null,
      phaseOnExit: "interim",
      digest: {} as unknown as HolidayResult["digest"],
      reports,
    } as unknown as HolidayResult,
  };
}

function autoSimAction(finalWorld: WorldState | undefined): GameAction {
  return {
    type: "RUN_AUTO_SIM",
    result: {
      startYear: 2025,
      endYear: 2025,
      bashoSimulated: 0,
      daysSimulated: 0,
      stoppedBy: "completed",
      chronicle: {} as unknown as AutoSimResult["chronicle"],
      finalWorld,
      tuningMetrics: {} as unknown as AutoSimResult["tuningMetrics"],
    } as unknown as AutoSimResult,
  };
}

describe("timeSlice", () => {
  it("returns state unchanged for unknown action type", () => {
    const state = makeState({ phase: "menu" });
    const action = { type: "SET_PHASE", phase: "menu" } as GameAction;
    expect(timeSlice(state, action)).toBe(state);
  });

  it("RUN_HOLIDAY with null world returns state unchanged", () => {
    const state = makeState({ world: null });
    expect(timeSlice(state, holidayAction([makeWorld("interim")]))).toBe(state);
  });

  it("RUN_HOLIDAY with empty reports and world.cyclePhase='interim' returns phase 'interim'", () => {
    const world = makeWorld("interim");
    const state = makeState({ world, phase: "interim" });
    const result = timeSlice(state, holidayAction([]));
    expect(result.phase).toBe("interim");
    expect(result.world).toBe(world);
  });

  it("RUN_HOLIDAY with empty reports and world.cyclePhase='active_basho' returns phase 'day_preview'", () => {
    const world = makeWorld("active_basho");
    const state = makeState({ world, phase: "basho" });
    const result = timeSlice(state, holidayAction([]));
    expect(result.phase).toBe("day_preview");
  });

  it("RUN_HOLIDAY with reports, last report cyclePhase='active_basho' returns phase 'day_preview'", () => {
    const world = makeWorld("interim");
    const state = makeState({ world, phase: "interim" });
    const lastReport = makeWorld("active_basho");
    const result = timeSlice(state, holidayAction([makeWorld("interim"), lastReport]));
    expect(result.phase).toBe("day_preview");
  });

  it("RUN_HOLIDAY with reports, last report cyclePhase='interim' returns phase 'interim'", () => {
    const world = makeWorld("active_basho");
    const state = makeState({ world, phase: "basho" });
    const result = timeSlice(state, holidayAction([makeWorld("interim")]));
    expect(result.phase).toBe("interim");
  });

  it("RUN_HOLIDAY with reports, last report cyclePhase='post_basho' returns phase 'interim'", () => {
    const world = makeWorld("active_basho");
    const state = makeState({ world, phase: "basho" });
    const result = timeSlice(state, holidayAction([makeWorld("post_basho")]));
    expect(result.phase).toBe("interim");
  });

  it("RUN_HOLIDAY deep-copies lastReport (mutating returned world doesn't affect source)", () => {
    const world = makeWorld("interim");
    const state = makeState({ world });
    const lastReport = makeWorld("active_basho");
    lastReport.year = 2025;
    const result = timeSlice(state, holidayAction([lastReport]));
    // Mutate the returned world
    (result.world as WorldState).year = 9999;
    // Source report should be unchanged
    expect(lastReport.year).toBe(2025);
  });

  it("RUN_AUTO_SIM with finalWorld undefined returns state unchanged", () => {
    const state = makeState({ world: makeWorld("interim") });
    expect(timeSlice(state, autoSimAction(undefined))).toBe(state);
  });

  it("RUN_AUTO_SIM with finalWorld sets world (same reference) and phase 'interim'", () => {
    const state = makeState({ world: makeWorld("active_basho"), phase: "basho" });
    const finalWorld = makeWorld("interim");
    const result = timeSlice(state, autoSimAction(finalWorld));
    expect(result.world).toBe(finalWorld);
    expect(result.phase).toBe("interim");
  });

  it("RUN_AUTO_SIM preserves other state fields", () => {
    const state = makeState({
      world: makeWorld("active_basho"),
      phase: "basho",
      currentBoutIndex: 5,
      playerHeyaId: "h1",
      boutTactics: { b1: {} as import("@/engine/types/combat").BoutTactic },
    });
    const finalWorld = makeWorld("interim");
    const result = timeSlice(state, autoSimAction(finalWorld));
    expect(result.currentBoutIndex).toBe(5);
    expect(result.playerHeyaId).toBe("h1");
    expect(result.boutTactics).toEqual(state.boutTactics);
  });

  it("RUN_HOLIDAY preserves other state fields", () => {
    const state = makeState({
      world: makeWorld("interim"),
      phase: "interim",
      currentBoutIndex: 3,
      playerHeyaId: "h2",
      boutTactics: { b2: {} as import("@/engine/types/combat").BoutTactic },
    });
    const result = timeSlice(state, holidayAction([makeWorld("active_basho")]));
    expect(result.currentBoutIndex).toBe(3);
    expect(result.playerHeyaId).toBe("h2");
    expect(result.boutTactics).toEqual(state.boutTactics);
  });
});
