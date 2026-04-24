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
  type DigestKind,
  type DigestItem,
  type DigestSection,
  type UIDigest,
} from "./projections";

export {
  // Promotion projections
  getOzekiRunCandidates,
  // getYokozunaCandidates, // removed
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
  // projectMergerWarnings, // removed
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
  // projectPlayerContext, // removed
} from "./projections";

// Re-exports from utilities
export { resolveRegistryLabel, enrichRikishiForUI } from "./utilities/uiUtilities";

// Original re-exports from existing modules (preserved for compatibility)
export { projectRikishi } from "./rikishiUI";
export {
  formatRadarData,
  formatMetaTrends,
} from "./uiFormatters";
export { getHallOfFame } from "../engine/hallOfFame";
export {
  FATIGUE_LABELS,
  TRAIT_LABELS,
  SCANDAL_LABELS,
  clamp,
  formatRank,
  formatStance,
  HOF_CATEGORY_LABELS,
  RANK_NAMES,
  RANK_HIERARCHY,
  compareRanks,
  deleteSave,
  importSave,
  generateNarrative,
  getArchetypeDescription,
  getKimarite,
  setScoutingInvestment,
  spendPoliticalCapital,
  scoutPool,
  scoutCandidate,
  offerCandidate,
  recruitSponsor,
  getCachedPerception,
  buildPerceptionSnapshot,
  formatEventTime,
} from "./uiConstants";
export { setHeyaDietAction } from "./uiActions";
// renewSponsorContract removed (unused)
export {
  projectMediaUIDigest,
  projectHOFUIDigest,
  projectSponsorUIDigest,
  projectMedicalUIDigest,
} from "./uiProjections";
// projectRikishiWithHeya removed (unused)

// ─────────────────────────────────────────
// Re-exports of safe engine constants/utilities for UI
// The UI layer MUST NOT import from @/engine directly.
// ─────────────────────────────────────────
export { getMonthlyMaintenanceCost, getUpgradeCostEstimate } from "../engine/facilities";
// describeAggression, describeAttribute, describeExperience removed (unused)
export {
  describeTrainingEffect,
} from "../engine/narrativeDescriptions";
// createDefaultRivalriesState, getRivalry removed (unused)
// createScoutedView, describeScoutingLevel, getScoutedAttributes removed (unused)
export {
  FOCUS_BIAS_MATRIX,
  INTENSITY_MULTIPLIERS,
  RECOVERY_MULTIPLIERS,
  createDefaultTrainingState,
  ensureHeyaTrainingState,
  getFocusLabel,
  getIntensityLabel,
  getRecoveryLabel,
} from "../engine/systems/training/TrainingService";
// PHASE_EFFECTS, getFocusModeLabel removed (unused)
export { getCareerPhase } from "../engine/systems/training/TrainingMath";
export {
  BASHO_CALENDAR,
  getBashoByNumber,
  getBashoIndex,
  getDayName,
  getSeasonalFlavor,
  isKeyDay,
} from "../engine/calendar";
// DEFAULT_CRITICAL_GATES removed (unused)
export {
  getTotalBashodays,
  needsScheduleForDay,
} from "../engine/scheduleHelpers";
// DEFAULT_DIVISION_DAYS removed (unused)
export {
  toFatigueBand,
  toScandalBand,
  toTraitBand,
} from "../engine/descriptorBands";
// toPotentialBand, toPrizeBand, toRivalryHeatBand removed (unused)

// Type exports for UI layer (re-exported from engine to comply with no-restricted-imports rule)
export type { WorldState } from "../engine/types/world";
export type { Rikishi } from "../engine/types/rikishi";
export type { Heya } from "../engine/types/heya";
export type { BashoHistorySummary } from "../engine/historyIndex";
export type { RecordEntry } from "../engine/types/records";
export type { HoFInductee } from "../engine/hallOfFame";
