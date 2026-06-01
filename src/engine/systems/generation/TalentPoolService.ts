/**
 * TalentPoolService.ts — Re-export barrel.
 * Orchestrates the prospect pipeline by re-exporting from focused sub-modules.
 *
 * Sub-modules:
 *   TalentPoolStateService  — state initialization, pool refresh, yearly aging
 *   TalentPoolScouting      — fog-of-war reads, scouting intel, candidate queries
 *   TalentPoolRecruitment   — offers, signing resolution, NPC fill, materialization
 */

export * from "./TalentPoolStateService";
export * from "./TalentPoolScouting";
export {
  FOREIGN_RIKISHI_LIMIT_PER_HEYA,
  BASE_SCOUT_COST,
  REVEAL_COST,
} from "../../../constants/engine/recruitment";
export * from "./TalentPoolOffers";
export * from "./TalentPoolMaintenance";
export * from "./TalentPoolNPCRecruitment";
export * from "./TalentPoolMaterialization";

import * as State from "./TalentPoolStateService";
import * as Scouting from "./TalentPoolScouting";
import * as Offers from "./TalentPoolOffers";
import * as Maintenance from "./TalentPoolMaintenance";
import * as NPCRecruitment from "./TalentPoolNPCRecruitment";
import * as Materialization from "./TalentPoolMaterialization";

export const TalentPoolService = {
  ...State,
  ...Scouting,
  ...Offers,
  ...Maintenance,
  ...NPCRecruitment,
  ...Materialization,
};
