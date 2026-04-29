/**
 * uiConstants.ts
 *
 * Label mappings and constants for UI presentation.
 * Extracted from uiDigest.ts to separate concerns.
 */

import type {
  FatigueBand,
  PotentialBand,
  ScandalBand,
  TraitBand,
  PrizeBand,
} from "../engine/systems/narrative/NarrativeBands";

export const FATIGUE_LABELS: Record<FatigueBand, string> = {
  fresh: "Fresh",
  light: "Light",
  tired: "Tired",
  exhausted: "Exhausted",
  spent: "Spent",
};

// POTENTIAL_LABELS removed (unused)

export const TRAIT_LABELS: Record<TraitBand, string> = {
  negligible: "Negligible",
  minor: "Minor",
  moderate: "Moderate",
  strong: "Strong",
  dominant: "Dominant",
};

export const SCANDAL_LABELS: Record<ScandalBand, string> = {
  clean: "Clean",
  whispers: "Whispers",
  scrutiny: "Under Scrutiny",
  scandal: "Scandal",
  crisis: "Crisis",
};

// PRIZE_LABELS removed (unused)

// Re-exports from engine utilities for backward compatibility
export { HOF_CATEGORY_LABELS } from "../engine/hallOfFame";
export { RANK_NAMES } from "../engine/systems/recruitment/RecruitmentConstants";
export {
  RANK_HIERARCHY,
  compareRanks,
  formatRank,
} from "../engine/banzuke";
// createDefaultMediaState removed (unused)
export { buildPerceptionSnapshot, getCachedPerception } from "../engine/perception";
export { buyMyoseki, leaseMyoseki } from "../engine/myosekiMarket";
export { clamp } from "../engine/utils";
// clearInjury, toInjuryEvent removed (unused)
export { deleteSave, importSave } from "../engine/saveload";
// exportSave removed (unused)
// ensureHeyaWelfareState removed (unused)
export {
  formatEventTime,
  formatFinePenalty,
  formatStance,
} from "../engine/utils/formatters";
// generateH2HCommentary removed (unused)
export { generateNarrative } from "../engine/narrative";
export { getArchetypeDescription } from "../engine/oyakataPersonalities";
export { getKimarite } from "../engine/kimarite";
export {
  setScoutingInvestment,
} from "../engine/scoutingStore";
export {
  spendPoliticalCapital,
  getStatusLabel,
  getStatusColor,
} from "../engine/governance/GovernanceService";
export {
  scoutPool,
  scoutCandidate,
  offerCandidate,
} from "../engine/systems/generation/TalentPoolService";
// KOENKAI_MONTHLY_INCOME, SPONSOR_TIER_INCOME removed (unused)
export { recruitSponsor } from "../engine/systems/economics/SponsorshipService";
