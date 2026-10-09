/**
 * types.ts — WS4 rikishi-level agency.
 */

import type { Id } from "../types/common";

export type RikishiRequestType =
  | "request_rest"
  | "request_intensity"
  | "seek_transfer"
  | "retirement_consideration"
  | "mentor_request"
  | "tactic_dispute";

/** A live request a rikishi has made to their stablemaster. */
export interface RikishiRequest {
  id: string;
  rikishiId: Id;
  heyaId: Id;
  type: RikishiRequestType;
  createdWeek: number;
  /** Banded, player-safe reason label (e.g. "fatigue", "discontent"). */
  reason: string;
}

export type LoyaltyBand = "loyal" | "wavering" | "restless" | "discontent";

/** Derived weekly disposition — persisted on Rikishi.agency. */
export interface RikishiAgencyState {
  satisfaction: number; // 0-100
  restlessness: number; // 0-100
  loyaltyBand: LoyaltyBand;
  deniedCount: number;
  grantedCount: number;
  lastRequestWeek?: number;
  lastEvaluatedWeek?: number;
}
