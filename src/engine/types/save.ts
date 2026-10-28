/**
 * JSON-Safe Serialized & Save Format Types
 */

import type { Id, IdMap } from "@/engine/types/common";
import type { EventsState } from "@/engine/types/events";
import type { BanzukeSnapshot } from "@/engine/types/banzuke";
import type { BashoName, MatchSchedule, StandingsTable } from "@/engine/types/basho";
import type { Oyakata } from "@/engine/types/oyakata";
import type { Rikishi } from "@/engine/types/rikishi";
import type { Heya } from "@/engine/types/heya";
import type { TalentPoolWorldState } from "@/engine/types/talent";
import type { CyclePhase, WorldState } from "@/engine/types/world";
import type { BashoResult } from "@/engine/types/basho";
import type { Sponsor, Koenkai } from "@/engine/types/sponsors";
import type { ClosedHeyaRecord, PreBashoAssessment } from "@/engine/types/world";
import type { Staff } from "@/engine/types/staff";
import type { HistoryIndex } from "@/engine/history/historyIndex";
import type { RetiredRikishiSummary } from "@/engine/types/history";
import type { LineageEdge } from "@/engine/legacy/lineage";
import type { WorldRecords } from "@/engine/types/records";
import type { HallOfFameState } from "@/engine/history/hallOfFame";
import type { RivalriesState } from "@/constants/engine/rivalry";
import type { MyosekiMarket } from "@/engine/types/myoseki";
import type { OzekiKadobanMap } from "@/engine/banzuke/ozekiLogic";
import type { MediaState } from "@/engine/types/media";
import type { AlmanacSnapshot } from "@/engine/almanac/types";
import type { HeyaTrainingState } from "@/engine/types/training";

/** Element type of PreBashoAssessment.rikishiAssessments. */
export type RikishiAssessmentEntry =
  PreBashoAssessment["rikishiAssessments"] extends Map<string, infer V> ? V : never;

/**
 * Serialized PreBashoAssessment — rikishiAssessments is stored as a record
 * (explicit mapToObject) or a Map (collection-codec reviver restores it).
 */
export type SerializedPreBashoAssessment = Omit<PreBashoAssessment, "rikishiAssessments"> & {
  rikishiAssessments: Map<string, RikishiAssessmentEntry> | Record<string, RikishiAssessmentEntry>;
};

/** Serialized form of sponsor pool for JSON storage. */
export interface SerializedSponsorPool {
  sponsors: Record<string, Sponsor>;
  koenkais: Record<string, Koenkai>;
}

/** Defines the structure for serialized basho state. */
export interface SerializedBashoState {
  year: number;
  bashoNumber: 1 | 2 | 3 | 4 | 5 | 6;
  bashoName: BashoName;
  day: number;
  matches: MatchSchedule[];
  standings: StandingsTable;
  /** Per-basho kinboshi tally (rikishiId → stars earned); survives save/load. */
  kinboshiThisBasho?: Record<Id, number>;
}

/** Defines the structure for serialized world state. */
export interface SerializedWorldState {
  seed: string;
  year: number;
  week: number;
  cyclePhase: CyclePhase;
  currentBashoName?: BashoName;

  heyas: IdMap<Heya>;
  closedHeyas: IdMap<ClosedHeyaRecord>;
  rikishi: IdMap<Rikishi>;
  historicalRikishi: IdMap<Rikishi | RetiredRikishiSummary>;
  /** Array of active (non-retired) rikishi IDs for efficient iteration. */
  activeRikishiIds: string[];
  oyakata: IdMap<Oyakata>;
  staff: IdMap<Staff>;

  currentBasho?: SerializedBashoState;
  history: BashoResult[];
  historyIndex?: HistoryIndex;

  lineage: LineageEdge[];
  records: WorldRecords;
  hallOfFame?: HallOfFameState;

  events: EventsState;
  rivalriesState?: RivalriesState;
  myosekiMarket?: MyosekiMarket;

  playerHeyaId?: Id;

  currentBanzuke?: BanzukeSnapshot;
  ozekiKadoban?: OzekiKadobanMap;

  talentPool?: TalentPoolWorldState;
  sponsorPool?: SerializedSponsorPool;
  mediaState?: MediaState;

  dayIndexGlobal: number;
  almanacSnapshots: AlmanacSnapshot[];

  /** First-Time User Experience tracking */
  ftue?: {
    isActive: boolean;
    bashoCompleted: number;
    suppressedEvents: string[];
  };

  settings: {
    archiveMode: "aggressive" | "standard" | "preserve_player" | "keep_all";
  };
  trainingState?: Record<Id, HeyaTrainingState>;
  candidatePool?: TalentPoolWorldState; // Talent acquisition pool

  /** Global Cup tournament state (Phase 5+) */
  globalCup?: import("@/engine/types/globalCup").GlobalCupState;
  /** Chronicle records (Phase 5+) */
  chronicle?: WorldState["chronicle"];

