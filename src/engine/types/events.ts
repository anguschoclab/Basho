/**
 * Event Bus System Types (The Keystone System)
 */

import type { Id } from "./common";

export type EventScope = "world" | "heya" | "rikishi";
export type EventPhase = "weekly" | "monthly" | "basho_day" | "basho_wrap" | "manual";
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

export type EventImportance = "minor" | "notable" | "major" | "headline";

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

export interface EventsState {
  version: "1.0.0";
  log: EngineEvent[];
  dedupe: Record<string, true>;
}
