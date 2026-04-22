/**
 * TalentPoolService.ts — Re-export barrel.
 * Orchestrates the prospect pipeline by re-exporting from focused sub-modules.
 *
 * Sub-modules:
 *   TalentPoolStateService  — state initialization, pool refresh, yearly aging
 *   TalentPoolScouting      — fog-of-war reads, scouting intel, candidate queries
 *   TalentPoolRecruitment   — offers, signing resolution, NPC fill, materialization
 */

export {
  ensureTalentPoolState,
  reinjectToTalentPool,
  injectRikishiAsCandidate,
  refreshAllPools,
  tickYear,
} from "./TalentPoolStateService";

export {
  listVisibleCandidates,
  getCandidateScoutingLevel,
  getForeignCountInHeya,
  countsAsForeignFromRikishi,
  scoutPool,
  scoutCandidate,
  getScoutedCandidateView,
} from "./TalentPoolScouting";

export {
  FOREIGN_RIKISHI_LIMIT_PER_HEYA,
  BASE_SCOUT_COST,
  REVEAL_COST,
} from "./TalentPoolConstants";

export {
  offerCandidate,
  resolveCandidateSuitor,
} from "./TalentPoolOffers";

export {
  tickWeekTalentPool,
} from "./TalentPoolMaintenance";

export {
  fillVacanciesForNPC,
  fillVacanciesForNPCWithBidding,
} from "./TalentPoolNPCRecruitment";

export {
  materializeCandidateToRikishi,
  finalizeSignedCandidates,
} from "./TalentPoolMaterialization";
