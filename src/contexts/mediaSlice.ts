import type { GameState, GameAction } from "./gameTypes";
import { cloneWorldForTick } from "@/engine/tick/tickOrchestrator";
import * as worldEngine from "@/engine/world";

/**
 * Handle media and scandal related actions.
 */
export function mediaSlice(state: GameState, action: GameAction): GameState {
  if (!state.world) return state;

  switch (action.type) {
    case "HANDLE_MEDIA_EVENT": {
      const { eventId, choice } = action as any;
      const clonedWorld = cloneWorldForTick(state.world);
      worldEngine.handleMediaEvent(clonedWorld, eventId, choice);
      return { ...state, world: clonedWorld };
    }

    case "ISSUE_RULING": {
      const { rulingId, severity } = action as any;
      const clonedWorld = cloneWorldForTick(state.world);
      worldEngine.issueGovernanceRuling(clonedWorld, rulingId, severity);
      return { ...state, world: clonedWorld };
    }

    default:
      return state;
  }
}
