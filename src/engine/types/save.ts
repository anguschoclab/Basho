/**
 * JSON-Safe Serialized & Save Format Types
 */

import type { Id, IdMap } from "./common";
import type { EventsState } from "./events";
import type { BanzukeSnapshot } from "./banzuke";
import type { BashoName, MatchSchedule, StandingsTable } from "./basho";
import type { FTUEState } from "./narrative";
import type { Oyakata } from "./oyakata";
import type { Rikishi } from "./rikishi";
import type { Heya } from "./heya";
import type { TalentPoolWorldState } from "./talent";
import type { CyclePhase } from "./world";
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

  /** @deprecated Legacy field for first basho event suppression. TutorialState handles onboarding steps - different purpose. Retained for save compatibility. */
  ftue?: FTUEState;
  playerHeyaId?: Id;

  currentBanzuke?: BanzukeSnapshot;
  ozekiKadoban?: OzekiKadobanMap;

  talentPool?: TalentPoolWorldState;
  sponsorPool?: SerializedSponsorPoolFixed;
  mediaState?: MediaState;

  dayIndexGlobal: number;
  almanacSnapshots: AlmanacSnapshot[];

  settings: {
    archiveMode: "aggressive" | "standard" | "preserve_player" | "keep_all";
  };
  trainingState?: Record<Id, HeyaTrainingState>;
  candidatePool?: TalentPoolWorldState; // Talent acquisition pool
}

/** Type representing save version. */
export type SaveVersion = "1.0.0";
/** c u r r e n t_ s a v e_ v e r s i o n. */
export const CURRENT_SAVE_VERSION: SaveVersion = "1.0.0";

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
