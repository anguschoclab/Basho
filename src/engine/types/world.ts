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

/** Defines the structure for world state. */
import type { LineageEdge } from "../lineage";

export interface WorldState {
  hallOfFame?: import("../hallOfFame").HallOfFameState;
  historyIndex?: any;
  banzuke?: any;
  staff: IdMapRuntime<import("./staff").Staff>;
  lineage?: LineageEdge[];
  id: string;
  seed: string;
  year: number;
  week: number;
  dayIndexGlobal: number;
  cyclePhase: CyclePhase;

  currentBashoName?: BashoName;

  heyas: IdMapRuntime<Heya>;
  rikishi: IdMapRuntime<Rikishi>;
  oyakata: IdMapRuntime<Oyakata>;

  currentBasho?: BashoState;
  history: BashoResult[];

  events: EventsState;

  governanceLog?: GovernanceRuling[];
  factions?: Record<IchimonName, Faction>;

  almanacSnapshots?: import("../almanac").AlmanacSnapshot[];
  ftue: FTUEState;
  playerHeyaId?: Id;

  currentBanzuke?: BanzukeSnapshot;
  closedHeyas?: Map<string, any>;

  ozekiKadoban?: import("../banzuke").OzekiKadobanMap;

  trainingState?: Record<Id, BeyaTrainingState>;

  talentPool?: TalentPoolWorldState;

  sponsorPool?: import("../sponsors").SponsorPool;

  mediaState?: import("../media").MediaState;

  perceptionCache?: Record<Id, import("../perception").PerceptionSnapshot>;

  npcScoutingPriorities?: Record<Id, "none" | "passive" | "active" | "aggressive">;

  _interimDaysRemaining?: number;
  _postBashoDays?: number;

  _recruitmentWindow?: RecruitmentWindow;

  _postBashoMeta?: PostBashoMeta;

  rivalriesState?: import("../rivalries").RivalriesState;

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
}
