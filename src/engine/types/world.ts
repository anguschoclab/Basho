/**
 * src/engine/types/world.ts
 * =========================
 * World State Types
 *
 * Responsibilities:
 * - Define WorldState interface (core simulation state)
 * - Define cycle phases and transient context
 * - Define world-level metadata and settings
 * - Define calendar and time tracking types
 *
 * @example
 * ```ts
 * import { WorldState, CyclePhase } from "@/engine/types/world";
 * const world: WorldState = { ... };
 * ```
 */

import type { Id, IdMapRuntime } from "./common";
import type { EventsState } from "./events";
import type { BanzukeSnapshot } from "./banzuke";
import type { BashoName, BashoResult, AwardLogEntry, BoutResult } from "./basho";
import type { Rikishi } from "./rikishi";
import type { Heya } from "./heya";
import type { Oyakata } from "./oyakata";
import type { BashoState } from "./basho";
import type { Staff } from "./staff";
import type { HeyaTrainingState, SparringState } from "./training";
import type { GovernanceRuling, IchimonName, Faction } from "./economy";
import type { MyosekiMarket } from "./myoseki";
import type { Rank } from "./banzuke";
import type { ExhibitionRegion } from "../systems/worldCircuit/WorldCircuitService";
import type { AlmanacSnapshot } from "../almanac";
import type { GlobalCupState, GlobalCupHistoryEntry } from "./globalCup";
import type { BloodlineRegistry } from "./dynasty";
import type { LineageEdge } from "../lineage";
import type { HallOfFameState } from "../hallOfFame";
import type { HistoryIndex } from "../historyIndex";
import type { SeededRNG } from "../rng";
import type { ScoutedRikishi } from "../systems/recruitment/ScoutingService";
import type { OzekiKadobanMap } from "../banzuke";
import type { SponsorPool } from "./sponsors";
import type { MediaState } from "./media";
import type { PerceptionSnapshot } from "../perception";
import type { RivalriesState } from "../rivalries";
import type { TutorialState } from "./tutorial";
import type { TalentPoolWorldState } from "./talent";
import type { ActiveCrisis } from "./crises";
import type { WorldRecords } from "./records";

/** Type representing cycle phase. */
export type CyclePhase = "pre_basho" | "active_basho" | "post_basho" | "interim" | "banzuke_reveal";

// ── Pipeline: Transient Context ───────────────────────────────────────────────
// Computed once per week by phase02_context.ts. Never persisted to save files.

/** Per-stat style drift multipliers from training philosophy + ichimon stat bonuses. */
export interface StyleDriftMults {
  power: number;
  speed: number;
  technique: number;
  balance: number;
  stamina: number;
  mental: number;
}

/** Pre-calculated modifier bundle derived by phase02_context each tick. */
export interface ActiveModifiers {
  /** Training facility growth multiplier (0.85 + training/100 * 0.35). */
  facilityGrowthMult: number;
  /** Nutrition facility multiplier (0.92 + nutrition/100 * 0.16). */
  nutritionMult: number;
  /** Degeiko multiplier from ichimon + faction influence + rivalry penalties. */
  degeikoMult: number;
  /** Per-stat style drift from training philosophy + ichimon stat bonuses. */
  styleDriftMults: StyleDriftMults;
  /** Multiplier applied to injury healing speed. Derived from recovery facility * nutrition. */
  recoveryMultiplier: number;
  /** True when the heya's bank balance < 0. Halves training gains. */
  financialPenalty: boolean;
  /** True when a player heya rikishi won yusho in most recent basho. Adds +0.15 to training gains. */
  moraleBoost: boolean;
}

/** Mutation ledger produced during a single pipeline run. */
export interface TickDeltas {
  revenue: number;
  expenses: number;
  /** RikishiID → list of stat changes applied this tick. */
  statChanges: Record<string, { stat: string; amount: number }[]>;
  /** IDs of rikishi who sustained a new injury this tick. */
  injuriesSustained: string[];
}

/** Ephemeral context injected into WorldState for the duration of a tick. */
export interface TransientContext {
  activeModifiers?: ActiveModifiers;
  deltas?: TickDeltas;
  boundaries?: {
    monthBoundary: boolean;
    yearBoundary: boolean;
  };
  /** Deferred month boundary — set when a month boundary lands on a non-weekly day,
   *  consumed on the next weekly tick. */
  pendingMonthBoundary?: boolean;
  /** Deferred year boundary — set when a year boundary lands on a non-weekly day,
   *  consumed on the next weekly tick. */
  pendingYearBoundary?: boolean;
  lastReport?: Record<string, unknown>;
  preGeneratedSchedules?: {
    day1: string[];
    day2: string[];
    announcedAtWeek: number;
  };
  dailyInjuryRiskOverrides?: Record<string, number>;
}

