/**
 * TalentPoolService.ts — Re-export barrel.
 * Orchestrates the prospect pipeline by re-exporting from focused sub-modules.
 *
 * Sub-modules:
 *   TalentPoolStateService  — state initialization, pool refresh, yearly aging
 *   TalentPoolScouting      — fog-of-war reads, scouting intel, candidate queries
 *   TalentPoolRecruitment   — offers, signing resolution, NPC fill, materialization
 */

export * from "@/engine/generation/TalentPoolStateService";
export * from "@/engine/generation/TalentPoolScouting";
export {
  FOREIGN_RIKISHI_LIMIT_PER_HEYA,
  BASE_SCOUT_COST,
  REVEAL_COST,
} from "@/constants/engine/recruitment";
export * from "@/engine/generation/TalentPoolOffers";
export * from "@/engine/generation/TalentPoolMaintenance";
export * from "@/engine/generation/TalentPoolNPCRecruitment";
export * from "@/engine/generation/TalentPoolMaterialization";

import * as State from "@/engine/generation/TalentPoolStateService";
import * as Scouting from "@/engine/generation/TalentPoolScouting";
import * as Offers from "@/engine/generation/TalentPoolOffers";
import * as Maintenance from "@/engine/generation/TalentPoolMaintenance";
import * as NPCRecruitment from "@/engine/generation/TalentPoolNPCRecruitment";
import * as Materialization from "@/engine/generation/TalentPoolMaterialization";

export const TalentPoolService = {
  ...State,
  ...Scouting,
  ...Offers,
  ...Maintenance,
  ...NPCRecruitment,
  ...Materialization,
};
