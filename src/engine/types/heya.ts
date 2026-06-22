/**
 * Heya (Stable) Types
 */

import type { Id } from "./common";
import type {
  StatureBand,
  PrestigeBand,
  FacilitiesBand,
  KoenkaiBandType,
  RunwayBand,
} from "./narrative";
import type {
  GovernanceStatus,
  GovernanceRuling,
  WelfareState,
  Loan,
  IchimonName,
} from "./economy";
import type { HeyaTrainingState } from "./training";
import type { HistoricalOyakata } from "./history";
import type { ActiveCrisis } from "./crises";
import type { InfrastructureState } from "./infrastructure";
import type { DynastyRecord, TrainingPhilosophy } from "./dynasty";

/** Defines the structure for heya. */
export interface Heya {
  id: Id;
  name: string;
  nameJa?: string;
  oyakataId: Id;
  brandIdentityId?: Id; // Reference to HeyaBrandIdentity
  koenkaiId?: Id;
  staffIds?: Id[];
  rikishiIds?: Id[];

  /** P2: Discrete stable infrastructure */
  infrastructure?: Record<string, InfrastructureState>;
  constructionQueue?: Array<{
    facilityId: string;
    completionYear: number;
    completionBasho: string;
    level: number;
  }>;

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

  trainingState?: HeyaTrainingState;

  activeCrisis?: ActiveCrisis;

  descriptor?: string;
  isPlayerOwned?: boolean;
  ichimon?: IchimonName;
  politicalCapital?: number;
  location?: string;

  lineage: HistoricalOyakata[];
  historicalYusho: number;

  /**
   * Signature shikona prefix for the stable — most wrestlers inherit this
   * (stronger at junior ranks). E.g. "Chiyo" for Kokonoe, "Koto" for Sadogatake.
   */
  shikonaPrefix?: string;

  /** Financial ledger for tracking transactions like prize money, loans, etc. */
  ledger?: Array<{
    amount: number;
    description: string;
    category: string;
    date?: { year: number; month: number; week?: number };
  }>;

  /** Total travel allowance paid to sekitori (makuuchi/juryo) this month */
  travelAllowanceTotal?: number;

  /** Total mochikyukin (career prize money) for all heya rikishi */
  mochikyukinTotal?: number;

  /** Phase 5: Legacy & Dynasty */
  dynasty?: DynastyRecord[];
  trainingPhilosophy?: TrainingPhilosophy;
  legacyTier?: "emerging" | "established" | "dynasty" | "legend";
  regionalPresence?: Record<string, number>;

  /** Consecutive basho of underperformance (no sekitori kachi-koshi). Used for non-financial merger. */
  consecutiveUnderperformanceBasho?: number;
}
