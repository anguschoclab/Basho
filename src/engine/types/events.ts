/**
 * Event Bus System Types (The Keystone System)
 */

import type { Id } from "./common";

/** Type representing event scope. */
export type EventScope = "world" | "heya" | "rikishi";
/** Type representing event phase. */
export type EngineEventType =
  | "BOUT_RESOLVED"
  | "RECRUIT_DISCOVERED"
  | "MONTHLY_FINANCE_REPORT"
  | "RIVALRY_HEAT_SPIKE"
  | "MEDICAL_REPORT"
  | "TRAINING_UPDATE"
  | "GOVERNANCE_RULING"
  | "FINANCIAL_ALERT"
  | "AWARD_CONFERRED"
  | "LIFECYCLE_EVENT"
  | "BASHO_STATUS"
  | "WELFARE_COMPLIANCE"
  | "OYAKATA_MOOD_SHIFT"
  | "NPC_MANAGER_DECISION"
  | "NARRATIVE_STRATEGY_SHIFT"
  | "FACILITY_UPGRADED"
  | "FACILITY_DEGRADED"
  | "ROSTER_OVERFLOW_RELEASE";

export type EventPhase = "weekly" | "monthly" | "basho_day" | "basho_wrap" | "manual";
/** Type representing event category. */
export type EventCategory =
  | "training"
  | "scouting"
  | "injury"
  | "economy"
  | "sponsor"
  | "media"
  | "rivalry"
  | "promotion"
  | "discipline"
  | "facility"
  | "milestone"
  | "match"
  | "basho"
  | "career"
  | "welfare"
  | "narrative"
  | "misc";

/** Type representing event importance. */
export type EventImportance = "minor" | "notable" | "major" | "headline";

/** Defines the structure for narrative context (A11 Narrative Contract). */
export interface NarrativeContext {
  shikona?: string;
  rival?: string;
  rank?: string;
  heya?: string;
  winner?: string;
  loser?: string;
  kimarite?: string;
  
  // Economy
  money?: number;   // Auto-formatted
  kensho?: number;  // Auto-formatted
  cost?: number;    // Auto-formatted
  revenue?: number;
  profit?: number;
  
  // Physics / Stats
  rate?: number;    // Auto-formatted %
  chance?: number;  // Auto-formatted %
  score?: number;
  delta?: number;
  intensity?: "high_stakes" | "technical" | "neutral" | number;
  
  // Domain Specific
  severity?: "minor" | "moderate" | "serious" | "critical";
  incident?: string;
  reason?: string;
  regimen?: string;
  status?: string;
  threshold?: number;
  heat?: number;
  day?: number;
  
  [key: string]: string | number | boolean | undefined | any;
}

/** Defines the structure for engine event. */
export interface EngineEvent {
  id: Id;
  type: EngineEventType;

  causalEventId?: Id;

  // Temporal
  year: number;
  week: number;
  month?: number;
  bashoNumber?: 1 | 2 | 3 | 4 | 5 | 6;
  day?: number;

  phase: EventPhase;
  category: EventCategory;
  importance: EventImportance;

  scope: EventScope;
  heyaId?: Id;
  rikishiId?: Id;

  // Content
  title: string;
  summary: string;

  // Data Payload
  data: NarrativeContext;

  truthLevel: "public" | "limited" | "private";
  tags?: string[];
}

/** Defines the structure for events state. */
export interface EventsState {
  version: "1.0.0";
  log: EngineEvent[];
  dedupe: Record<string, true>;
}
