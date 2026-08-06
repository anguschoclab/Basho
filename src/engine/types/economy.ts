/**
 * Economics & Governance Types
 */

/** Defines the structure for rikishi economics. */
export interface RikishiEconomics {
  cash: number;
  retirementFund: number;
  careerKenshoWon: number;
  kinboshiCount: number;
  totalEarnings: number;
  currentBashoEarnings: number;
  popularity: number;
  mochikyukinLastPayoutMonth?: number; // Track last payout month for cadence
}

// Governance Types
/** Type representing governance status. */
export type GovernanceStatus = "good_standing" | "warning" | "probation" | "sanctioned";

// Welfare / Compliance (Institutional)
/** Type representing compliance state. */
export type ComplianceState = "compliant" | "watch" | "investigation" | "sanctioned";

/** Type representing diet regimen. */
export type DietRegimen = "austerity" | "maintenance" | "heavy_bulk" | "premium";

/** Defines the structure for welfare state. */
export interface WelfareState {
  /** 0..100: Higher is worse */
  welfareRisk: number;
  activeDiet: DietRegimen;
  complianceState: ComplianceState;
  /** Weeks spent in current complianceState */
  weeksInState: number;
  /** Investigation metadata (if any) */
  investigation?: {
    openedWeek: number;
    severity: "low" | "medium" | "high";
    triggers: string[];
    /** 0..100: how close they are to clearing the investigation */
    progress: number;
  };
  /** Active sanctions affecting operations */
  sanctions?: {
    recruitmentFreezeWeeks?: number;
    trainingIntensityCap?: "low" | "medium" | "high";
    fineYen?: number;
    note?: string;
  };
  lastReviewedWeek?: number;
  morale?: number;
}

/** Defines the structure for governance ruling. */
export interface GovernanceRuling {
  id: string;
  date: string;
  heyaId: string;
  type: "fine" | "suspension" | "warning" | "closure";
  severity: "low" | "medium" | "high" | "terminal";
  reason: string;
  effects: {
    fineAmount?: number;
    prestigePenalty?: number;
    scandalScoreDelta?: number;
  };
  /** Player's choice when responding to this ruling/event */
  playerChoice?: string;
  /** Player's custom response text */
  playerResponse?: string;
  /** Severity chosen by player when issuing a ruling */
  playerSeverity?: "lenient" | "standard" | "harsh";
  /** Event classification for filtering */
  incident?: string;
  /** Additional structured data for this ruling */
  data?: Record<string, unknown>;
}

/** Type representing loan type. */
export type LoanType = "emergency" | "supporter" | "benefactor";

/** Defines the structure for loan. */
export interface Loan {
  id: string;
  type: LoanType;
  principal: number;
  interestRate: number; // e.g. 0.05 for 5%
  remainingBalance: number;
  providerName: string;
  monthlyPayment: number;
  issuedAtYear: number;
  issuedAtMonth: number;
  stringsAttached?: string[];
}

// Faction & Politics Types
/** Type representing the 5 historical Ichimons. */
export type IchimonName = "Dewanoumi" | "Nishonoseki" | "Takasago" | "Tokitsukaze" | "Isegahama";

/** Defines the structure for a faction (Ichimon). */
export interface Faction {
  id: IchimonName;
  name: string;
  influence: number;
  oyakataLeaderId: string | null;
}
