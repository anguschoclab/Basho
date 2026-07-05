/**
 * src/engine/systems/narrative/RivalryConstants.ts
 * ================================================
 * Authoritative constants for the Rivalry System.
 *
 * Defines tones, triggers, and heat bands for rikishi relationships.
 * Goal: Domain-driven narrative design.
 *
 * @see RivalryService for rivalry state management
 * @see RivalryHeatService for heat calculation logic
 */

import type { Id } from "../../engine/types/common";

/**
 * Rivalry tone types representing the emotional flavor of a rivalry.
 * These tones determine narrative generation and event selection.
 */
export type RivalryTone =
  | "respect" // Mutual respect between evenly-matched opponents
  | "grudge" // Personal animosity from past slights
  | "bad_blood" // Deep-seated hatred from repeated conflicts
  | "mentor_student" // Teacher-student relationship dynamics
  | "unstable" // Volatile relationship with unpredictable outcomes
  | "public_hype"; // Media-driven rivalry for fan entertainment

/**
 * Rivalry trigger types representing how a rivalry was initiated.
 * Each trigger can contribute to the initial heat and tone of a rivalry.
 */
export type RivalryTrigger =
  | "repeat_matches" // Multiple meetings between the same rikishi
  | "close_finish" // Bout ended in a very close decision
  | "upset" // Lower-ranked rikishi defeated higher-ranked
  | "kinboshi" // Maegashira defeated Yokozuna or Ozeki
  | "title_stakes" // Bout had championship implications
  | "injury_incident" // Bout resulted in or nearly resulted in injury
  | "personal_history" // Pre-existing relationship from background
  | "heya_feud" // Rivalry stemming from stable-to-stable conflict
  | "sparring"; // Rivalry formed from extended sparring partnership

/**
 * Canonical pair key for rivalries.
 * Format: smallerId|largerId to ensure consistent key generation.
 */
export type RivalryKey = string;

/**
 * Human-readable labels for rivalry triggers.
 * Used in UI display and narrative generation.
 */
export const RIVALRY_TRIGGER_LABELS: Record<RivalryTrigger, string> = {
  repeat_matches: "Repeat Meetings",
  close_finish: "Down to the Wire",
  upset: "Shock Upset",
  kinboshi: "Giant Killing",
  title_stakes: "Title Pressure",
  injury_incident: "Near Injury",
  personal_history: "Old History",
  heya_feud: "Stable Feud",
  sparring: "Sparring Partnership",
};

/**
 * Human-readable labels for rivalry tones.
 * Used in UI display and narrative generation.
 */
export const RIVALRY_TONE_LABELS: Record<RivalryTone, string> = {
  respect: "Mutual Respect",
  grudge: "Deep Grudge",
  bad_blood: "Bad Blood",
  mentor_student: "Mentor & Student",
  unstable: "Volatile",
  public_hype: "Public Hype",
};

/**
 * Pre-generated derby labels for high-profile rivalries.
 * Used to add flavor to rivalry narratives.
 */
export const DERBY_LABELS = [
  "Tokyo Derby",
  "The 1999 Generation",
  "Foreign Legion Clash",
  "Rookie Rivalry",
  "Traditionalist Feud",
  "The Battle of Tokyo",
  "Clash of Styles",
  "Elite Showdown",
  "Stable Hegemony",
];

/**
 * Defines the structure for a rivalry pair state.
 * Tracks the relationship between two rikishi over time.
 */
export interface RivalryPairState {
  /** Canonical pair key: smallerId|largerId */
  key: RivalryKey;
  /** First rikishi ID (smaller ID) */
  aId: Id;
  /** Second rikishi ID (larger ID) */
  bId: Id;
  /** Current heat level (0-100), higher = more intense rivalry */
  heat: number;
  /** Total number of meetings between the two rikishi */
  meetings: number;
  /** Week number when they last met */
  lastMetWeek: number;
  /** Total wins for rikishi A */
  aWins: number;
  /** Total wins for rikishi B */
  bWins: number;
  /** Closeness metric (0-100), higher = more competitive matches */
  closeness: number;
  /** Spite metric (0-100), higher = more animosity */
  spite: number;
  /** Current emotional tone of the rivalry */
  tone: RivalryTone;
  /** Map of triggers that contributed to this rivalry with week counts */
  triggers: Partial<Record<RivalryTrigger, number>>;
  /** Whether both rikishi are in the same heya */
  sameHeya: boolean;
  /** Optional custom label for this rivalry (overrides generated labels) */
  label?: string;
  /** Kimarite of the last bout between these two rikishi */
  lastKimarite?: string;
  /** ID of the rikishi who won the last bout between these two */
  lastWinnerId?: Id;
}

