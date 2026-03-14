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

export interface SerializedBashoState {
  year: number;
  bashoNumber: 1 | 2 | 3 | 4 | 5 | 6;
  bashoName: BashoName;
  day: number;
  matches: MatchSchedule[];
  standings: StandingsTable;
}

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

export type SaveVersion = "1.0.0";
export const CURRENT_SAVE_VERSION: SaveVersion = "1.0.0";

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
