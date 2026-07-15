import type { GameState, GameAction } from "./gameTypes";
import { assignMentor } from "@/engine/lineage";
import { removeMentor } from "@/engine/systems/training/MentorshipService";
import { assignSparringPair, removeSparringPair } from "@/engine/systems/training/SparringService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";

/**
 * Roster slice handling roster-related actions including mentor assignment.
 *
 * Processes ASSIGN_MENTOR, REMOVE_MENTOR, ASSIGN_SPARRING, and REMOVE_SPARRING actions.
 * Mentorship mutations use StateImpact pattern for transactional updates.
 *
 * @param {GameState} state - Current game state.
 * @param {GameAction} action - Action to process.
 * @returns {GameState} Updated game state.
 */
export function rosterSlice(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "ASSIGN_MENTOR": {
      if (!state.world) return state;
      const { ok, impact } = assignMentor(state.world, action.apprenticeId, action.mentorId);
      if (!ok || !impact) return state;
      return {
        ...state,
        world: resolveImpacts(state.world, [impact]),
      };
    }
    case "REMOVE_MENTOR": {
      if (!state.world) return state;
      const removeImpact = removeMentor(state.world, action.apprenticeId);
      return {
        ...state,
        world: resolveImpacts(state.world, [removeImpact]),
      };
    }
    case "ADD_SPARRING_PAIR": {
      if (!state.world) return state;
      const addPairImpact = assignSparringPair(
        state.world,
        action.heyaId,
        action.aId,
        action.bId,
        state.world.week
      );
      return { ...state, world: resolveImpacts(state.world, [addPairImpact]) };
    }
    case "REMOVE_SPARRING_PAIR": {
      if (!state.world) return state;
      const removePairImpact = removeSparringPair(
        state.world,
        action.heyaId,
        action.aId,
        action.bId
      );
      return { ...state, world: resolveImpacts(state.world, [removePairImpact]) };
    }
    default:
      return state;
  }
}
