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

import type { Id, IdMapRuntime } from "@/engine/types/common";
import type { EventsState } from "@/engine/types/events";
import type { BanzukeSnapshot } from "@/engine/types/banzuke";
import type { BashoName, BashoResult, AwardLogEntry, BoutResult } from "@/engine/types/basho";
import type { Rikishi } from "@/engine/types/rikishi";
import type { Heya } from "@/engine/types/heya";
import type { Oyakata } from "@/engine/types/oyakata";
import type { BashoState } from "@/engine/types/basho";
import type { Staff } from "@/engine/types/staff";
import type { HeyaTrainingState, SparringState } from "@/engine/types/training";
import type { GovernanceRuling, IchimonName, Faction } from "@/engine/types/economy";
import type { MyosekiMarket } from "@/engine/types/myoseki";
import type { Rank } from "@/engine/types/banzuke";
import type { ExhibitionRegion } from "@/engine/worldCircuit/WorldCircuitService";
import type { AlmanacSnapshot } from "@/engine/almanac/types";
import type { GlobalCupState, GlobalCupHistoryEntry } from "@/engine/types/globalCup";
import type { BloodlineRegistry } from "@/engine/types/dynasty";
import type { LineageEdge } from "@/engine/legacy/lineage";
import type { HallOfFameState } from "@/engine/history/hallOfFame";
import type { HistoryIndex } from "@/engine/history/historyIndex";
import type { RetiredRikishiSummary } from "@/engine/types/history";
import type { SeededRNG } from "@/engine/core/rng";
import type { ScoutedRikishi } from "@/engine/recruitment/ScoutingService";
import type { OzekiKadobanMap } from "@/engine/banzuke/ozekiLogic";
import type { SponsorPool } from "@/engine/types/sponsors";
import type { MediaState } from "@/engine/types/media";
import type { PerceptionSnapshot } from "@/engine/npc/perception";
import type { RivalriesState } from "@/constants/engine/rivalry";
import type { TutorialState } from "@/engine/types/tutorial";
import type { TalentPoolWorldState } from "@/engine/types/talent";
import type { ActiveCrisis } from "@/engine/types/crises";
import type { WorldRecords } from "@/engine/types/records";
import type { Gyoji, Shimpan } from "@/engine/types/gyoji";

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
  /** Stable-harmony training multiplier (P2). Defaults to 1 when absent. */
  harmonyMult?: number;
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

/**
 * One completed yearly meta assessment. `familyShares` is an internal signal —
 * managers only ever see the banded MetaPerception derived from this window.
 */
export interface MetaHistoryEntry {
  year: number;
  tone: "classic" | "explosive" | "technical" | "defensive";
  familyShares: Record<"push" | "belt" | "speed" | "trick", number>;
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
  /**
   * Retired rikishi. Entries may be either full Rikishi (between retirement
   * and year-end summarization, so the retirement ceremony UI has full data)
   * or compact RetiredRikishiSummary objects (after year-end summarization).
   * Use isRetiredRikishiSummary() to discriminate.
   */
  historicalRikishi: IdMapRuntime<Rikishi | RetiredRikishiSummary>;
  /** Set of active (non-retired) rikishi IDs for efficient iteration. */
  activeRikishiIds: Set<string>;
  oyakata: IdMapRuntime<Oyakata>;

  history: BashoResult[];
  /** Persistent cross-basho award log (yusho, sansho, bout of the basho). */
  awardLog?: AwardLogEntry[];
  /**
   * Global Meta State (Era Drift) (E4)
   * Tracks the current style tone of the era and individual technique drift.
   * `history` records completed yearly assessments (capped window) and is the
   * only meta signal managers are allowed to perceive — live stats are hidden.
   */
  meta: {
    tone: "classic" | "explosive" | "technical" | "defensive";
    drift: Record<string, number>;
    history?: MetaHistoryEntry[];
  };
  /** Cumulative count of techniques used in the world (for drift calculations).
   * Reset yearly by EraDriftService — this is the "current era" view. */
  globalKimariteStats: Record<string, number>;
  /** All-time cumulative count of techniques — never reset by era drift. */
  allTimeKimariteStats?: Record<string, number>;

