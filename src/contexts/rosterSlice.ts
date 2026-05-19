import type { GameState, GameAction } from "./gameTypes";
import { assignMentor, removeMentor } from "@/engine/systems/training/MentorshipService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";

/**
 * Roster slice handling roster-related actions including mentor assignment.
 *
 * Processes SELECT_RIKISHI, ASSIGN_MENTOR, and REMOVE_MENTOR actions.
 * Mentorship mutations use StateImpact pattern for transactional updates.
 *
 * @param {GameState} state - Current game state.
 * @param {GameAction} action - Action to process.
 * @returns {GameState} Updated game state.
 */
export function rosterSlice(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "SELECT_RIKISHI":
      return {
        ...state,
        selectedRikishiId: action.id,
        phase: action.id ? "rikishi" : state.phase,
      };
    case "ASSIGN_MENTOR":
      if (!state.world) return state;
      const assignImpact = assignMentor(state.world, action.mentorId, action.apprenticeId);
      return {
        ...state,
        world: resolveImpacts(state.world, [assignImpact]),
      };
    case "REMOVE_MENTOR":
      if (!state.world) return state;
      const removeImpact = removeMentor(state.world, action.apprenticeId);
      return {
        ...state,
        world: resolveImpacts(state.world, [removeImpact]),
      };
    default:
      return state;
  }
}
