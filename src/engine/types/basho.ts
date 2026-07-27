/**
 * src/engine/types/basho.ts
 * =======================
 * Basho (Tournament) Types
 *
 * Defines types for basho (tournaments), bout results, match schedules, and standings.
 * These types are used throughout the bout system and tournament management.
 *
 * @see boutResolver for bout result calculation
 * @see boutResultApplier for result application to world state
 * @see SwissAlgorithm for match scheduling
 */

import type { Id } from "./common";
import type { Side, BanzukeSnapshot } from "./banzuke";
import type { KimariteId, Stance, CombatArchetype } from "./combat";
import type { InjuryBodyArea, InjurySeverity } from "../systems/health/BodyDefinitions";
import type { PbpLine } from "../bout/boutNarrative";
import type { PromotionEvent, DemotionEvent } from "./banzuke";
import type { WorldState } from "./world";
import type { DramaContext } from "../matchmaking/DramaMatchmaker";

/**
 * Type representing basho name (6 annual tournaments).
 * Each basho occurs in a specific month and location.
 */
export type BashoName = "hatsu" | "haru" | "natsu" | "nagoya" | "aki" | "kyushu";

/**
 * Type representing season.
 * Used for seasonal effects and narrative generation.
 */
export type Season = "winter" | "spring" | "summer" | "autumn";

/**
 * Defines the structure for basho info.
 * Contains metadata about each tournament including location, venue, and timing.
 */
export interface BashoInfo {
  /** Basho name identifier. */
  name: BashoName;
  /** Japanese name. */
  nameJa: string;
  /** English name. */
  nameEn: string;
  /** Month of the basho (1-12). */
  month: number;
  /** City/location of the basho. */
  location: string;
  /** Venue name. */
  venue: string;
  /** Venue name in Japanese. */
  venueJa: string;
  /** Start day of the basho. */
  startDay: number;
  /** Season of the basho. */
  season: Season;
  /** Description of the basho. */
  description: string;
}

/**
 * Defines the structure for bout log entry.
 * Used to track key moments in a bout for narrative generation.
 */
export interface BoutLogEntry {
  /** Phase of the bout when this event occurred. */
  phase:
    | "tachiai"
    | "clinch"
    | "momentum"
    | "finish"
    | "tactical"
    | "engagement"
    | "edge_crisis"
    | "grip_transition"
    | "fatigue"
    | "bout_injury"
    | "momentum_shift"
    | "counter_tactic"
    | "bout_timeout";
  /** Clock time when this event occurred (in seconds). */
  clock?: number;
  /** Human-readable description of the event. */
  description?: string;
  /** Additional data associated with the event. */
  data?: Record<string, unknown>;
}

/**
 * Defines the structure for bout result.
 * Contains the complete outcome of a single bout.
 */
export interface BoutResult {
  /** Unique identifier for this bout. */
  boutId: string;
  /** Winning side (east or west). */
  winner: Side;
  /** ID of the winning rikishi. */
  winnerRikishiId: Id;
  /** ID of the losing rikishi. */
  loserRikishiId: Id;
  /** ID of the winner's heya (for rivalry tracking). */
  winnerHeyaId?: Id;
  /** ID of the loser's heya (for rivalry tracking). */
  loserHeyaId?: Id;
  /** Winning technique (kimarite). */
  kimarite: KimariteId;
  /** Name of the winning technique. */
  kimariteName: string;
  /** Stance used by the winner. */
  stance: Stance;
  /** Side that won the initial clash (tachiai). */
  tachiaiWinner: Side;
  /** Bout duration in seconds. */
  duration: number;
  /** Composite excitement score for Bout of the Basho ranking. Higher = more dramatic. */
  excitementScore?: number;
  /** Whether this bout was an upset (lower-ranked rikishi defeated higher-ranked). */
  upset: boolean;
  /** Whether this bout resulted in a kinboshi (maegashira defeating yokozuna or ozeki). */
  isKinboshi?: boolean;
  /** Whether this bout had championship implications. */
  isTitleStakes?: boolean;
  /** Whether this bout was part of a yusho race. */
  isYushoRace?: boolean;
  /** Award fact (kinboshi or ginboshi) if applicable. */
  awardFact?: "kinboshi" | "ginboshi" | null;
  /** Number of kensho envelopes won. */
  kenshoEnvelopes: number;
  /** Kensho banner slots for this bout. */
  kenshoBanners?: import("./sponsors").KenshoBannerSlot[];
  /** Injury risk multiplier from tactics (applied to loser's post-bout injury roll). */
  tacticInjuryRiskMultiplier?: number;
  /** Log of key events during the bout. */
  log: BoutLogEntry[];
  /** Play-by-play lines for detailed bout description. */
  pbpLines?: PbpLine[];
  /** Optional drama context copied from the match schedule for narrative enhancement. */
  dramaticContext?: DramaContext;
  /** Whether this bout required a mono-ii (judge consultation). */
  monoii?: boolean;
  /** Momentum score (positive = east dominated, negative = west dominated). */
  momentumScore: number;
  /** In-bout injury if one occurred during the bout. */
  inBoutInjury: {
    rikishiId: string;
    area: InjuryBodyArea;
    severity: InjurySeverity;
    triggerEvent: string;
  } | null;
  /** Archetype matchup data for narrative context. */
  archetypeMatchup?: {
    eastArchetype: CombatArchetype;
    westArchetype: CombatArchetype;
    counterActivated: boolean;
  };
  /** Whether the bout ended via timeout (max ticks reached). */
  isTimeout: boolean;
}

