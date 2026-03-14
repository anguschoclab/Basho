/**
 * Event Bus System Types (The Keystone System)
 */

import type { Id } from "./common";

/** Type representing event scope. */
export type EventScope = "world" | "heya" | "rikishi";
/** Type representing event phase. */
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