/** Defines the structure for recruitment window. */
export interface RecruitmentWindow {
  openedAtWeek: number;
  closesAtWeek: number;
  vacancies: number;
  isOpen: boolean;
  phase: "post_basho" | "mid_interim";
}

/** Defines the structure for post basho meta. */
export interface PostBashoMeta {
  bashoNumber: number;
  metaBias: "oshi" | "yotsu" | "hybrid" | "neutral";
  yushoStyle: string;
  recognitionEligibleWeek: number;
}

/** Defines the structure for pre-basho assessment. */
export interface PreBashoAssessment {
  assessedAtWeek: number;
  rikishiAssessments: Map<
    string,
    {
      rikishiId: string;
      healthScore: number;
      injuryRisk: "low" | "medium" | "high";
      recommendedFocus: "protect" | "rebuild" | "normal";
      withdrawalRecommended: boolean;
    }
  >;
  overallHealthScore: number;
  withdrawalsThisAssessment: number;
}

/** Defines the structure for a closed or merged heya. */
export interface ClosedHeyaRecord extends Heya {
  closedAtYear: number;
  closedAtBasho?: BashoName;
  mergedInto?: Id;
}

export interface BookmarkEntry {
  entityType: string;
  entityId: string;
  note?: string;
  createdAt: number;
}

export interface WorldState {
  hallOfFame?: HallOfFameState;
  historyIndex?: HistoryIndex;
  staff: IdMapRuntime<Staff>;
  lineage?: LineageEdge[];
  id: string;
  seed: string;
  year: number;
  week: number;
  dayIndexGlobal: number;
  cyclePhase: CyclePhase;

  currentBashoName?: BashoName;
  currentBasho?: BashoState;
  /** Consecutive basho with no active yokozuna — used for prestige promotion. */
  yokozunaVacancyStreak?: number;
  rng?: SeededRNG;

  heyas: IdMapRuntime<Heya>;

  rikishi: IdMapRuntime<Rikishi>;
  historicalRikishi: IdMapRuntime<Rikishi>;
  /** Set of active (non-retired) rikishi IDs for efficient iteration. */
  activeRikishiIds: Set<string>;
  oyakata: IdMapRuntime<Oyakata>;

  history: BashoResult[];
  /** Persistent cross-basho award log (yusho, sansho, bout of the basho). */
  awardLog?: AwardLogEntry[];
  /**
   * Global Meta State (Era Drift) (E4)
   * Tracks the current style tone of the era and individual technique drift.
   */
  meta: {
    tone: "classic" | "explosive" | "technical" | "defensive";
    drift: Record<string, number>;
  };
  /** Cumulative count of techniques used in the world (for drift calculations). */
  globalKimariteStats: Record<string, number>;

  events: EventsState;
  playerKnowledge?: {
    scouting?: Record<string, ScoutedRikishi>;
    bookmarks?: BookmarkEntry[];
  };

  governanceLog?: GovernanceRuling[];
  factions?: Record<IchimonName, Faction>;

  almanacSnapshots?: AlmanacSnapshot[];
  tutorialState?: TutorialState;
  playerHeyaId?: Id;

  currentBanzuke?: BanzukeSnapshot;
  closedHeyas?: Map<Id, ClosedHeyaRecord>;

  ozekiKadoban?: OzekiKadobanMap;

  trainingState?: IdMapRuntime<HeyaTrainingState>;

  /**
   * Map of heya IDs to sparring partnership states.
   * Tracks intra-heya sparring pairs that provide chemistry-based stat bonuses.
   */
  sparringPairs?: IdMapRuntime<SparringState>;

  talentPool?: TalentPoolWorldState;
  candidatePool?: TalentPoolWorldState;

  sponsorPool?: SponsorPool;

  mediaState?: MediaState;

  perceptionCache?: Record<Id, PerceptionSnapshot>;

  npcScoutingPriorities?: Record<Id, "none" | "passive" | "active" | "aggressive">;

  _interimDaysRemaining?: number;
  _postBashoDays?: number;
  _daysSinceLastWeeklyTick?: number;

