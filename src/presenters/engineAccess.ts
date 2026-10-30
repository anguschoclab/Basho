export type { AIRecommendation } from "@/engine/npc/types";
export type {
  NotableBoutEntry,
  NarrativeHighlight,
  PromotionHistoryEntry,
} from "@/engine/almanac/types";
export { getCombatArchetypeDescription } from "@/engine/bout/archetype";
export { compareBanzuke } from "@/engine/banzuke/banzukeOps";
export { formatRankPosition } from "@/engine/banzuke/banzukeHelpers";
export { RANK_HIERARCHY } from "@/engine/types/banzuke";
export { BardEngine } from "@/engine/bard/BardEngine";
export {
  getReplayPhaseDurations,
  buildBoutScript,
  type BoutScript,
  type BoutAnimationFamily,
  type ReplayPhase,
} from "@/engine/bout/ReplayMetadata";
export type { PbpLine, PbpPhase } from "@/engine/bout/boutNarrative";
export type { PbpTag } from "@/engine/bout/narrative/pbpTypes";
export { deriveSignatureKimarite } from "@/engine/rikishi/signatureKimarite";
export { PHYSIO_SESSION_COST } from "@/engine/health/physioPurchase";
export { deriveStableHarmony } from "@/engine/welfare/harmony";
export { SCOUT_TIERS, type ScoutMissionTier } from "@/engine/recruitment/scoutMissions";
export { TARGET_ROSTER_SIZE } from "@/constants/engine/recruitmentExtended";
export { calculateGains } from "@/engine/training/TrainingMath";
export { DRILL_STAT_HINTS } from "@/constants/engine/training";
export type { BoutContext } from "@/engine/bout/boutPhysics";
export { resolveBout, simulateBout } from "@/engine/bout/boutResolver";
export { TACTIC_PROFILES, type TacticProfile } from "@/engine/bout/tacticProfiles";
export { EntityCollection } from "@/engine/core/EntityCollection";
export { retireRikishiImpact } from "@/engine/core/ImpactBuilder";
export { resolveImpacts } from "@/engine/core/ImpactResolver";
export {
  toFatigueBand,
  toScandalBand,
  toPotentialBand,
  toRivalryHeatBand,
  toStatBand,
  type PotentialBand,
} from "@/engine/narrative/descriptorBands";
export type { FacilityAxis } from "@/engine/economy/facilities";
export { GlossaryService, type GlossaryTerm } from "@/engine/narrative/glossary/GlossaryService";
export type { HoFCategory, HoFInductee } from "@/engine/history/hallOfFame";
export { makeBashoKey } from "@/engine/history/historyIndex";
export { getMentor, menteesOf, getLineageTree } from "@/engine/legacy/lineage";
export type {
  HolidayTarget,
  SafetyGate,
  DelegationPolicy,
} from "@/engine/calendar/holiday";
export type { PerceptionSnapshot } from "@/engine/npc/perception";
export {
  getPlayerHeya,
  getHeya,
  getHeyaRoster,
  updateHeyaInWorld,
  getSekitoriInHeya,
  getActiveRikishi,
  getRikishiByDivision,
} from "@/engine/core/queries";
export { createDefaultRivalriesState } from "@/engine/narrative/rivalry/rivalriesState";
export type {
  RivalriesState,
  RivalryPairState,
  RivalryTrigger,
} from "@/constants/engine/rivalry";
export type { RivalryHeatBand } from "@/engine/narrative/NarrativeBands";
export { SeededRNG, rngFromSeed, type SeededRNG as SeededRNGType } from "@/engine/core/rng";
export { makeDeterministicSeed } from "@/engine/utils/seed";
export { toIdMap, toKeyedMap } from "@/engine/utils/collections";
export { deleteSave, exportSave, importSave, type SaveSlotInfo } from "@/engine/persistence/saveload";
export { getActiveRikishi as selectActiveRikishi } from "@/engine/core/selectors";
export { generateToshiyoriName } from "@/engine/shikona/toshiyoriNames";
export { calculateHeyaWeeklyFinances } from "@/engine/economy/FinanceCalculator";
export { InfrastructureService } from "@/engine/economy/InfrastructureService";
export {
  listNPCWatchedCandidates,
  getTopSuitor,
} from "@/engine/generation/CandidatePoolService";
export {
  listVisibleCandidates,
  getCandidateScoutingLevel,
  getForeignCountInHeya,
} from "@/engine/generation/TalentPoolScouting";
export { FOREIGN_RIKISHI_LIMIT_PER_HEYA } from "@/engine/generation/TalentPoolService";
export * as talentpool from "@/engine/generation/TalentPoolService";
export { DynastyService } from "@/engine/legacy/DynastyService";
export { MentorshipService } from "@/engine/training/MentorshipService";
export { SparringService } from "@/engine/training/SparringService";
export { computeDisplayTrainingMultiplier } from "@/engine/training/TrainingMath";
export { NarrativeService } from "@/engine/narrative/NarrativeService";
export { error, warn } from "@/engine/utils/Logger";
export { getHeyaForeignUsage, NATURALIZATION_YEARS } from "@/engine/utils/citizenshipUtils";
export { formatSaveDate } from "@/engine/utils/formatters";
export { clamp } from "@/engine/utils/math";
export { sortStandings } from "@/engine/utils/sort";
