/**
 * World State Types
 */

import type { Id, IdMapRuntime } from "./common";
import type { EventsState } from "./events";
import type { BanzukeSnapshot } from "./banzuke";
import type { BashoName, BashoState, BashoResult } from "./basho";
import type { GovernanceRuling, IchimonName, Faction } from "./economy";
import type { FTUEState } from "./narrative";
import type { BeyaTrainingState } from "./training";
import type { Oyakata } from "./oyakata";
import type { Rikishi } from "./rikishi";
import type { Heya } from "./heya";
import type { TalentPoolWorldState } from "./talent";
import type { MyosekiMarket } from "./myoseki";
import type { WorldRecords } from "./records";

/** Type representing cycle phase. */
export type CyclePhase = "pre_basho" | "active_basho" | "post_basho" | "interim";

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
  metaBias: "oshi" | "yotsu" | "neutral";
  yushoStyle: string;
  recognitionEligibleWeek: number;
}

import type { LineageEdge } from "../lineage";
import type { HallOfFameState } from '../hallOfFame';
import type { HistoryIndex } from '../historyIndex';
import type { Staff } from './staff';
import type { SeededRNG } from '../rng';
import type { ScoutedRikishi } from '../scouting';
import type { AlmanacSnapshot } from '../almanac';
import type { OzekiKadobanMap } from '../banzuke';
import type { SponsorPool } from '../sponsors';
import type { MediaState } from './media';
import type { PerceptionSnapshot } from '../perception';
import type { RivalriesState } from '../rivalries';

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
  rng?: SeededRNG;

  heyas: IdMapRuntime<Heya>;

  rikishi: IdMapRuntime<Rikishi>;
  historicalRikishi: IdMapRuntime<Rikishi>;
  oyakata: IdMapRuntime<Oyakata>;

  currentBasho?: BashoState;
  history: BashoResult[];

  events: EventsState;
  playerKnowledge?: {
    scouting?: Record<string, ScoutedRikishi>;
  };


  governanceLog?: GovernanceRuling[];
  factions?: Record<IchimonName, Faction>;

  almanacSnapshots?: AlmanacSnapshot[];
  ftue: FTUEState;
  playerHeyaId?: Id;

  currentBanzuke?: BanzukeSnapshot;
  closedHeyas?: Map<Id, ClosedHeyaRecord>;


  ozekiKadoban?: OzekiKadobanMap;

  trainingState?: Record<Id, BeyaTrainingState>;

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

  calendar: {
    year: number;
    month: number;
    currentWeek: number;
    currentDay: number;
  };

  myosekiMarket?: MyosekiMarket;

  activeBasho?: {
    id: string;
  };

  records: WorldRecords;

  settings: {
    archiveMode: "aggressive" | "standard" | "preserve_player" | "keep_all";

  };

  bashoNumber?: number;
}