  events: EventsState;
  playerKnowledge?: {
    scouting?: Record<string, ScoutedRikishi>;
    bookmarks?: BookmarkEntry[];
  };

  governanceLog?: GovernanceRuling[];
  factions?: Record<IchimonName, Faction>;

  /** WS5 — per-ichimon posture elected weekly by the faction leader heya. */
  factionPostures?: Partial<Record<IchimonName, import("@/engine/types/economy").FactionPosture>>;

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
  /** Standing recruitment bid policies written by weekly NPC AI (WS4). */
  npcBidPolicies?: Record<
    Id,
    {
      shouldBid: boolean;
      maxBid: number;
      bidStrategy: "aggressive" | "moderate" | "conservative";
      /**
       * Meta-adaptation lever (WS2): candidates whose dominant family matches
       * get their bid multiplied by (1 + weight).
       */
      familyBias?: { family: "push" | "belt" | "speed" | "trick"; weight: number };
    }
  >;

  /**
   * Per-NPC-heya basho posture (WS3) — written daily by phase01_basho_npc_tactics
   * during active_basho and consumed by chooseNpcSideTactic in the bout resolver.
   */
  bashoNpcPosture?: Record<Id, "conservative" | "standard" | "aggressive">;

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

  /**
   * Transient flag set by advanceOneDay's `suppressPhaseTransition` option —
   * while present, `checkPhaseTransition` cannot fire. Stripped from the
   * world before the tick returns; never persisted.
   */
  _suppressPhaseTransition?: boolean;

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

  /** Live event-chain instances (P1) — ids/indices only, re-derived from registry. */
  activeChains?: Record<Id, import("@/engine/events/chains/types").ActiveChain>;
  /** chainId → last-completed week (cooldown bookkeeping for event chains). */
  chainCooldowns?: Record<string, number>;

  /** Active scout missions dispatched to talent pools (P4). */
  activeScoutMissions?: import("@/engine/recruitment/scoutMissions").ScoutMission[];

  /** Monthly-refreshed pool of staff candidates (P2). */
  staffCandidatePool?: import("@/engine/types/staff").StaffCandidate[];

  /** Player loop decisions that block progress until resolved */
  pendingDecisions?: Array<{
    id: string;
    type: string;
    description: string;
    deadlineWeek: number;
    options: Array<{ id: string; label: string; impact: string }>;
    required: boolean;
  }>;

  /**
   * WS4 — live rikishi requests awaiting resolution. Player-heya requests
   * surface as `rikishi_request` pendingDecisions; NPC requests resolve in
   * the weekly NPC phase.
   */
  pendingRikishiRequests?: import("@/engine/npc/agency/types").RikishiRequest[];

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

  _preBashoAssessment?: PreBashoAssessment;

  myosekiMarket?: MyosekiMarket;

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
  heyaBrandIdentities?: IdMapRuntime<import("@/engine/types/keshoMawashi").HeyaBrandIdentity>;

  // Player-set custom kesho configs (Phase K)
  customKeshoConfigs?: Record<string, Partial<import("@/engine/types/keshoMawashi").KeshoMawashi>>;

  /** Pending exhibition tour invitations (WorldCircuitService) */
  pendingExhibitions?: PendingExhibition[];

  /** Bloodline trait registry (BloodlineService) */
  bloodlineRegistry?: BloodlineRegistry;

  planetRating?: number;
  isInitialSeed?: boolean;

  matchmakingOverride?: {
    type: "avoid_rival";
    requesterId: string;
  };

  // B6: Injured rikishi encouragement log
  encouragementLog?: Array<{ from: string; to: string; basho: string }>;

  // Officials: gyoji and shimpan pools for bout officiation
  gyojiPool?: Gyoji[];
  shimpanPool?: Shimpan[];
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
