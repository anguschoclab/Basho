/**
 * uiDigest.ts
 *
 * Compatibility layer for UI presenter functions.
 * Re-exports from extracted modules to maintain backward compatibility.
 *
 * This file has been refactored to ~100 lines as a compatibility layer.
 * Original implementations have been moved to focused modules in:
 * - projections/ (digest, promotion, facility, bout, dashboard, basho, economy, heya, event)
 * - utilities/ (uiUtilities)
 */

// Re-exports from extracted projection modules
export {
  // Digest projections
  buildWeeklyDigest,
  labelForWorld,
  buildInjurySection,
  buildEventSections,
  buildHeadline,
  buildMatchupItems,
  type DigestKind,
  type DigestItem,
  type DigestSection,
  type UIDigest,
} from "./projections";

export {
  // Promotion projections
  getOzekiRunCandidates,
  getYokozunaCandidates,
  getKadobanDrama,
  type OzekiRunCandidate,
  type YokozunaCandidate,
} from "./projections";

export {
  // Facility projections
  getFacilityLevelLabel,
  getFacilityLevelColor,
} from "./projections";

export {
  // Bout projections
  buildBoutPreviewUI,
  projectRecruitmentUIDigest,
  projectOpponentScoutingUIDigest,
  projectH2HBetweenHeyas,
} from "./projections";

export {
  // Dashboard projections
  projectDashboardUIDigest,
  projectBanzukeUIDigest,
} from "./projections";

export {
  // Basho projections
  projectBashoUIDigest,
} from "./projections";

export {
  // Economy projections
  projectLoanStatus,
  projectMergerWarnings,
} from "./projections";

export {
  // Heya projections
  projectHeyaData,
  projectHeyaRosterWithAge,
} from "./projections";

export {
  // Event projections
  projectEventLogData,
  projectGovernanceSummary,
  projectBashoResults,
  projectPressConferenceData,
  projectPlayerContext,
} from "./projections";

// Re-exports from utilities
export { resolveRegistryLabel, enrichRikishiForUI } from "./utilities/uiUtilities";

// Original re-exports from existing modules (preserved for compatibility)
export { projectRikishi } from "./rikishiUI";
export { getHallOfFame } from "../engine/hallOfFame";
export { formatRadarData, formatMetaTrends } from "./uiFormatters";
export {
  FATIGUE_LABELS,
  POTENTIAL_LABELS,
  TRAIT_LABELS,
  SCANDAL_LABELS,
  PRIZE_LABELS,
  clamp,
  clampInt,
  formatRank,
  formatStance,
  HOF_CATEGORY_LABELS,
  RANK_NAMES,
  RANK_HIERARCHY,
  compareRanks,
  getRankTitleJa,
  isKachiKoshi,
  isMakeKoshi,
  createDefaultMediaState,
  buildPerceptionSnapshot,
  getCachedPerception,
  buyMyoseki,
  leaseMyoseki,
  clearInjury,
  toInjuryEvent,
  deleteSave,
  exportSave,
  importSave,
  ensureHeyaWelfareState,
  formatEventTime,
  formatFinePenalty,
  formatSaveDate,
  generateH2HCommentary,
  generateNarrative,
  getArchetypeDescription,
  getKimarite,
  getOrCreateScouted,
  getScoutingLevel,
  setScoutingInvestment,
  warmScoutingForRikishiList,
  getStatusColor,
  getStatusLabel,
  spendPoliticalCapital,
  scoutPool,
  scoutCandidate,
  offerCandidate,
  getCandidateScoutingLevel,
  KOENKAI_MONTHLY_INCOME,
  SPONSOR_TIER_INCOME,
  recruitSponsor,
} from "./uiConstants";
export { renewSponsorContract, setHeyaDietAction } from "./uiActions";
export {
  projectRikishiWithHeya,
  projectMediaUIDigest,
  projectHOFUIDigest,
  projectSponsorUIDigest,
  projectMedicalUIDigest,
} from "./uiProjections";

// ─────────────────────────────────────────
// Re-exports of safe engine constants/utilities for UI
// The UI layer MUST NOT import from @/engine directly.
// ─────────────────────────────────────────
export { getMonthlyMaintenanceCost, getUpgradeCostEstimate } from "../engine/facilities";
export {
  describeAggression,
  describeAttribute,
  describeExperience,
  describeTrainingEffect,
} from "../engine/narrativeDescriptions";
export { createDefaultRivalriesState, getRivalry } from "../engine/rivalries";
export { createScoutedView, describeScoutingLevel, getScoutedAttributes } from "../engine";
export {
  FOCUS_BIAS_MATRIX,
  INTENSITY_MULTIPLIERS,
  PHASE_EFFECTS,
  RECOVERY_MULTIPLIERS,
  createDefaultTrainingState,
  ensureHeyaTrainingState,
  getFocusLabel,
  getFocusModeLabel,
  getIntensityLabel,
  getRecoveryLabel,
} from "../engine/systems/training/TrainingService";
export { getCareerPhase } from "../engine/systems/training/TrainingMath";
export {
  BASHO_CALENDAR,
  getBashoByNumber,
  getBashoIndex,
  getDayName,
  getSeasonalFlavor,
  isKeyDay,
} from "../engine/calendar";
export { DEFAULT_CRITICAL_GATES } from "../engine/holiday";
export {
  DEFAULT_DIVISION_DAYS,
  getTotalBashodays,
  needsScheduleForDay,
} from "../engine/scheduleHelpers";
export {
  toFatigueBand,
  toPotentialBand,
  toPrizeBand,
  toRivalryHeatBand,
  toScandalBand,
  toTraitBand,
} from "../engine/descriptorBands";
