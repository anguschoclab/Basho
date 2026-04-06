// Game State Types & Initial State
import type { WorldState } from "@/engine/types/world";
import type { BoutResult } from "@/engine/types/basho";
import type { HolidayResult } from "@/engine/holiday";
import type { AutoSimResult } from "@/engine/autoSim";
import type { UIDigest } from "@/presenters/uiDigest";

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
  /** Latest UIDigest built from world after each tick — consumed by InboxNewsTicker and similar components. */
  digest: UIDigest | null;
  selectedRikishiId: string | null;
  selectedHeyaId: string | null;
  currentBoutIndex: number;
  lastBoutResult: BoutResult | null;
  playerHeyaId: string | null;
  isAutoPlaying: boolean;
  boutTactics: Record<string, import("@/engine/types/combat").BoutTactic>;
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
  | { type: "SET_BOUT_TACTIC"; boutId: string; tactic: import("@/engine/types/combat").BoutTactic }
  | { type: "UPDATE_WORLD"; world: WorldState }
  | { type: "LOAD_WORLD"; world: WorldState }
  | { type: "UPGRADE_HEYA"; heyaId: string; axis: "training" | "recovery" | "nutrition"; points?: number }
  | { type: "RECRUIT_STAFF"; heyaId: string; role: any }
  | { type: "TICK_DAY" }
  | { type: "TICK_MULTIPLE_DAYS"; payload: { days: number } }
  | { type: "HANDLE_MEDIA_EVENT"; eventId: string; choice: string }
  | { type: "ISSUE_RULING"; rulingId: string; severity: "lenient" | "standard" | "harsh" }
  | { type: "ADVANCE_TUTORIAL_STEP"; step: import("@/engine/types/tutorial").TutorialStep }
  | { type: "SET_TUTORIAL_FLAG"; flag: keyof import("@/engine/types/tutorial").TutorialFlags }
  | { type: "COMPLETE_TUTORIAL" };

/** Initial game state. */
export const initialGameState: GameState = {
  phase: "menu",
  world: null,
  digest: null,
  selectedRikishiId: null,
  selectedHeyaId: null,
  currentBoutIndex: 0,
  lastBoutResult: null,
  playerHeyaId: null,
  isAutoPlaying: false,
  boutTactics: {},
};
