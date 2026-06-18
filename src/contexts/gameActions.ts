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
 * Advances the interim period by the specified number of weeks.
 *
 * @param {number} weeks - Number of weeks to advance.
 * @returns {GameAction} ADVANCE_INTERIM action.
 */
export const advanceInterim = (weeks: number): GameAction => ({
  type: "ADVANCE_INTERIM",
  weeks,
});

/**
 * Advances by one day.
 *
 * @returns {GameAction} ADVANCE_ONE_DAY action.
 */
export const advanceOneDay = (): GameAction => ({
  type: "ADVANCE_ONE_DAY",
});

/**
 * Ticks multiple days at once.
 *
 * @param {number} days - Number of days to tick.
 * @returns {GameAction} TICK_MULTIPLE_DAYS action.
 */
export const tickMultipleDays = (days: number): GameAction => ({
  type: "TICK_MULTIPLE_DAYS",
  payload: { days },
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
 * Selects a rikishi as the currently selected rikishi.
 *
 * @param {string | null} id - The rikishi ID to select, or null to deselect.
 * @returns {GameAction} SELECT_RIKISHI action.
 */
export const selectRikishi = (id: string | null): GameAction => ({
  type: "SELECT_RIKISHI",
  id,
});

/**
 * Selects a heya as the currently selected heya.
 *
 * @param {string | null} id - The heya ID to select, or null to deselect.
 * @returns {GameAction} SELECT_HEYA action.
 */
export const selectHeya = (id: string | null): GameAction => ({
  type: "SELECT_HEYA",
  id,
});

/**
 * Sets auto-play mode on or off.
 *
 * @param {boolean} value - Whether to enable auto-play.
 * @returns {GameAction} SET_AUTO_PLAY action.
 */
export const setAutoPlay = (value: boolean): GameAction => ({
  type: "SET_AUTO_PLAY",
  value,
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

/**
 * Upgrades a heya facility by the specified axis.
 *
 * @param {string} heyaId - The heya ID.
 * @param {"training" | "recovery" | "nutrition"} axis - The facility axis to upgrade.
 * @param {number} [points] - Optional number of points to spend.
 * @returns {GameAction} UPGRADE_HEYA action.
 */
export const upgradeHeya = (
  heyaId: string,
  axis: "training" | "recovery" | "nutrition",
  points?: number
): GameAction => ({
  type: "UPGRADE_HEYA",
  heyaId,
  axis,
  points,
});

/**
 * Builds infrastructure for a heya.
 *
 * @param {string} heyaId - The heya ID.
 * @param {import("@/engine/types/infrastructure").FacilityId} facilityId - The facility ID to build.
 * @returns {GameAction} BUILD_INFRASTRUCTURE action.
 */
export const buildInfrastructure = (
  heyaId: string,
  facilityId: import("@/engine/types/infrastructure").FacilityId
): GameAction => ({
  type: "BUILD_INFRASTRUCTURE",
  heyaId,
  facilityId,
});

/**
 * Recruits staff for a heya.
 *
 * @param {string} heyaId - The heya ID.
 * @param {any} role - The staff role to recruit.
 * @returns {GameAction} RECRUIT_STAFF action.
 */
export const recruitStaff = (heyaId: string, role: any): GameAction => ({
  type: "RECRUIT_STAFF",
  heyaId,
  role,
});

/**
 * Handles a media event with the given choice.
 *
 * @param {string} eventId - The media event ID.
 * @param {string} choice - The choice made.
 * @returns {GameAction} HANDLE_MEDIA_EVENT action.
 */
export const handleMediaEvent = (eventId: string, choice: string): GameAction => ({
  type: "HANDLE_MEDIA_EVENT",
  eventId,
  choice,
});

/**
 * Issues a governance ruling with the given severity.
 *
 * @param {string} rulingId - The ruling ID.
 * @param {"lenient" | "standard" | "harsh"} severity - The ruling severity.
 * @returns {GameAction} ISSUE_RULING action.
 */
export const issueRuling = (
  rulingId: string,
  severity: "lenient" | "standard" | "harsh"
): GameAction => ({
  type: "ISSUE_RULING",
  rulingId,
  severity,
});

/**
 * Advances the tutorial to the next step.
 *
 * @param {import("@/engine/types/tutorial").TutorialStep} step - The tutorial step.
 * @returns {GameAction} ADVANCE_TUTORIAL_STEP action.
 */
export const advanceTutorialStep = (
  step: import("@/engine/types/tutorial").TutorialStep
): GameAction => ({
  type: "ADVANCE_TUTORIAL_STEP",
  step,
});

/**
 * Sets a tutorial flag.
 *
 * @param {keyof import("@/engine/types/tutorial").TutorialFlags} flag - The tutorial flag to set.
 * @returns {GameAction} SET_TUTORIAL_FLAG action.
 */
export const setTutorialFlag = (
  flag: keyof import("@/engine/types/tutorial").TutorialFlags
): GameAction => ({
  type: "SET_TUTORIAL_FLAG",
  flag,
});

/**
 * Completes the tutorial.
 *
 * @returns {GameAction} COMPLETE_TUTORIAL action.
 */
export const completeTutorial = (): GameAction => ({
  type: "COMPLETE_TUTORIAL",
});

/**
 * Assigns a mentor to an apprentice rikishi.
 *
 * @param {string} mentorId - The mentor's rikishi ID.
 * @param {string} apprenticeId - The apprentice's rikishi ID.
 * @returns {GameAction} Action for mentor assignment.
 */
export const assignMentor = (mentorId: string, apprenticeId: string): GameAction => ({
  type: "ASSIGN_MENTOR",
  mentorId,
  apprenticeId,
});

/**
 * Removes a mentor from an apprentice rikishi.
 *
 * @param {string} apprenticeId - The apprentice's rikishi ID.
 * @returns {GameAction} Action for mentor removal.
 */
export const removeMentor = (apprenticeId: string): GameAction => ({
  type: "REMOVE_MENTOR",
  apprenticeId,
});

export const addSparringPair = (heyaId: string, aId: string, bId: string): GameAction => ({
  type: "ADD_SPARRING_PAIR",
  heyaId,
  aId,
  bId,
});

export const removeSparringPair = (heyaId: string, aId: string, bId: string): GameAction => ({
  type: "REMOVE_SPARRING_PAIR",
  heyaId,
  aId,
  bId,
});

export const bookmarkEntity = (
  entityType: string,
  entityId: string,
  note?: string
): GameAction => ({
  type: "BOOKMARK_ENTITY",
  entityType,
  entityId,
  note,
});

export const unbookmarkEntity = (entityType: string, entityId: string): GameAction => ({
  type: "UNBOOKMARK_ENTITY",
  entityType,
  entityId,
});

export const updateBookmarkNote = (
  entityType: string,
  entityId: string,
  note: string
): GameAction => ({
  type: "UPDATE_BOOKMARK_NOTE",
  entityType,
  entityId,
  note,
});
