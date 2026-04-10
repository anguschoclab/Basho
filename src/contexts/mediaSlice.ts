import type { GameState, GameAction } from "./gameTypes";
import { cloneWorldForTick } from "@/engine/tick/tickOrchestrator";
import * as worldEngine from "@/engine/world";
import type { GovernanceRuling } from "@/engine/types/economy";
import { rngForWorld } from "@/engine/rng";

/**
 * Handle media and scandal related actions.
 */
export function mediaSlice(state: GameState, action: GameAction): GameState {
  if (!state.world) return state;

  switch (action.type) {
    case "HANDLE_MEDIA_EVENT": {
      const { eventId, choice } = action as any;
      const clonedWorld = cloneWorldForTick(state.world);
      
      // Handle media event choice - this would update media state based on player choice
      // For now, we'll log the choice and potentially update media heat/pressure
      if (clonedWorld.mediaState) {
        // Find the event in the governance log or media state
        const eventIndex = clonedWorld.governanceLog?.findIndex(r => r.id === eventId);
        if (eventIndex !== undefined && eventIndex >= 0 && clonedWorld.governanceLog) {
          // Update the ruling with the player's choice
          const ruling = clonedWorld.governanceLog[eventIndex] as GovernanceRuling;
          ruling.playerChoice = choice;
          ruling.playerResponse = `Player chose: ${choice}`;
        }
        
        // Apply choice effects to media state
        // Different choices could affect heat/pressure differently
        if (choice === "apologize") {
          // Apologizing reduces heat but may hurt reputation
          for (const [id, heat] of Object.entries(clonedWorld.mediaState.mediaHeat)) {
            clonedWorld.mediaState.mediaHeat[id] = Math.max(0, (heat as number) - 5);
          }
        } else if (choice === "deny") {
          // Denying may increase pressure
          for (const [id, pressure] of Object.entries(clonedWorld.mediaState.heyaPressure)) {
            clonedWorld.mediaState.heyaPressure[id] = Math.min(100, (pressure as number) + 5);
          }
        } else if (choice === "ignore") {
          // Ignoring has no immediate effect but may cause decay
          // Natural decay will happen in weekly boundary
        }
      }
      
      return { ...state, world: clonedWorld };
    }

    case "ISSUE_RULING": {
      const { rulingId, severity } = action as any;
      const clonedWorld = cloneWorldForTick(state.world);
      
      // Find the ruling in governance log
      const rulingIndex = clonedWorld.governanceLog?.findIndex(r => r.id === rulingId);
      if (rulingIndex !== undefined && rulingIndex >= 0 && clonedWorld.governanceLog) {
        const ruling = clonedWorld.governanceLog[rulingIndex] as GovernanceRuling;
        const heya = clonedWorld.heyas.get(ruling.heyaId);
        
        if (heya) {
          // Apply severity-based adjustments
          const severityMultiplier = severity === "lenient" ? 0.5 : severity === "harsh" ? 1.5 : 1.0;
          const originalDelta = ruling.effects.scandalScoreDelta || 0;
          const adjustedDelta = Math.round(originalDelta * severityMultiplier);
          
          // Adjust the scandal score
          heya.scandalScore = Math.max(0, (heya.scandalScore || 0) - (originalDelta - adjustedDelta));
          
          // Update the ruling with player's decision
          ruling.playerSeverity = severity;
          ruling.playerResponse = `Player issued ${severity} ruling`;
          ruling.effects.scandalScoreDelta = adjustedDelta;
          
          // Adjust political capital based on severity
          // Lenient rulings cost political capital, harsh rulings may gain it
          if (severity === "lenient") {
            heya.politicalCapital = Math.max(0, (heya.politicalCapital || 50) - 10);
          } else if (severity === "harsh") {
            heya.politicalCapital = Math.min(100, (heya.politicalCapital || 50) + 5);
          }
        }
      }
      
      return { ...state, world: clonedWorld };
    }

    default:
      return state;
  }
}
