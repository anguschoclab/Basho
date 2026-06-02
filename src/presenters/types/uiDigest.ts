/**
 * uiDigest.ts — UI Projection Return Types
 *
 * Central type definitions for all presenter projection functions.
 * These types bridge the gap between engine types and UI components.
 */

import type { BashoName, MatchSchedule, BoutResult } from "../../engine/types/basho";
import type { UIRikishi } from "../rikishiUI";
import type { RivalryPairState } from "../../engine/rivalries";
import type { Heya } from "../../engine/types/heya";
import type { Oyakata, OyakataTraits } from "../../engine/types/oyakata";
import type { HoFInductee } from "../../engine/hallOfFame";
import type { Division } from "../../engine/types/banzuke";
import type { EngineEvent } from "../../engine/types/events";
import type { UIRankRow } from "../banzukeUI";

// ── Heat Band Types ───────────────────────────────────────────────────────────

/** Heat band for rivalries — ordered from cold to inferno */
export type HeatBand = "cold" | "warm" | "hot" | "inferno";

// ── Basho UI Types ────────────────────────────────────────────────────────────

/** Enriched bout match with UI rikishi and rivalry data */
export interface BoutMatchUI extends MatchSchedule {
  eastRikishi: UIRikishi;
  westRikishi: UIRikishi;
  isPlayerBout: boolean;
  h2h: { wins: number; losses: number };
  rivalry: RivalryPairState | null;
  heatBand: HeatBand;
  h2hCommentary: string;
}

/** Standing entry for standings table */
export interface StandingEntry {
  rikishi: UIRikishi;
  wins: number;
  losses: number;
}

/** Complete digest for basho page */
export interface BashoUIDigest {
  bashoName: BashoName;
  year: number;
  day: number;
  matches: BoutMatchUI[];
  standings: StandingEntry[];
  playerRikishiIds: string[];
  completedBouts: number;
  totalBouts: number;
  dayProgress: number;
  isKeyDay: boolean;
  seasonalFlavor?: string;
}

// ── Heya UI Types ─────────────────────────────────────────────────────────────

/** Heya data with oyakata for ceremony components */
export interface HeyaDataUI {
  heya: Heya;
  oyakata: Oyakata | undefined;
  oyakataQuirks: string[];
  oyakataTraits: OyakataTraits | undefined;
}

// ── Hall of Fame UI Types ────────────────────────────────────────────────────

/** Greatest fight entry for HoF display */
export interface GreatestFight {
  bashoName: string;
  kimarite: string;
  opponentName: string;
  isWin: boolean;
}

/** Yusho entry for HoF display */
export interface YushoEntry {
  year: number;
  bashoName: BashoName;
}

/** Enriched HoF inductee with UI rikishi */
export interface HoFInducteeUI extends HoFInductee {
  rikishi: UIRikishi | null;
  heyaName: string;
  greatestFights: GreatestFight[];
  yushoList: YushoEntry[];
}

/** HoF digest for HallOfFamePage */
export interface HOFUIDigest {
  inductees: HoFInducteeUI[];
}

// ── Event UI Types ────────────────────────────────────────────────────────────

/** Event log data with lookup functions */
export interface EventLogData {
  events: EngineEvent[];
  getRikishi: (id: string) => UIRikishi | null;
  getHeya: (id: string) => Heya | undefined;
  rikishiMap: Map<string, { id: string; shikona: string }>;
  heyaMap: Map<string, { id: string; name: string }>;
  playerHeyaId: string | undefined;
}

/** Governance summary for display */
export interface GovernanceSummary {
  governanceLog: unknown[];
  year: number;
  heyasCount: number;
}

/** Division data for banzuke display */
export interface BanzukeDivisionData {
  division: Division;
  rows: UIRankRow[];
}

/** Complete banzuke digest */
export interface BanzukeUIDigest {
  year: number;
  basho: string | undefined;
  divisions: BanzukeDivisionData[];
  kadobanMap: Record<Id, number>;
  heyaNameMap: Map<Id, string>;
  hasPrevBasho: boolean;
}

// ── Dashboard UI Types ───────────────────────────────────────────────────────

/** Financial status for dashboard */
export interface FinancialStatus {
  balance: number;
  weeklyIncome: number;
  weeklyExpense: number;
  status: "stable" | "critical" | "normal";
}

/** Heya stats for dashboard */
export interface DashboardHeyaStats {
  rosterSize: number;
  sekitoriCount: number;
  injuredCount: number;
}

/** Complete dashboard digest */
export interface DashboardUIDigest {
  heya: {
    name: string;
    reputation: number;
    prestige: string;
    funds: number;
  };
  stats: DashboardHeyaStats;
  recentEvents: EngineEvent[];
  topRivals: Array<{
    id: Id;
    name: string;
    prestige: string;
    rosterSize: number;
  }>;
  finances: FinancialStatus;
  currentWeek: number;
  currentYear: number;
  phase: string;
}

// ── Economy UI Types ──────────────────────────────────────────────────────────

/** Loan projection for economy page */
export interface LoanProjection {
  loanCount: number;
  totalBalance: number;
  totalMonthlyPayment: number;
  isOverdue: boolean;
  overdueCount: number;
  loans: Array<{
    id: string;
    type: string;
    providerName: string;
    remainingBalance: number;
    monthlyPayment: number;
    interestRate: number;
  }>;
}

/** Merger warning entry */
export interface MergerWarning {
  heyaId: string;
  heyaName: string;
  funds: number;
  rosterSize: number;
  governanceStatus: string;
}

// ── Division Schedule Types ──────────────────────────────────────────────────

/** Division schedule configuration */
export interface DivisionScheduleConfig {
  division: Division;
  boutsPerDay?: number;
  maxActiveRikishi?: number;
}

/** Schedule rules */
export interface ScheduleRules {
  matchmaking?: Record<string, unknown>;
  allowForcedRepeats?: boolean;
}

// ── NPC AI Types ──────────────────────────────────────────────────────────────

/** Perception snapshot for NPC decision making */
export interface PerceptionSnapshot {
  rikishi: Array<{
    id: string;
    condition: number;
    fatigue: number;
    injured: boolean;
  }>;
  heya: {
    funds: number;
    reputation: number;
  };
  week: number;
}

// ── Bout Result Extensions ───────────────────────────────────────────────────

/** Extended bout result with narrative properties */
export interface EnrichedBoutResult extends BoutResult {
  isYushoRace?: boolean;
  isKinboshi?: boolean;
  isTitleStakes?: boolean;
}

// ── Recap Page Types ──────────────────────────────────────────────────────────

/** Intai (retirement) queue entry */
export interface IntaiEntry {
  rikishi: UIRikishi;
  reason: string;
}

/** Prestige change entry */
export interface PrestigeChange {
  heya: Heya;
  change: string;
}
