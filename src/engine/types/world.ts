/**
 * World State Types
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
import type { Sponsor, Koenkai } from "./sponsors";
import type { GovernanceRuling } from "./economy";
import type { MyosekiStock, MyosekiTransaction } from "./myoseki";
import type { AlmanacSnapshot } from "../almanac";
import type {
  EngineEventType,
  EventCategory,
  EventImportance,
  NarrativeContext,
} from "./events";
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

/** Type representing cycle phase. */
export type CyclePhase = "pre_basho" | "active_basho" | "post_basho" | "interim" | "banzuke_reveal";

// ── Pipeline: Transient Context ───────────────────────────────────────────────
// Computed once per week by phase02_context.ts. Never persisted to save files.

/** Pre-calculated modifier bundle derived by phase02_context each tick. */
export interface ActiveModifiers {
  /** Multiplier applied to all training gains. Derived from facility level + oyakata bonus. */
  trainingMultiplier: number;
  /** Multiplier applied to stamina recovery and injury healing. Derived from recovery facility + nutrition. */
  recoveryMultiplier: number;
  /** True when the heya's bank balance < 0. Halves effective trainingMultiplier. */
  financialPenalty: boolean;
  /** True when a rikishi won a basho in the last 4 weeks. Adds +0.15 to trainingMultiplier. */
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
  lastReport?: Record<string, unknown>;
  preGeneratedSchedules?: {
    day1: string[];
    day2: string[];
    announcedAtWeek: number;
  };
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

  _recruitmentWindow?: RecruitmentWindow;

  _postBashoMeta?: PostBashoMeta;

  rivalriesState?: RivalriesState;

  stableRelations?: Record<string, { tone: string }>;

  lastBoutResult?: BoutResult;

  /** Crisis waiting to be presented to player (checked on Dashboard load) */
  pendingCrisis?: ActiveCrisis;

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
    year?: number;
    month?: number;
    week?: number;
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
  pendingExhibitions?: Array<{
    id: string;
    region: string;
    prestige: number;
    [key: string]: unknown;
  }>;

  /** Bloodline trait registry (BloodlineService) */
  bloodlineRegistry?: BloodlineRegistry;

  planetRating?: number;
  isInitialSeed?: boolean;

  // Simulation tracking (AutoSimService)
  scandals?: Array<{ severity: string; year: number }>;
  retirements?: Array<{ rikishiId: string }>;
  eventLog?: Array<{ type: string; [key: string]: unknown }>;
  heyaRivalryPairs?: Record<string, number>;
  matchmakingOverride?: {
    type: "avoid_rival";
    requesterId: string;
  };
}