/**
 * JSON-safe container for all rivalry state in the world.
 * Persists across game saves and loads.
 */
export interface RivalriesState {
  /** Version identifier for data migration */
  version: "1.0.0";
  /** Map of rivalry keys to rivalry pair states */
  pairs: Record<RivalryKey, RivalryPairState>;
  /** Optional map of heya-level rivalries for stable-to-stable conflicts */
  heyaRivalryPairs?: Record<
    string,
    {
      id: string;
      heyaAId: Id;
      heyaBId: Id;
      heat: number;
      aWins: number;
      bWins: number;
      label?: string;
    }
  >;
}

// H2H win probability boost
export const H2H_WIN_PROBABILITY_BOOST = 0.15;

// Rivalry decay
export const RIVALRY_DECAY_WEEKS_SHORT = 4;
export const RIVALRY_DECAY_WEEKS_MEDIUM = 12;
export const RIVALRY_DECAY_RATE_SHORT = 0.5;
export const RIVALRY_DECAY_RATE_MEDIUM = 1.0;
export const RIVALRY_DECAY_RATE_LONG = 1.5;

// Sparring rivalry
export const SPARRING_RIVALRY_WEEKS_THRESHOLD = 12;
export const TOP_SPARRING_PAIRS_COUNT = 12;

// Narrative
export const NARRATIVE_BASE_COUNT_MIN = 8;
export const NARRATIVE_BASE_COUNT_RANGE = 12;
export const NARRATIVE_DRAMATIC_DAY_THRESHOLD = 13;

// Narrative bands
export const BAND_EXCELLENT_MIN = 0.85;
export const BAND_GOOD_MIN = 0.6;
export const BAND_FAIR_MIN = 0.35;

// Taiki bands
export const TAIKI_BAND_EXCELLENT_MIN = 90;
export const TAIKI_BAND_GOOD_MIN = 75;
export const TAIKI_BAND_FAIR_MIN = 50;

// Height bands
export const HEIGHT_GIANT_MIN = 192;
export const HEIGHT_TOWERING_MIN = 200;

// Rivalry heat spice chance
export const RIVALRY_HEAT_SPICE_CHANCE = 0.25;

// Bard engine threshold
export const BARD_ENGINE_NORMALIZED_THRESHOLD = 0.66;

// Bout duration divisors
export const BOUT_DURATION_CLOSENESS_DIVISOR = 30;
export const BOUT_DURATION_DOMINATION_DIVISOR = 15;

// Final day
export const BASHO_FINAL_DAY = 15;

// Rivalry decay long weeks
export const RIVALRY_DECAY_WEEKS_LONG = 30;

// Rivalry heat thresholds
export const RIVALRY_HEAT_MIN = 5;
export const RIVALRY_MEETINGS_MIN = 2;

// Rank difference bonus
export const RANK_DIFF_BONUS_BASE = 15;
export const RANK_DIFF_BONUS_MULTIPLIER = 2;
export const RANK_DIFF_MAX = 4;

// Drama generator constants
export const DRAMA_HEAT_DEFAULT = 15;
export const DRAMA_PRESTIGE_COST = 15;

// RNG threshold
export const RIVALRY_RNG_THRESHOLD = 0.4;

// Rivalry initialization defaults
export const RIVALRY_CLOSENESS_DEFAULT = 0.5;
export const RIVALRY_DOMINATION_DEFAULT = 0.2;

// Rivalry seeding bonuses
export const STYLE_CLASH_BONUS = 10;
export const SAME_DIVISION_BONUS = 5;
export const AGE_PROXIMITY_BONUS_BASE = 10;
export const AGE_PROXIMITY_MULTIPLIER = 3;
export const AGE_PROXIMITY_MAX_DIFF = 2;

// Rivalry initial heat range
export const RIVALRY_INITIAL_HEAT_MIN = 20;
export const RIVALRY_INITIAL_HEAT_MAX = 45;

// Sparring rivalry initial heat range
export const SPARRING_INITIAL_HEAT_MIN = 40;
export const SPARRING_INITIAL_HEAT_MAX = 60;

// Heya heat gain from bouts
export const HEYA_HEAT_GAIN_TITLE_STAKES = 8;
export const HEYA_HEAT_GAIN_NORMAL = 3;
