// Game State Types & Initial State
import type { WorldState, BoutResult } from "@/engine/types";
import type { HolidayResult } from "@/engine/holiday";
import type { AutoSimResult } from "@/engine/autoSim";

/** Type representing game phase. */
export type GamePhase =
  | "menu"
  | "worldgen"
  | "interim"
  | "basho"
  | "day_preview"
  | "bout"
  | "day_results"
  | "basho_results"
  | "basho_recap"
  | "stable"
  | "banzuke"
  | "rikishi"
  | "economy"
  | "governance"
  | "history";

/** Defines the structure for game state. */
export interface GameState {
  phase: GamePhase;
  world: WorldState | null;
  selectedRikishiId: string | null;
  selectedHeyaId: string | null;
  currentBoutIndex: number;
  lastBoutResult: BoutResult | null;
  playerHeyaId: string | null;
  isAutoPlaying: boolean;
}

/** Type representing game action. */
export type GameAction =
  | { type: "CREATE_WORLD"; seed: string; playerHeyaId?: string }
  | { type: "SET_PLAYER_HEYA"; heyaId: string }
  | { type: "SET_PHASE"; phase: GamePhase }
  | { type: "START_BASHO" }
  | { type: "ADVANCE_DAY" }
  | { type: "SIMULATE_BOUT"; boutIndex: number }
  | { type: "SIMULATE_ALL_BOUTS" }
  | { type: "END_DAY" }
  | { type: "END_BASHO" }
  | { type: "SIM_FULL_BASHO" }
  | { type: "ADVANCE_INTERIM"; weeks: number }
  | { type: "ADVANCE_ONE_DAY" }
  | { type: "RUN_HOLIDAY"; result: HolidayResult }
  | { type: "RUN_AUTO_SIM"; result: AutoSimResult }
  | { type: "SELECT_RIKISHI"; id: string | null }
  | { type: "SELECT_HEYA"; id: string | null }
  | { type: "SET_AUTO_PLAY"; value: boolean }
  | { type: "UPDATE_WORLD"; world: WorldState }
  | { type: "LOAD_WORLD"; world: WorldState };

/** Initial game state. */
export const initialGameState: GameState = {
  phase: "menu",
  world: null,
  selectedRikishiId: null,
  selectedHeyaId: null,
  currentBoutIndex: 0,
  lastBoutResult: null,
  playerHeyaId: null,
  isAutoPlaying: false,
};
