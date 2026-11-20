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

import type { Id } from "@/engine/types/common";
import type { Side, BanzukeSnapshot } from "@/engine/types/banzuke";
import type { KimariteId, Stance, CombatArchetype } from "@/engine/types/combat";
import type { InjuryBodyArea, InjurySeverity } from "@/engine/health/BodyDefinitions";
import type { PbpLine } from "@/engine/bout/boutNarrative";
import type { PromotionEvent, DemotionEvent } from "@/engine/types/banzuke";
import type { WorldState } from "@/engine/types/world";
import type { DramaContext } from "@/engine/matchmaking/DramaMatchmaker";
import type { MonoiiOutcome } from "@/engine/types/gyoji";
import type { GripClass } from "@/engine/types/combat-spatial";

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
 * Kinjite (禁止手) — forbidden-contact foul categories a shimpan panel can
 * review. Topknot grabs are the canonical foul; the rest cover the other
 * banned striking/gouging targets.
 */
export type KinjiteFoul =
  | "topknot_grab"
  | "closed_fist"
  | "eye_poke"
  | "throat_grab"
  | "ear_strike"
  | "low_blow"
  | "finger_bend"
  | "kick";

/**
 * Foul review record — set when the shimpan panel was called to review a
 * suspected kinjite during this bout. The suspect is always the apparent
 * winner at the moment of the foul; a confirmed review flips the result to
 * hansoku.
 */
export interface FoulReview {
  /** The foul the suspect was accused of. */
  foul: KinjiteFoul;
  /** Rikishi accused of the foul (the apparent winner). */
  suspectRikishiId: Id;
  /** Rikishi the foul was committed against. */
  victimRikishiId: Id;
  /** Side of the suspect. */
  suspectSide: Side;
  /** Panel verdict: true = foul confirmed (hansoku); false = cleared. */
  confirmed: boolean;
  /** The technique the apparent winner actually used before any hansoku flip. */
  apparentKimarite: KimariteId;
}

/**
 * Defines the structure for bout result.
 * Contains the complete outcome of a single bout.
 */
export interface BoutResult {
  /** Unique identifier for this bout. */
  boutId: string;
  /** Day of the basho (1-15) this bout was contested on. */
  day?: number;
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
  /**
   * Whether the loser's topknot came undone and his hair touched the clay
   * as he went down — the "hair-down automatic loss" rule. Flagged on
   * down-type finishes only.
   */
  hairDown?: boolean;
  /** Whether this bout had championship implications. */
  isTitleStakes?: boolean;
  /** Whether this bout was part of a yusho race. */
  isYushoRace?: boolean;
  /** Award fact (kinboshi or ginboshi) if applicable. */
  awardFact?: "kinboshi" | "ginboshi" | null;
  /** Awards earned by this bout's final result (kinboshi/ginboshi facts). */
  awards?: BoutAward[];
  /** Number of kensho envelopes won. */
  kenshoEnvelopes: number;
  /** Kensho banner slots for this bout. */
  kenshoBanners?: import("@/engine/types/sponsors").KenshoBannerSlot[];
  /** Injury risk multiplier from tactics (applied to loser's post-bout injury roll). */
  tacticInjuryRiskMultiplier?: number;
  /** Resolved tactic per side (player choice, NPC AI, or explicit override). */
  tactics?: {
    east?: import("@/engine/types/combat").BoutTactic;
    west?: import("@/engine/types/combat").BoutTactic;
  };
  /** Log of key events during the bout. */
  log: BoutLogEntry[];
  /** Play-by-play lines for detailed bout description. */
  pbpLines?: PbpLine[];
  /** Optional drama context copied from the match schedule for narrative enhancement. */
  dramaticContext?: DramaContext;
  /** Whether this bout required a mono-ii (judge consultation). */
  monoii?: boolean;
  /**
   * Why the mono-ii convened: "contested" = physics flagged a controversial
   * finish; "missed_call" = the panel proactively caught a call the gyoji
   * got wrong (hiwaza/close-edge finishes). Foul reviews leave this unset.
   */
  monoiiKind?: "contested" | "missed_call";
  /** ID of the gyoji who officiated this bout. */
  gyojiId?: string;
  /** IDs of the shimpan (judges) on the mono-ii panel, if a mono-ii occurred. */
  shimpanPanelIds?: string[];
  /** Outcome of the mono-ii consultation (if one occurred). */
  monoiiOutcome?: "upheld" | "reversed" | "rematch";
  /**
   * The side the gunbai originally pointed to — set when a sashichigae
   * (reversal) flips the result so the narrative can tell the story
   * correctly. Absent when no flip occurred.
   */
  apparentWinner?: Side;
  /** The side originally called the loser before a reversal. */
  apparentLoser?: Side;
  /** Whether this bout's result came from a torinaoshi (ordered rematch). */
  isTorinaoshi?: boolean;
  /** The annulled first attempt's record, kept for narrative and audit. */
  torinaoshiContext?: {
    firstWinner: Side;
    firstKimarite: KimariteId;
    firstLog: BoutLogEntry[];
    /** The rematch's own mono-ii verdict, if it had one (never "rematch"). */
    rematchOutcome?: MonoiiOutcome;
  };
  /**
   * Foul review record — present when the judges convened to review a
   * suspected kinjite. Always implies `monoii: true`; `confirmed: true`
   * means the suspect was disqualified (kimarite === "hansoku").
   */
  foulReview?: FoulReview;
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
  /**
   * Cross-division call-up: id of the rikishi fighting up from the division
   * below (e.g. a juryo rikishi called into an odd makuuchi card). Copied
   * from the MatchSchedule during enrichment for narrative/UI.
   */
  crossDivisionCallupId?: Id;
  /**
   * W L — hachiban-zumo: marks a bout where one rikishi fights an 8th bout
   * (having already completed his scheduled 7) to balance an odd jonokuchi
   * card. Id of the rikishi fighting the extra bout; losses carry no rank
   * penalty (movement is wins-driven), wins count toward record.
   */
  eighthBoutForRikishiId?: Id;
  /**
   * W M — winner's final mawashi grip class at decision time, taken from the
   * live belt state (or saved belt during a belt-borne edge crisis). Absent
   * for push-dominant finishes and tachiai resolutions with no belt battle.
   */
  winnerGrip?: GripClass;
  /**
   * W M — whether each side secured his declared `preferredGrip` at decision
   * time (migi → right hand inside, hidari → left hand inside). A flag is
   * only present for rikishi with a real preference on a bout that reached
   * the belt; feeds the per-basho signature-grip metrics.
   */
  gripSecured?: { east?: boolean; west?: boolean };
}

