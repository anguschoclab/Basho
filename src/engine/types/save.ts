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
  rikishi: IdMap<Rikishi>;
  oyakata: IdMap<Oyakata>;

  currentBasho?: SerializedBashoState;
  history: BashoResult[];

  events: EventsState;

  ftue: FTUEState;
  playerHeyaId?: Id;

  currentBanzuke?: BanzukeSnapshot;
  ozekiKadoban?: import("../banzuke").OzekiKadobanMap;

  talentPool?: TalentPoolWorldState;
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
