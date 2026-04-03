/**
 * Event Bus System Types (The Keystone System)
 */

import type { Id } from "./common";

/** Type representing event scope. */
export type EventScope = "world" | "heya" | "rikishi";
/** Type representing event phase. */
export type EngineEventType =
  | "BASHO_DAY_ADVANCED"
  | "BASHO_ENDED"
  | "BASHO_STARTED"
  | "BOUT_RESULT"
  | "FINANCIAL_ALERT"
  | "GOVERNANCE_RULING"
  | "INJURY_OCCURRED"
  | "INJURY_RECOVERED"
  | "KENSHO_AWARDED"
  | "RETIREMENT"
  | "RIVALRY_ESCALATED"
  | "RIVALRY_FORMED"
  | "ROOKIE_DEBUT"
  | "SCOUTING_INVESTMENT_CHANGED"
  | "SPECIAL_PRIZES_AWARDED"
  | "TRAINING_MILESTONE"
  | "TRAINING_PROFILE_CHANGED"
  | "WELFARE_ALERT";

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

/** Defines the structure for engine event. */
export interface EngineEvent {
  id: Id;
  type: string;

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
  data: Record<string, string | number | boolean | null | undefined>;

  truthLevel: "public" | "limited" | "private";
  tags?: string[];
}

/** Defines the structure for events state. */
export interface EventsState {
  version: "1.0.0";
  log: EngineEvent[];
  dedupe: Record<string, true>;
}
