/**
 * Heya (Stable) Types
 */

import type { Id } from "./common";
import type { StatureBand, PrestigeBand, FacilitiesBand, KoenkaiBandType, RunwayBand } from "./narrative";
import type { GovernanceStatus, GovernanceRuling, WelfareState, Loan, IchimonName } from "./economy";
import type { BeyaTrainingState } from "./training";
import type { HistoricalOyakata } from "./history";

/** Defines the structure for heya. */
export interface Heya {
  id: Id;
  name: string;
  nameJa?: string;
  oyakataId: Id;
  staffIds?: Id[];
  rikishiIds?: Id[];

  statureBand: StatureBand;
  prestigeBand: PrestigeBand;
  facilitiesBand: FacilitiesBand;
  koenkaiBand: KoenkaiBandType;
  runwayBand: RunwayBand;

  reputation: number;
  prestige: number;
  funds: number;

  activeLoans?: Loan[];

  scandalScore: number;
  governanceStatus: GovernanceStatus;
  governanceHistory?: GovernanceRuling[];

  welfareState?: WelfareState;

  facilities: {
    training: number;
    recovery: number;
    nutrition: number;
  };

  riskIndicators: {
    financial: boolean;
    governance: boolean;
    rivalry: boolean;
    welfare?: boolean;
  };

  trainingState?: BeyaTrainingState;

  descriptor?: string;
  isPlayerOwned?: boolean;
  ichimon?: IchimonName;
  politicalCapital?: number;
  location?: string;

  lineage: HistoricalOyakata[];
  historicalYusho: number;
}
