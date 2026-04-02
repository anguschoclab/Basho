/**
 * src/engine/systems/narrative/RivalryConstants.ts
 * ================================================
 * Authoritative constants for the Rivalry System.
 * 
 * Defines tones, triggers, and heat bands for rikishi relationships.
 * Goal: Domain-driven narrative design.
 */

import type { Id } from "../../types/common";

export type RivalryTone =
  | "respect"
  | "grudge"
  | "bad_blood"
  | "mentor_student"
  | "unstable"
  | "public_hype";

export type RivalryTrigger =
  | "repeat_matches"
  | "close_finish"
  | "upset"
  | "kinboshi"
  | "title_stakes"
  | "injury_incident"
  | "personal_history"
  | "heya_feud";

/** 
 * Pair key must be canonical: smallerId|largerId 
 */
export type RivalryKey = string;

export const RIVALRY_TRIGGER_LABELS: Record<RivalryTrigger, string> = {
  repeat_matches: "Repeat Meetings",
  close_finish: "Down to the Wire",
  upset: "Shock Upset",
  kinboshi: "Giant Killing",
  title_stakes: "Title Pressure",
  injury_incident: "Near Injury",
  personal_history: "Old History",
  heya_feud: "Stable Feud"
};

export const RIVALRY_TONE_LABELS: Record<RivalryTone, string> = {
  respect: "Mutual Respect",
  grudge: "Deep Grudge",
  bad_blood: "Bad Blood",
  mentor_student: "Mentor & Student",
  unstable: "Volatile",
  public_hype: "Public Hype"
};

/** Defines the structure for rivalry pair state. */
export interface RivalryPairState {
  key: RivalryKey;
  aId: Id;
  bId: Id;
  heat: number;
  meetings: number;
  lastMetWeek: number;
  aWins: number;
  bWins: number;
  closeness: number;
  spite: number;
  tone: RivalryTone;
  triggers: Partial<Record<RivalryTrigger, number>>;
  sameHeya: boolean;
  label?: string;
}

/** JSON-safe container */
export interface RivalriesState {
  version: "1.0.0";
  pairs: Record<RivalryKey, RivalryPairState>;
}
