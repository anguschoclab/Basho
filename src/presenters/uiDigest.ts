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
export { formatRadarData, formatMetaTrends } from "./uiFormatters";
export { getHallOfFame } from "../engine/hallOfFame";
// Re-exports re-pointed to current source modules (uiConstants barrel removed)
export { FATIGUE_LABELS, TRAIT_LABELS, SCANDAL_LABELS } from "../constants/ui/labels";
export { RANK_NAMES } from "../constants/engine/recruitment";
export { clamp, clampInt } from "../engine/utils";
export { formatRank, RANK_HIERARCHY, compareRanks } from "../engine/banzuke";
export { formatStance, formatFinePenalty, formatEventTime } from "../engine/utils/formatters";
export { HOF_CATEGORY_LABELS } from "../engine/hallOfFame";
export { deleteSave, importSave } from "../engine/saveload";
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
export { recruitSponsor } from "../engine/systems/economics/SponsorshipService";
export { getCachedPerception, buildPerceptionSnapshot } from "../engine/perception";
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
export { describeTrainingEffect } from "../engine/narrativeDescriptions";
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
export { DEFAULT_CRITICAL_GATES } from "../engine/holiday";
export { getTotalBashodays, needsScheduleForDay } from "../engine/scheduleHelpers";
// DEFAULT_DIVISION_DAYS removed (unused)
export { toFatigueBand, toScandalBand, toTraitBand } from "../engine/descriptorBands";
// toPotentialBand, toPrizeBand, toRivalryHeatBand removed (unused)

// Type exports for UI layer (re-exported from engine to comply with no-restricted-imports rule)
export type { WorldState } from "../engine/types/world";
export type { Rikishi } from "../engine/types/rikishi";
export type { Heya } from "../engine/types/heya";
export type { BashoHistorySummary } from "../engine/historyIndex";
export type { RecordEntry } from "../engine/types/records";
export type { HoFInductee } from "../engine/hallOfFame";
