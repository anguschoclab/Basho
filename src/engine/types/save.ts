/**
 * JSON-Safe Serialized & Save Format Types
 */

import type { Id, IdMap } from "./common";
import type { EventsState } from "./events";
import type { BanzukeSnapshot } from "./banzuke";
import type { BashoName, MatchSchedule, StandingsTable } from "./basho";
import type { Oyakata } from "./oyakata";
import type { Rikishi } from "./rikishi";
import type { Heya } from "./heya";
import type { TalentPoolWorldState } from "./talent";
import type { CyclePhase, WorldState } from "./world";
import type { BashoResult } from "./basho";
import type { Sponsor, Koenkai } from "./sponsors";
import type { ClosedHeyaRecord } from "./world";
import type { Staff } from "./staff";
import type { HistoryIndex } from "../historyIndex";
import type { LineageEdge } from "../lineage";
import type { WorldRecords } from "./records";
import type { HallOfFameState } from "../hallOfFame";
import type { RivalriesState } from "../rivalries";
import type { MyosekiMarket } from "./myoseki";
import type { OzekiKadobanMap } from "../banzuke";
import type { MediaState } from "./media";
import type { AlmanacSnapshot } from "../almanac";
import type { HeyaTrainingState } from "./training";

/** Serialized form of sponsor pool for JSON storage. */
export interface SerializedSponsorPool {
  sponsors: Record<string, Rikishi>; // Note: This should likely be Sponsor, but keeping it broad for now or importing Sponsor
  koenkais: Record<string, Koenkai>;
}

// Fixed version with correct internal imports
export interface SerializedSponsorPoolFixed {
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
  historicalRikishi: IdMap<Rikishi>;
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
  sponsorPool?: SerializedSponsorPoolFixed;
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
  globalCup?: import("./globalCup").GlobalCupState;
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

  // ── Player-owned state ──────────────────────────────────────────────────
  playerKnowledge?: WorldState["playerKnowledge"];
  tutorialState?: WorldState["tutorialState"];
  boutTactics?: Record<string, string>;

  // ── Institutional / governance ──────────────────────────────────────────
  governanceLog?: WorldState["governanceLog"];
  factions?: WorldState["factions"];
  scandals?: WorldState["scandals"];
  gyojiPool?: WorldState["gyojiPool"];
  shimpanPool?: WorldState["shimpanPool"];

  // ── Long-horizon career state ───────────────────────────────────────────
  awardLog?: WorldState["awardLog"];
  retirements?: WorldState["retirements"];
  bloodlineRegistry?: WorldState["bloodlineRegistry"];
  yokozunaVacancyStreak?: number;
  planetRating?: number;

  // ── Relationships & assignments ─────────────────────────────────────────
  /** Runtime Map — stored as a record, rehydrated by objectToMap. */
  sparringPairs?: IdMap<import("./training").SparringState>;
  /** Runtime Map — stored as a record, rehydrated by objectToMap. */
  heyaBrandIdentities?: IdMap<import("./keshoMawashi").HeyaBrandIdentity>;
  customKeshoConfigs?: WorldState["customKeshoConfigs"];
  encouragementLog?: WorldState["encouragementLog"];

  // ── Pending / in-flight state ───────────────────────────────────────────
  pendingCrisis?: WorldState["pendingCrisis"];
  pendingDecisions?: WorldState["pendingDecisions"];
  pendingExhibitions?: WorldState["pendingExhibitions"];
  matchmakingOverride?: WorldState["matchmakingOverride"];
  activeBasho?: WorldState["activeBasho"];
  lastBoutResult?: WorldState["lastBoutResult"];
  eventLog?: WorldState["eventLog"];

  // ── NPC & scheduling internals ──────────────────────────────────────────
  npcScoutingPriorities?: WorldState["npcScoutingPriorities"];
  _populationTarget?: number;
  _recruitmentWindow?: WorldState["_recruitmentWindow"];
  _postBashoMeta?: WorldState["_postBashoMeta"];
  _preBashoAssessment?: WorldState["_preBashoAssessment"];
  _preGeneratedSchedules?: WorldState["_preGeneratedSchedules"];
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
  _autonomousPolicy: "Run-mode policy for autonomous sims; never part of a player save.",
};

/**
 * Type representing save version.
 * When adding a new version: add the literal here, add it to KNOWN_SAVE_VERSIONS,
 * bump CURRENT_SAVE_VERSION, and register a migration step in MigrationService.
 */
export type SaveVersion = "1.0.0" | "1.1.0" | "1.2.0";

/** All recognized save versions (oldest first). Used by SaveSlotService and MigrationService. */
export const KNOWN_SAVE_VERSIONS: readonly SaveVersion[] = ["1.0.0", "1.1.0", "1.2.0"] as const;

/** The version new saves are written with. */
export const CURRENT_SAVE_VERSION: SaveVersion = "1.2.0";

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
