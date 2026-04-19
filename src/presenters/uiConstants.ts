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

export const POTENTIAL_LABELS: Record<PotentialBand, { label: string; color: string }> = {
  generational: { label: "Generational Talent", color: "text-gold" },
  star: { label: "Star Potential", color: "text-west" },
  solid: { label: "Solid Prospect", color: "text-success" },
  average: { label: "Average Prospect", color: "text-muted-foreground" },
  limited: { label: "Limited Upside", color: "text-warning" },
  unknown: { label: "Unknown", color: "text-muted-foreground" },
};

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

export const PRIZE_LABELS: Record<PrizeBand, string> = {
  nominal: "Nominal",
  modest: "Modest",
  notable: "Notable",
  prestigious: "Prestigious",
  grand: "Grand",
};

// Re-exports from engine utilities for backward compatibility
export { HOF_CATEGORY_LABELS } from "../engine/hallOfFame";
export { RANK_NAMES } from "../engine/systems/recruitment/RecruitmentConstants";
export {
  RANK_HIERARCHY,
  compareRanks,
  formatRank,
  getRankTitleJa,
  isKachiKoshi,
  isMakeKoshi,
} from "../engine/banzuke";
export { createDefaultMediaState } from "../engine/systems/media/MediaService";
export { buildPerceptionSnapshot, getCachedPerception } from "../engine/perception";
export { buyMyoseki, leaseMyoseki } from "../engine/myosekiMarket";
export { clamp, clampInt } from "../engine/utils";
export { clearInjury, toInjuryEvent } from "../engine/systems/health/InjuryService";
export { deleteSave, exportSave, importSave } from "../engine/saveload";
export { ensureHeyaWelfareState } from "../engine/systems/welfare/WelfareService";
export {
  formatEventTime,
  formatFinePenalty,
  formatSaveDate,
  formatStance,
} from "../engine/utils/formatters";
export { generateH2HCommentary } from "../engine/h2h";
export { generateNarrative } from "../engine/narrative";
export { getArchetypeDescription } from "../engine/oyakataPersonalities";
export { getKimarite } from "../engine/kimarite";
export {
  getOrCreateScouted,
  getScoutingLevel,
  setScoutingInvestment,
  warmScoutingForRikishiList,
} from "../engine/scoutingStore";
export {
  getStatusColor,
  getStatusLabel,
  spendPoliticalCapital,
} from "../engine/governance/GovernanceService";
export {
  scoutPool,
  scoutCandidate,
  offerCandidate,
  getCandidateScoutingLevel,
} from "../engine/systems/generation/TalentPoolService";
export {
  KOENKAI_MONTHLY_INCOME,
  SPONSOR_TIER_INCOME,
} from "../engine/systems/economics/SponsorshipService";
export { recruitSponsor } from "../engine/systems/economics/SponsorshipService";
