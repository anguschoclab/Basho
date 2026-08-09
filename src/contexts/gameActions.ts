/**
 * src/contexts/gameActions.ts
 * ============================
 * Action creators for the GameContext reducer.
 *
 * Provides type-safe action creators for all game state mutations.
 * Actions are dispatched to the gameReducer to update the game state.
 *
 * @see gameReducer for the main reducer logic
 * @see gameTypes for action type definitions
 */

import type { GameAction, GamePhase } from "./gameTypes";
import type { WorldState } from "@/engine/types/world";
import type { HolidayResult } from "@/engine/holiday";
import type { AutoSimResult } from "@/engine/autoSim";

/**
 * Creates a new world with the given seed.
 *
 * @param {string} seed - Random seed for world generation.
 * @param {string} [playerHeyaId] - Optional player heya ID.
 * @param {import("@/engine/types/oyakata").OyakataCreationConfig} [oyakataConfig] - Optional oyakata creation config.
 * @returns {GameAction} CREATE_WORLD action.
 */
export const createWorld = (
  seed: string,
  playerHeyaId?: string,
  oyakataConfig?: import("@/engine/types/oyakata").OyakataCreationConfig
): GameAction => ({
  type: "CREATE_WORLD",
  seed,
  playerHeyaId,
  oyakataConfig,
});

/**
 * Sets the player's heya.
 *
 * @param {string} heyaId - The heya ID to set as player's heya.
 * @returns {GameAction} SET_PLAYER_HEYA action.
 */
export const setPlayerHeya = (heyaId: string): GameAction => ({
  type: "SET_PLAYER_HEYA",
  heyaId,
});

/**
 * Sets the current game phase.
 *
 * @param {GamePhase} phase - The phase to set.
 * @returns {GameAction} SET_PHASE action.
 */
export const setPhase = (phase: GamePhase): GameAction => ({
  type: "SET_PHASE",
  phase,
});

/**
 * Starts a new basho.
 *
 * @returns {GameAction} START_BASHO action.
 */
export const startBasho = (): GameAction => ({
  type: "START_BASHO",
});

/**
 * Advances to the next day.
 *
 * @returns {GameAction} ADVANCE_DAY action.
 */
export const advanceDay = (): GameAction => ({
  type: "ADVANCE_DAY",
});

/**
 * Simulates a specific bout.
 *
 * @param {number} boutIndex - The index of the bout to simulate.
 * @returns {GameAction} SIMULATE_BOUT action.
 */
export const simulateBout = (boutIndex: number, boutId?: string): GameAction => ({
  type: "SIMULATE_BOUT",
  boutIndex,
  boutId,
});

/**
 * Sets the tactic for a specific bout.
 *
 * @param {string} boutId - The bout ID.
 * @param {import("@/engine/types/combat").BoutTactic} tactic - The tactic to set.
 * @returns {GameAction} SET_BOUT_TACTIC action.
 */
export const setBoutTactic = (
  boutId: string,
  tactic: import("@/engine/types/combat").BoutTactic
): GameAction => ({
  type: "SET_BOUT_TACTIC",
  boutId,
  tactic,
});

/**
 * Simulates all bouts for the current day.
 *
 * @returns {GameAction} SIMULATE_ALL_BOUTS action.
 */
export const simulateAllBouts = (): GameAction => ({
  type: "SIMULATE_ALL_BOUTS",
});

/**
 * Ends the current day.
 *
 * @returns {GameAction} END_DAY action.
 */
export const endDay = (): GameAction => ({
  type: "END_DAY",
});

/**
 * Ends the current basho.
 *
 * @returns {GameAction} END_BASHO action.
 */
export const endBasho = (): GameAction => ({
  type: "END_BASHO",
});

/**
 * Simulates a full basho (all 15 days).
 *
 * @returns {GameAction} SIM_FULL_BASHO action.
 */
export const simFullBasho = (): GameAction => ({
  type: "SIM_FULL_BASHO",
});

/**
 * Runs a holiday event with the given result.
 *
 * @param {HolidayResult} result - The holiday result to apply.
 * @returns {GameAction} RUN_HOLIDAY action.
 */
export const runHoliday = (result: HolidayResult): GameAction => ({
  type: "RUN_HOLIDAY",
  result,
});

/**
 * Runs an auto-simulation with the given result.
 *
 * @param {AutoSimResult} result - The auto-simulation result to apply.
 * @returns {GameAction} RUN_AUTO_SIM action.
 */
export const runAutoSim = (result: AutoSimResult): GameAction => ({
  type: "RUN_AUTO_SIM",
  result,
});

/**
 * Updates the world state with a new world.
 *
 * @param {WorldState} world - The new world state.
 * @returns {GameAction} UPDATE_WORLD action.
 */
export const updateWorld = (world: WorldState): GameAction => ({
  type: "UPDATE_WORLD",
  world,
});

/**
 * Loads a saved world state.
 *
 * @param {WorldState} world - The world state to load.
 * @returns {GameAction} LOAD_WORLD action.
 */
export const loadWorld = (world: WorldState): GameAction => ({
  type: "LOAD_WORLD",
  world,
});
