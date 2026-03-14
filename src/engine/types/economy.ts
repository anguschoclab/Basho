/**
 * Economics & Governance Types
 */

import type { Id } from "./common";
import type { BashoName } from "./basho";

export interface KenshoRecord {
  bashoName: BashoName;
  day: number;
  opponentId: Id;
  kenshoCount: number;
  amount: number;
}

export interface RikishiEconomics {
  cash: number;
  retirementFund: number;
  careerKenshoWon: number;
  kinboshiCount: number;
  totalEarnings: number;
  currentBashoEarnings: number;
  popularity: number;
}

// Governance Types
export type GovernanceStatus = "good_standing" | "warning" | "probation" | "sanctioned";

// Welfare / Compliance (Institutional)
export type ComplianceState = "compliant" | "watch" | "investigation" | "sanctioned";

export interface WelfareState {
  /** 0..100: Higher is worse */
  welfareRisk: number;
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
}

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
}
