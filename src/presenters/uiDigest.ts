/**
 * uiDigest.ts — Intentional Facade (SRP-09)
 * ==========================================
 * This file is a deliberate facade pattern that re-exports UI-facing functions
 * from extracted projection modules and engine utilities.
 *
 * Design rationale:
 * - The UI layer MUST NOT import from @/engine directly (enforced by ESLint
 *   no-restricted-imports rule). This facade is the single authorized gateway.
 * - Projection logic lives in focused modules under projections/ and utilities/.
 * - This file contains zero business logic — it is purely a re-export barrel.
 * - ~177 lines is acceptable for a facade covering ~60+ exports across 15+ modules.
 *
 * @see projections/ for the actual projection implementations
 * @see uiUtilities for shared UI helper functions
 */

// Re-exports from extracted projection modules
export {
  // Digest projections
  buildWeeklyDigest,
  type DigestKind,
  type DigestItem,
  type DigestSection,
  type UIDigest,
} from "@/presenters/projections/index";

export {
  // Promotion projections
  getOzekiRunCandidates,
  getYokozunaCandidates,
  getKadobanDrama,
  type OzekiRunCandidate,
  type YokozunaCandidate,
} from "@/presenters/projections/index";

export {
  // Facility projections
  getFacilityLevelLabel,
  getFacilityLevelColor,
} from "@/presenters/projections/index";

export {
  // Bout projections
  buildBoutPreviewUI,
  projectRecruitmentUIDigest,
  projectOpponentScoutingUIDigest,
  projectH2HBetweenHeyas,
} from "@/presenters/projections/index";

export {
  // Dashboard projections
  projectDashboardUIDigest,
  projectBanzukeUIDigest,
} from "@/presenters/projections/index";

export {
  // Basho projections
  projectBashoUIDigest,
} from "@/presenters/projections/index";

export {
  // Economy projections
  projectMergerWarnings,
} from "@/presenters/projections/index";

export {
  // Heya projections
  projectHeyaData,
  projectHeyaRosterWithAge,
} from "@/presenters/projections/index";

export {
  // Event projections
  projectEventLogData,
  projectGovernanceSummary,
  projectBashoResults,
  projectPressConferenceData,
  projectPlayerContext,
} from "@/presenters/projections/index";

// Re-exports from utilities
export { resolveRegistryLabel, enrichRikishiForUI } from "@/presenters/uiUtilities";

// Original re-exports from existing modules (preserved for compatibility)
export { projectRikishi } from "@/presenters/rikishi/index";
export { formatRadarData, formatMetaTrends } from "@/presenters/uiFormatters";
export { getHallOfFame } from "@/engine/history/hallOfFame";
// Re-exports re-pointed to current source modules (uiConstants barrel removed)
export { FATIGUE_LABELS, TRAIT_LABELS, SCANDAL_LABELS } from "@/constants/ui/labels";
export { RANK_NAMES } from "@/constants/engine/recruitment";
export { clamp, clampInt } from "@/engine/utils/index";
export { formatRank, compareRanks } from "@/engine/banzuke/banzukeHelpers";
export { RANK_HIERARCHY } from "@/engine/types/banzuke";
export { toRankPosition } from "@/engine/types/banzuke";
export { formatStance, formatFinePenalty, formatEventTime } from "@/engine/utils/formatters";
export { HOF_CATEGORY_LABELS } from "@/engine/history/hallOfFame";
export { deleteSave, importSave } from "@/engine/persistence/saveload";
export { getArchetypeDescription } from "@/engine/npc/personas/oyakataPersonalities";
export { getKimarite } from "@/engine/bout/kimarite/kimariteRegistry";
export { setScoutingInvestment } from "@/engine/recruitment/scoutingStore";
export {
  spendPoliticalCapital,
  getStatusLabel,
  getStatusColor,
} from "@/engine/governance/services/ScandalService";
export {
  scoutPool,
  scoutCandidate,
  offerCandidate,
} from "@/engine/generation/TalentPoolService";
export { recruitSponsor } from "@/engine/economy/SponsorshipService";
export { getCachedPerception, buildPerceptionSnapshot } from "@/engine/npc/perception";
export { setHeyaDietAction } from "@/presenters/uiActions";
export { renewSponsorContract } from "@/engine/economy/SponsorContractService";
export {
  projectRikishiWithHeya,
  projectMediaUIDigest,
  projectHOFUIDigest,
  projectSponsorUIDigest,
  projectMedicalUIDigest,
} from "@/presenters/projections/index";

// ─────────────────────────────────────────
// Re-exports of safe engine constants/utilities for UI
// The UI layer MUST NOT import from @/engine directly.
// ─────────────────────────────────────────
export { getMonthlyMaintenanceCost, getUpgradeCostEstimate } from "@/engine/economy/facilities";
export { describeTrainingEffect } from "@/engine/narrative/narrativeDescriptions";
export { createDefaultRivalriesState, getRivalry } from "@/engine/narrative/rivalry/rivalriesState";
export {
  createScoutedView,
  describeScoutingLevel,
  getScoutedAttributes,
} from "@/engine/recruitment/ScoutingService";
export {
  FOCUS_BIAS_MATRIX,
  INTENSITY_MULTIPLIERS,
  RECOVERY_MULTIPLIERS,
  createDefaultTrainingState,
  ensureHeyaTrainingState,
  getFocusLabel,
  getIntensityLabel,
  getRecoveryLabel,
} from "@/engine/training/TrainingService";
export { PHASE_EFFECTS } from "@/engine/training/TrainingService";
export { getFocusModeLabel } from "@/engine/training/TrainingNarrative";
export { getCareerPhase } from "@/engine/training/TrainingMath";
export {
  BASHO_CALENDAR,
  getBashoByNumber,
  getBashoIndex,
  getDayName,
  getSeasonalFlavor,
  isKeyDay,
} from "@/engine/calendar/calendar";
export { DEFAULT_CRITICAL_GATES } from "@/engine/calendar/holiday";
export {
  getTotalBashodays,
  needsScheduleForDay,
  DEFAULT_DIVISION_DAYS,
} from "@/engine/calendar/scheduleHelpers";
export {
  toFatigueBand,
  toScandalBand,
  toTraitBand,
  toPotentialBand,
  toPrizeBand,
  toRivalryHeatBand,
} from "@/engine/narrative/descriptorBands";

// Type exports for UI layer (re-exported from engine to comply with no-restricted-imports rule)
export type { WorldState, PreBashoAssessment } from "@/engine/types/world";
export type { Rikishi } from "@/engine/types/rikishi";
export type { Heya } from "@/engine/types/heya";
export type { BashoHistorySummary } from "@/engine/history/historyIndex";
export type { RecordEntry } from "@/engine/types/records";
export type { HoFInductee } from "@/engine/history/hallOfFame";