/**
 * Defines the structure for match schedule.
 * Represents a single scheduled bout in a basho.
 */
export interface MatchSchedule {
  /** Unique identifier for this bout. */
  boutId: string;
  /** Day of the basho (1-15). */
  day: number;
  /** ID of the east-side rikishi. */
  eastRikishiId: Id;
  /** ID of the west-side rikishi. */
  westRikishiId: Id;
  /** Result of the bout, if already resolved. */
  result?: BoutResult | null;
  /** Optional drama context for narrative enhancement (e.g., 7-7 showdown, yusho decider). */
  dramaticContext?: DramaContext;
}

/**
 * Type representing standings table.
 * Maps rikishi IDs to their win-loss records.
 */
export type StandingsTable = Record<Id, { wins: number; losses: number; absences?: number }>;

/**
 * Type representing standings table runtime.
 * Map version for efficient runtime operations.
 */
export type StandingsTableRuntime = Map<Id, { wins: number; losses: number; absences?: number }>;

/**
 * Defines the structure for basho state.
 * Tracks the current state of an active or completed basho.
 */
export interface BashoState {
  /** Year of the basho. */
  year: number;
  /** Basho number (1-6). */
  bashoNumber: 1 | 2 | 3 | 4 | 5 | 6;
  /** Basho name identifier. */
  bashoName: BashoName;
  /** Current day of the basho (1-15). */
  day: number;
  /** Schedule of all matches for this basho. */
  matches: MatchSchedule[];
  /** Current standings for all rikishi. */
  standings: StandingsTableRuntime;
  /** Whether this basho is currently active. */
  isActive: boolean;

  /**
   * Per-basho kinboshi tally: rikishi ID → count earned this basho.
   * Reset each tournament.
   */
  kinboshiThisBasho?: Record<Id, number>;
  id?: string;
  name?: string;
  schedule?: MatchSchedule[][];
  results?: BoutResult[][];
  currentDay?: number;

  /**
   * Per-rikishi bout metrics accumulated during the basho (7.1).
   * Used to populate enriched BashoPerformance fields at basho end.
   */
  boutMetrics?: Record<Id, {
    kimariteUsed: Record<string, number>;
    upsetCount: number;
    boutDurations: number[];
    edgeCrisisSurvived: number;
    comebackWins: number;
    opponentTiers: number[];
  }>;
}

/** A single award entry persisted to the global award log. */
export interface AwardLogEntry {
  bashoName: BashoName;
  year: number;
  type: "yusho" | "junYusho" | "ginoSho" | "kantosho" | "shukunsho" | "boutOfTheBasho";
  winnerId: Id;
  /** Bout ID for boutOfTheBasho entries; undefined for title/prize awards. */
  boutId?: string;
  excitementScore?: number;
}

/** A curated highlight bout entry persisted in BashoResult.keyBouts. */
export interface KeyBoutEntry {
  label: "yusho_decider" | "biggest_upset" | "kinboshi";
  bout: BoutResult;
  day: number;
  eastRikishiId: string;
  westRikishiId: string;
}

/** Defines the structure for basho result. */
export interface BashoResult {
  id: string;
  year: number;
  bashoNumber: 1 | 2 | 3 | 4 | 5 | 6;
  bashoName: BashoName;

  yusho: Id;
  junYusho: Id[];

  // Awards
  ginoSho?: Id;
  kantosho?: Id;
  shukunsho?: Id;

  /** Bout ID of the most exciting bout this basho (highest excitementScore). */
  boutOfTheBasho?: string;

  /** Curated highlight bouts from this basho (yusho decider, upsets, kinboshi). */
  keyBouts?: KeyBoutEntry[];

  playoffMatches?: MatchSchedule[];

  prizes: {
    yushoAmount: number;
    junYushoAmount: number;
    specialPrizes: number;
  };

  nextBanzuke?: BanzukeSnapshot;
}
/** Type representing banzuke update hook result. */
export interface BanzukeUpdateHookResult {
  promotions: PromotionEvent[];
  demotions: DemotionEvent[];
}

/** Type representing banzuke update hook. */
export type BanzukeUpdateHook = (args: {
  world: WorldState;
  bashoName: BashoName;
  year: number;
  standings: StandingsTableRuntime;
  seed: string;
}) => BanzukeUpdateHookResult;

/** Defines the structure for basho sim result (Auto-Sim style). */
export interface BashoSimResult {
  bashoName: BashoName;
  year: number;
  yushoWinner: { id: Id; shikona: string; wins: number; losses: number };
  junYusho: string[];
  standings: StandingsTableRuntime;
  keyBouts: BoutResult[];
  injuries: string[];
  promotions: PromotionEvent[];
  demotions: DemotionEvent[];
  finalWorld: WorldState;
  ginoSho?: Id;
  shukunsho?: Id;
  kantosho?: Id;
}
