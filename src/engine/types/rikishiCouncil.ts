/**
 * rikishiCouncil.ts
 * =================
 * §3 Rikishi-kai / Rikishi-ken (力士会) — the autonomous Sekitori Wrestlers'
 * Association chaired by the Kaichō (top Yokozuna / senior sekitori) with
 * Makuuchi and Juryo delegates.
 */

import type { Id } from "@/engine/types/common";
import type { Rank } from "@/engine/types/banzuke";

export type RikishiCouncilMotionType =
  "dohyo_safety" | "welfare_standards" | "benefit_relief" | "ceremonial_protocol";

export interface RikishiCouncilDelegate {
  rikishiId: Id;
  shikona: string;
  heyaId: Id;
  division: "makuuchi" | "juryo";
  rank: Rank;
  role: "kaicho" | "makuuchi_rep" | "juryo_rep";
}

export interface RikishiCouncilMotion {
  id: string;
  type: RikishiCouncilMotionType;
  title: string;
  description: string;
  proposedByHeyaId?: Id;
  status: "pending" | "passed" | "rejected";
  year: number;
  week: number;
  votesFor: number;
  votesAgainst: number;
  rationale: string[];
  playerVote?: "for" | "against";
}

export interface RikishiCouncilState {
  kaichoId?: Id;
  delegates: RikishiCouncilDelegate[];
  activePolicies: RikishiCouncilMotionType[];
  pendingMotions: RikishiCouncilMotion[];
  history: RikishiCouncilMotion[];
  lastConvenedYear?: number;
  lastConvenedWeek?: number;
}
