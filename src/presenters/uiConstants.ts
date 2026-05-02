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
  StatBand,
  AgeBand,
  ExperienceBand,
  ReputationBand,
  InjurySeverityBand,
  WinRateBand,
  RivalryHeatBand,
  WeightBand,
  HeightBand,
} from "../engine/systems/narrative/NarrativeBands";

export const FATIGUE_LABELS: Record<FatigueBand, string> = {
  fresh: "Fresh",
  alert: "Alert",
  light: "Light",
  tired: "Tired",
  worn: "Worn",
  exhausted: "Exhausted",
  spent: "Spent",
};

export const POTENTIAL_LABELS: Record<PotentialBand, string> = {
  generational: "Generational",
  star: "Star",
  solid: "Solid",
  average: "Average",
  limited: "Limited",
  unknown: "Unknown",
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

export const STAT_LABELS: Record<StatBand, string> = {
  exceptional: "Exceptional",
  outstanding:  "Outstanding",
  strong:       "Strong",
  capable:      "Capable",
  developing:   "Developing",
  limited:      "Limited",
  struggling:   "Struggling",
};

export const AGE_LABELS: Record<AgeBand, string> = {
  prodigy: "Prodigy",
  young:   "Young",
  prime:   "Prime",
  veteran: "Veteran",
  aging:   "Aging",
  elder:   "Elder",
};

export const EXPERIENCE_LABELS: Record<ExperienceBand, string> = {
  novice:     "Novice",
  developing: "Developing",
  seasoned:   "Seasoned",
  veteran:    "Veteran",
  master:     "Master",
};

export const REPUTATION_LABELS: Record<ReputationBand, string> = {
  obscure:   "Obscure",
  known:     "Known",
  respected: "Respected",
  renowned:  "Renowned",
  legendary: "Legendary",
};

export const INJURY_LABELS: Record<InjurySeverityBand, string> = {
  minimal:  "Minimal",
  mild:     "Mild",
  moderate: "Moderate",
  severe:   "Severe",
  critical: "Critical",
};

export const WIN_RATE_LABELS: Record<WinRateBand, string> = {
  dismal:   "Dismal",
  poor:     "Poor",
  mediocre: "Mediocre",
  decent:   "Decent",
  strong:   "Strong",
  dominant: "Dominant",
};

export const RIVALRY_HEAT_LABELS: Record<RivalryHeatBand, string> = {
  dormant:   "Dormant",
  simmering: "Simmering",
  heated:    "Heated",
  fierce:    "Fierce",
  legendary: "Legendary",
};

export const WEIGHT_LABELS: Record<WeightBand, string> = {
  lean:     "Lean",
  solid:    "Solid Build",
  powerful: "Powerful",
  massive:  "Massive",
  imposing: "Imposing",
};

export const HEIGHT_LABELS: Record<HeightBand, string> = {
  short:    "Short",
  average:  "Average",
  tall:     "Tall",
  giant:    "Giant",
  towering: "Towering",
};

// PRIZE_LABELS removed (unused)

// Re-exports from engine utilities for backward compatibility
export { HOF_CATEGORY_LABELS } from "../engine/hallOfFame";
export { RANK_NAMES } from "../engine/systems/recruitment/RecruitmentConstants";
export { RANK_HIERARCHY, compareRanks, formatRank } from "../engine/banzuke";
// createDefaultMediaState removed (unused)
export { buildPerceptionSnapshot, getCachedPerception } from "../engine/perception";
export { buyMyoseki, leaseMyoseki } from "../engine/myosekiMarket";
export { clamp } from "../engine/utils";
// clearInjury, toInjuryEvent removed (unused)
export { deleteSave, importSave } from "../engine/saveload";
// ensureHeyaWelfareState removed (unused)
export { formatEventTime, formatFinePenalty, formatStance } from "../engine/utils/formatters";
// generateH2HCommentary removed (unused)
export { generateNarrative } from "../engine/narrative";
export { getArchetypeDescription } from "../engine/oyakataPersonalities";
export { getKimarite } from "../engine/kimarite";
export { setScoutingInvestment } from "../engine/scoutingStore";
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