  /**
   * Transient flag marking an autonomous run (AutoSim, holiday fast-forward).
   * When set, player-facing loop decisions are not generated and the within-tick
   * crisis halt is disabled, so the simulation never freezes waiting for an
   * interactive choice that nobody will make.
   */
  _autonomousSim?: boolean;

  /** Delegation policy used to auto-resolve loop decisions during autonomous runs. */
  _autonomousPolicy?: "conservative" | "balanced" | "aggressive";

  _recruitmentWindow?: RecruitmentWindow;

  _postBashoMeta?: PostBashoMeta;

  /**
   * Equilibrium active-rikishi population captured at world generation.
   * Read-only coupling point for the replacement-rate controller (RecruitmentController)
   * and the lifecycle plan. Falls back to 0 (no replacement) when unset.
   */
  _populationTarget?: number;

  rivalriesState?: RivalriesState;

  lastBoutResult?: BoutResult;

  /** Crisis waiting to be presented to player (checked on Dashboard load) */
  pendingCrisis?: ActiveCrisis;

  /** Player loop decisions that block progress until resolved */
  pendingDecisions?: Array<{
    id: string;
    type: string;
    description: string;
    deadlineWeek: number;
    options: Array<{ id: string; label: string; impact: string }>;
    required: boolean;
  }>;

  /** Chronicle/Historical record browser state */
  chronicle?: {
    eraLabels: Array<{
      year: number;
      basho: string;
      label: string;
      description: string;
    }>;
    topChampions: Array<{
      rikishiId: string;
      shikona: string;
      totalYusho: number;
      peakRank: string;
    }>;
    greatestRivalries: Array<{
      rikishiAId: string;
      rikishiBId: string;
      shikonaA: string;
      shikonaB: string;
      totalBouts: number;
    }>;
    recordsBroken: Array<{
      recordType: string;
      rikishiId: string;
      shikona: string;
      value: number;
      year: number;
    }>;
    globalCups?: GlobalCupHistoryEntry[];
  };

  /** Global Cup tournament state */
  globalCup?: GlobalCupState;

  selectedRikishiId?: string;

  boutTactics?: Record<string, string>;

  calendar?: {
    currentWeek: number;
    month?: number;
    currentDay?: number;
  };

  _preGeneratedSchedules?: {
    day1: string[];
    day2: string[];
    announcedAtWeek: number;
  };

  _preBashoAssessment?: PreBashoAssessment;

  myosekiMarket?: MyosekiMarket;

  activeBasho?: {
    id: string;
  };

  records: WorldRecords;

  settings: {
    archiveMode: "aggressive" | "standard" | "preserve_player" | "keep_all";
    enableStyleDrift?: boolean;
  };

  /** First-Time User Experience tracking */
  ftue?: {
    isActive: boolean;
    bashoCompleted: number;
    suppressedEvents: string[];
  };

  /**
   * Ephemeral computed context for the current tick. Never written to save files.
   * Populated by phase02_context at the start of each pipeline run.
   */
  transientContext?: TransientContext;

  // Heya brand identities for kesho-mawashi generation
  heyaBrandIdentities?: IdMapRuntime<import("./keshoMawashi").HeyaBrandIdentity>;

  // Player-set custom kesho configs (Phase K)
  customKeshoConfigs?: Record<string, Partial<import("./keshoMawashi").KeshoMawashi>>;

  /** Pending exhibition tour invitations (WorldCircuitService) */
  pendingExhibitions?: PendingExhibition[];

  /** Bloodline trait registry (BloodlineService) */
  bloodlineRegistry?: BloodlineRegistry;

  planetRating?: number;
  isInitialSeed?: boolean;

  // Simulation tracking (AutoSimService)
  scandals?: Array<{ severity: string; year: number }>;
  retirements?: Array<{ rikishiId: string }>;
  eventLog?: Array<{ type: string; [key: string]: unknown }>;
  matchmakingOverride?: {
    type: "avoid_rival";
    requesterId: string;
  };

  // B6: Injured rikishi encouragement log
  encouragementLog?: Array<{ from: string; to: string; basho: string }>;
}

/** Pending exhibition tour invitation (WorldCircuitService). */
export interface PendingExhibition {
  id: string;
  heyaId: string;
  region: ExhibitionRegion;
  prestige: number;
  dominantStyle?: string;
  requiresRank?: Rank;
  expiresAtWeek: number;
}