  // ── Calendar & phase counters ───────────────────────────────────────────
  // Without these the tick pipeline restarts mid-cycle on load: phase00_preflight
  // falls back to its own defaults and the weekly gate fires immediately.
  calendar?: WorldState["calendar"];
  _interimDaysRemaining?: number;
  _postBashoDays?: number;
  _daysSinceLastWeeklyTick?: number;

  // ── Era drift & meta ────────────────────────────────────────────────────
  meta?: WorldState["meta"];
  globalKimariteStats?: Record<string, number>;
  allTimeKimariteStats?: Record<string, number>;

  // ── Player-owned state ──────────────────────────────────────────────────
  playerKnowledge?: WorldState["playerKnowledge"];
  tutorialState?: WorldState["tutorialState"];
  boutTactics?: Record<string, string>;

  // ── Institutional / governance ──────────────────────────────────────────
  governanceLog?: WorldState["governanceLog"];
  factions?: WorldState["factions"];
  gyojiPool?: WorldState["gyojiPool"];
  shimpanPool?: WorldState["shimpanPool"];

  // ── Long-horizon career state ───────────────────────────────────────────
  awardLog?: WorldState["awardLog"];
  bloodlineRegistry?: WorldState["bloodlineRegistry"];
  yokozunaVacancyStreak?: number;
  planetRating?: number;

  // ── Relationships & assignments ─────────────────────────────────────────
  /** Runtime Map — stored as a record, rehydrated by objectToMap. */
  sparringPairs?: IdMap<import("@/engine/types/training").SparringState>;
  /** Runtime Map — stored as a record, rehydrated by objectToMap. */
  heyaBrandIdentities?: IdMap<import("@/engine/types/keshoMawashi").HeyaBrandIdentity>;
  customKeshoConfigs?: WorldState["customKeshoConfigs"];
  encouragementLog?: WorldState["encouragementLog"];

  // ── Pending / in-flight state ───────────────────────────────────────────
  pendingCrisis?: WorldState["pendingCrisis"];
  pendingDecisions?: WorldState["pendingDecisions"];
  pendingRikishiRequests?: WorldState["pendingRikishiRequests"];
  pendingExhibitions?: WorldState["pendingExhibitions"];
  matchmakingOverride?: WorldState["matchmakingOverride"];
  lastBoutResult?: WorldState["lastBoutResult"];

  // ── NPC & scheduling internals ──────────────────────────────────────────
  npcScoutingPriorities?: WorldState["npcScoutingPriorities"];
  npcBidPolicies?: WorldState["npcBidPolicies"];
  bashoNpcPosture?: WorldState["bashoNpcPosture"];
  factionPostures?: WorldState["factionPostures"];
  _populationTarget?: number;
  _recruitmentWindow?: WorldState["_recruitmentWindow"];
  _postBashoMeta?: WorldState["_postBashoMeta"];
  _preBashoAssessment?: SerializedPreBashoAssessment;
  isInitialSeed?: boolean;
}

/**
 * WorldState fields deliberately NOT persisted, with the reason.
 * `saveLoadIntegrity.test.ts` asserts that every WorldState key is either
 * present in SerializedWorldState or listed here — so adding a new field to
 * WorldState fails the suite until an explicit persist-or-exclude decision
 * is made.
 */
export const NON_PERSISTED_WORLD_FIELDS: Record<string, string> = {
  id: "Regenerated deterministically as `world_${seed}` on load.",
  rng: "Stateless — rngForWorld derives from world.seed on every call.",
  transientContext: "Ephemeral tick context; rebuilt by phase02_context on load.",
  perceptionCache: "Derived cache; repopulated on demand.",
  selectedRikishiId: "UI selection, not simulation state.",
  _autonomousSim: "Run-mode flag for autonomous sims; never part of a player save.",
  _suppressPhaseTransition:
    "Transient advance opt; set and stripped within a single tick by advanceOneDay.",
  _autonomousPolicy: "Run-mode policy for autonomous sims; never part of a player save.",
};

/**
 * Type representing save version.
 * When adding a new version: add the literal here, add it to KNOWN_SAVE_VERSIONS,
 * bump CURRENT_SAVE_VERSION, and register a migration step in MigrationService.
 */
export type SaveVersion = "1.0.0" | "1.1.0" | "1.2.0" | "1.3.0" | "1.4.0";

/** All recognized save versions (oldest first). Used by SaveSlotService and MigrationService. */
export const KNOWN_SAVE_VERSIONS: readonly SaveVersion[] = [
  "1.0.0",
  "1.1.0",
  "1.2.0",
  "1.3.0",
  "1.4.0",
] as const;

/** The version new saves are written with. */
export const CURRENT_SAVE_VERSION: SaveVersion = "1.4.0";

/** Defines the structure for save game. */
export interface SaveGame {
  version: SaveVersion;
  createdAtISO: string;
  lastSavedAtISO: string;

  ruleset: {
    banzukeAlgorithm: "slot_fill_v1";
    kimariteRegistryVersion: string;
  };

  world: SerializedWorldState;

  saveSlotName?: string;
  playTimeMinutes?: number;
}
