/**
 * Heya (Stable) Types
 */

import type { Id } from "./common";
import type { StatureBand, PrestigeBand, FacilitiesBand, KoenkaiBandType, RunwayBand } from "./narrative";
import type { GovernanceStatus, GovernanceRuling, WelfareState } from "./economy";
import type { BeyaTrainingState } from "./training";

export interface Heya {
  id: Id;
  name: string;
  nameJa?: string;
  oyakataId: Id;
  rikishiIds: Id[];

  statureBand: StatureBand;
  prestigeBand: PrestigeBand;
  facilitiesBand: FacilitiesBand;
  koenkaiBand: KoenkaiBandType;
  runwayBand: RunwayBand;

  reputation: number;
  funds: number;

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
  location?: string;
}
