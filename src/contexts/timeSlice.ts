import type { GameState, GameAction } from "./gameTypes";

export function timeSlice(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "RUN_HOLIDAY": {
      if (!state.world) return state;
      const reports = action.result.reports;
      const lastReport = reports.length > 0 ? reports[reports.length - 1] : undefined;
      const hPhase = lastReport
        ? lastReport.cyclePhase === "active_basho"
          ? "day_preview"
          : "interim"
        : state.world.cyclePhase === "active_basho"
          ? "day_preview"
          : "interim";
      return {
        ...state,
        world: lastReport ? structuredClone(lastReport) : state.world,
        phase: hPhase as GameState["phase"],
      };
    }

    case "RUN_AUTO_SIM": {
      if (!action.result.finalWorld) return state;
      // finalWorld is already a fresh object from the simulation — no clone needed.
      return { ...state, world: action.result.finalWorld, phase: "interim" };
    }

    default:
      return state;
  }
}