/**
 * Defines the structure for match schedule.
 * Represents a single scheduled bout in a basho.
 *
 * @contract `MatchSchedule` is a type projection of `MatchPairing` that explicitly
 * strips the internal matchmaking `reasons` array. Unit tests evaluating scheduling
 * overrides must assert on observable world impacts or final match-ups, as querying
 * `reasons` on this object will result in a type error.
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
  /**
   * Cross-division call-up bout (e.g. odd makuuchi card → top juryo rikishi
   * fights up). Holds the called-up rikishi's id; his result still counts
   * toward his own division's record.
   */
  crossDivisionCallupId?: Id;
  /** W L — hachiban-zumo marker: id of the rikishi fighting his 8th bout. */
  eighthBoutForRikishiId?: Id;
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
 * Dohyo clay condition for a basho — rolled at basho init (W J).
 * "firm" is the neutral baseline; "slick" clay (dry Kyushu venue) lowers
 * footing balance; "heavy" clay (humid Nagoya venue) slows tempo.
 */
export type DohyoCondition = "firm" | "slick" | "heavy";

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
   * Dohyo clay condition for this basho (W J) — rolled deterministically
   * at basho init from the venue's climate profile. Applies symmetric
   * bout-clone modifiers to both rikishi (venue affects everyone equally).
   */
  dohyoCondition?: DohyoCondition;

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
  boutMetrics?: Record<
    Id,
    {
      kimariteUsed: Record<string, number>;
      upsetCount: number;
      boutDurations: number[];
      edgeCrisisSurvived: number;
      comebackWins: number;
      opponentTiers: number[];
      /** W M — bouts fought by a rikishi who declares a preferredGrip. */
      preferredGripBouts?: number;
      /** W M — of those, bouts where he secured the preferred grip. */
      preferredGripSecured?: number;
      /** W M — wins among secured bouts ("once he gets the grip…"). */
      preferredGripWins?: number;
      /** W M — consecutive wins this basho vs sanyaku-ranked opponents. */
      sanyakuWinStreak?: number;
      /** W N — bouts where this rikishi won the tachiai. */
      tachiaiWins?: number;
      /** W N — of those, bouts still lost ("phase two" letdowns). */
      tachiaiWonButLost?: number;
      /** W N — wins by pull-family kimarite (hikiotoshi, hatakikomi, tsukiotoshi…). */
      pullWins?: number;
      /** W O — last basho day on which this rikishi attempted or executed a henka. */
      lastHenkaDay?: number;
      /** W P — edge crises where this rikishi pushed the opponent to the tawara
       *  but the opponent escaped (attributed via log `data.side`). */
      edgeFailedConversions?: number;
    }
  >;

  /** W O — mid-basho kyujo re-entry (sai-shutsujo): rikishi ID -> basho day they returned. */
  reenteredOnDay?: Record<Id, number>;

  /** True for exhibition/jungyo basho — results do not count toward records or banzuke. */
  isExhibition?: boolean;
  /** Display name for exhibition basho (e.g. "Regional Jungyo Tour"). */
  exhibitionName?: string;
}

/**
 * A single star award (kinboshi/ginboshi) earned by a bout's final result.
 * Pure fact data — produced by detection, applied to state by the bout
 * result applier. Persisted on the BoutResult so the award survives
 * serialization, replays, and ledger derivation.
 */
export interface BoutAward {
  type: "kinboshi" | "ginboshi";
  winnerId: Id;
  loserId: Id;
  day: number;
  boutId: string;
}

/** A single award entry persisted to the global award log. */
export interface AwardLogEntry {
  bashoName: BashoName;
  year: number;
  type: "yusho" | "junYusho" | "ginoSho" | "kantosho" | "shukunsho" | "boutOfTheBasho" | "kinboshi";
  winnerId: Id;
  /** Bout ID for boutOfTheBasho and kinboshi entries; undefined for title/prize awards. */
  boutId?: string;
  /** Defeated opponent for kinboshi entries (the fallen yokozuna). */
  opponentId?: Id;
  /** Tournament day the award was earned (kinboshi entries). */
  day?: number;
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

  // Awards — each prize lists every winner; the JSA may split a prize,
  // award one rikishi several prizes, or withhold a prize (empty array).
  ginoSho?: Id[];
  kantosho?: Id[];
  shukunsho?: Id[];

  /** Bout ID of the most exciting bout this basho (highest excitementScore). */
  boutOfTheBasho?: string;

  /** Curated highlight bouts from this basho (yusho decider, upsets, kinboshi). */
  keyBouts?: KeyBoutEntry[];

  playoffMatches?: MatchSchedule[];

  prizes: {
    yushoAmount: number;
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
  /** Kettei-sen bouts played to break a shared top record. */
  playoffMatches?: MatchSchedule[];
  ginoSho?: Id[];
  shukunsho?: Id[];
  kantosho?: Id[];
}
