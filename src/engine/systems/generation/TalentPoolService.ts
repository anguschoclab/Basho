/**
 * TalentPoolService.ts — Re-export barrel.
 * Orchestrates the prospect pipeline by re-exporting from focused sub-modules.
 *
 * Sub-modules:
 *   TalentPoolStateService  — state initialization, pool refresh, yearly aging
 *   TalentPoolScouting      — fog-of-war reads, scouting intel, candidate queries
 *   TalentPoolRecruitment   — offers, signing resolution, NPC fill, materialization
 */

export * from "@/engine/systems/generation/TalentPoolStateService";
export * from "@/engine/systems/generation/TalentPoolScouting";
export {
  FOREIGN_RIKISHI_LIMIT_PER_HEYA,
  BASE_SCOUT_COST,
  REVEAL_COST,
} from "@/constants/engine/recruitment";
export * from "@/engine/systems/generation/TalentPoolOffers";
export * from "@/engine/systems/generation/TalentPoolMaintenance";
export * from "@/engine/systems/generation/TalentPoolNPCRecruitment";
export * from "@/engine/systems/generation/TalentPoolMaterialization";

import * as State from "@/engine/systems/generation/TalentPoolStateService";
import * as Scouting from "@/engine/systems/generation/TalentPoolScouting";
import * as Offers from "@/engine/systems/generation/TalentPoolOffers";
import * as Maintenance from "@/engine/systems/generation/TalentPoolMaintenance";
import * as NPCRecruitment from "@/engine/systems/generation/TalentPoolNPCRecruitment";
import * as Materialization from "@/engine/systems/generation/TalentPoolMaterialization";

export const TalentPoolService = {
  ...State,
  ...Scouting,
  ...Offers,
  ...Maintenance,
  ...NPCRecruitment,
  ...Materialization,
};
