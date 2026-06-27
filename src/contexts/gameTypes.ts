/**
 * src/contexts/gameTypes.ts
 * =======================
 * Game state types and initial state for the GameContext.
 *
 * Defines the GameState interface, GamePhase type, and GameAction type union.
 * These types are used throughout the application to manage game state mutations.
 *
 * @see gameActions for action creators
 * @see gameReducer for the main reducer logic
 * @see GameContext for the React context provider
 */

// Game State Types & Initial State
import type { WorldState } from "@/engine/types/world";
import type { BoutResult } from "@/engine/types/basho";
import type { HolidayResult } from "@/engine/holiday";
import type { AutoSimResult } from "@/engine/autoSim";
import type { UIDigest } from "@/presenters/uiDigest";

/**
 * Type representing game phase.
 * Phases represent the current screen or mode in the game UI.
 */
export type GamePhase =
  | "menu" // Main menu
  | "worldgen" // World generation screen
  | "interim" // Interim period (between basho)
  | "basho" // Basho overview
  | "day_preview" // Preview of upcoming day
  | "bout" // Individual bout view
  | "day_results" // Results of completed day
  | "basho_results" // Final basho results
  | "basho_recap" // Basho recap/narrative
  | "stable" // Stable management screen
  | "banzuke" // Banzuke rankings
  | "rikishi" // Individual rikishi details
  | "economy" // Economy management
  | "governance" // Governance/rulings
  | "history"; // Historical records

/**
 * Defines the structure for game state.
 * This is the top-level state managed by the GameContext.
 */
export interface GameState {
  /** Current game phase/screen. */
  phase: GamePhase;
  /** Current world state (null if no world loaded). */
  world: WorldState | null;
  /** Latest UIDigest built from world after each tick — consumed by InboxNewsTicker and similar components. */
  digest: UIDigest | null;
  /** Current bout index for simulation. */
  currentBoutIndex: number;
  /** Last bout result for display. */
  lastBoutResult: BoutResult | null;
  /** Player's heya ID (null if not set). */
  playerHeyaId: string | null;
  /** Player's oyakata ID (null if not set). */
  playerOyakataId: string | null;
  /** Whether auto-play mode is enabled. */
  isAutoPlaying: boolean;
  /** Map of bout IDs to tactics set by the player. */
  boutTactics: Record<string, import("@/engine/types/combat").BoutTactic>;
  /** True when the digest is stale and needs rebuild (set during bulk advances). */
  digestStale?: boolean;
}

/**
 * Type representing game action.
 * Union type of all possible actions that can be dispatched to the game reducer.
 */
export type GameAction =
  | {
      type: "CREATE_WORLD";
      seed: string;
      playerHeyaId?: string;
      oyakataConfig?: import("@/engine/types/oyakata").OyakataCreationConfig;
    }
  | { type: "SET_PLAYER_HEYA"; heyaId: string }
  | { type: "SET_PHASE"; phase: GamePhase }
  | { type: "START_BASHO" }
  | { type: "ADVANCE_DAY" }
  | { type: "SIMULATE_BOUT"; boutIndex: number; boutId?: string }
  | { type: "SIMULATE_ALL_BOUTS" }
  | { type: "END_DAY" }
  | { type: "END_BASHO" }
  | { type: "SIM_FULL_BASHO" }
  | { type: "RUN_HOLIDAY"; result: HolidayResult }
  | { type: "RUN_AUTO_SIM"; result: AutoSimResult }
  | { type: "SET_BOUT_TACTIC"; boutId: string; tactic: import("@/engine/types/combat").BoutTactic }
  | { type: "UPDATE_WORLD"; world: WorldState }
  | { type: "LOAD_WORLD"; world: WorldState }
  | {
      type: "BUILD_INFRASTRUCTURE";
      heyaId: string;
      facilityId: import("@/engine/types/infrastructure").FacilityId;
    }
  | { type: "TICK_DAY" }
  | { type: "TICK_MULTIPLE_DAYS"; payload: { days: number } }
  | { type: "ADVANCE_TUTORIAL_STEP"; step: import("@/engine/types/tutorial").TutorialStep }
  | { type: "SET_TUTORIAL_FLAG"; flag: keyof import("@/engine/types/tutorial").TutorialFlags }
  | { type: "COMPLETE_TUTORIAL" }
  | { type: "ASSIGN_MENTOR"; mentorId: string; apprenticeId: string }
  | { type: "REMOVE_MENTOR"; apprenticeId: string }
  | { type: "ADD_SPARRING_PAIR"; heyaId: string; aId: string; bId: string }
  | { type: "REMOVE_SPARRING_PAIR"; heyaId: string; aId: string; bId: string }
  | { type: "BOOKMARK_ENTITY"; entityType: string; entityId: string; note?: string }
  | { type: "UNBOOKMARK_ENTITY"; entityType: string; entityId: string }
  | { type: "UPDATE_BOOKMARK_NOTE"; entityType: string; entityId: string; note: string };

/**
 * Initial game state.
 * Used to initialize the GameContext when the application first loads.
 */
export const initialGameState: GameState = {
  phase: "menu",
  world: null,
  digest: null,
  currentBoutIndex: 0,
  lastBoutResult: null,
  playerHeyaId: null,
  playerOyakataId: null,
  isAutoPlaying: false,
  boutTactics: {},
  digestStale: false,
};
