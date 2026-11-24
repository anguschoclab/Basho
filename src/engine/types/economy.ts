/**
 * Economics & Governance Types
 */

import type { Id } from "@/engine/types/common";

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
export type GovernanceStatus =
  | "good_standing"
  | "warning"
  | "probation"
  | "sanctioned"
  /** WS-5 — disciplinary custody: stable closed, roster under a host heya. */
  | "suspended";

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
  /** NPC actor's choice when an NPC heya resolved this ruling/event */
  actorChoice?: string;
  /** Heya ID of the NPC actor that resolved this ruling/event */
  actorId?: string;
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

/**
 * One elected JSA riji (理事) seat — the stablemaster carrying it. */
export interface JsaBoardDirector {
  /** The seated master. */
  oyakataId: Id;
  /** The stable whose caucus slot he won. */
  heyaId: Id;
  /** His clan — the slate he was elected through. */
  ichimon?: IchimonName;
  /** Internal board pick, not the top slate score — see elections.ts. */
  isChairman: boolean;
}
/**
 * The elected JSA board (riji). Persisted on world.jsaBoard after each
 * biennial clan-quota election — one entry per seat plus the cosmetic
 * external directors the real board also seats.
 */
export interface JsaBoard {
  directors: JsaBoardDirector[];
  /** Non-elected seats for outside academics/luminaries (cosmetic). */
  externalSeats: number;
  /** Seats won per clan this cycle ("unaffiliated" for clanless stables). */
  clanSeats: Record<string, number>;
  /** Basho-year of the election that seated this board. */
  electedYear: number;
}

/** Defines the structure for a faction (Ichimon). */
export interface Faction {
  id: IchimonName;
  name: string;
  influence: number;
  oyakataLeaderId: string | null;
}

/**
 * WS5 — a league-visible posture elected by an ichimon's leader heya.
 * "coordinated_pressure" targets the strongest non-member heya (can be the
 * player's); members get a bounded plan-alignment bonus toward it.
 */
export interface FactionPosture {
  posture: "expansionist" | "consolidating" | "coordinated_pressure";
  /** For coordinated_pressure: the heya being squeezed. */
  targetHeyaId?: Id;
  setWeek: number;
}
