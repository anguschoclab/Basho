/**
 * TalentPoolScouting.ts — Thin re-export barrel
 *
 * The talent pool scouting system has been decomposed into:
 * - talentPoolReads.ts: Pure read functions (listVisibleCandidates,
 *   getCandidateScoutingLevel, getForeignCountInHeya, getForeignCountsByHeya,
 *   countsAsForeignFromRikishi)
 * - talentPoolScoutingOps.ts: Mutation operators (scoutPool, scoutCandidate,
 *   getScoutedCandidateView)
 *
 * This barrel preserves backward compatibility for all existing import sites.
 */

export {
  listVisibleCandidates,
  getCandidateScoutingLevel,
  getForeignCountInHeya,
  getForeignCountsByHeya,
  countsAsForeignFromRikishi,
  candidateConsumesForeignSlot,
} from "@/engine/systems/generation/talentPoolReads";

export { scoutPool, scoutCandidate, getScoutedCandidateView } from "@/engine/systems/generation/talentPoolScoutingOps";
