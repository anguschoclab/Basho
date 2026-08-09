export type { AIRecommendation } from "../engine/ai/types";
export type {
  NotableBoutEntry,
  NarrativeHighlight,
  PromotionHistoryEntry,
} from "../engine/almanac/types";
export { getCombatArchetypeDescription } from "../engine/archetype";
export { compareBanzuke, formatRankPosition, RANK_HIERARCHY } from "../engine/banzuke";
export { BardEngine } from "../engine/bard/BardEngine";
export {
  getReplayPhaseDurations,
  buildBoutScript,
  type BoutScript,
  type BoutAnimationFamily,
} from "../engine/bout/ReplayMetadata";
export type { PbpLine, PbpPhase } from "../engine/bout/boutNarrative";
export type { BoutContext } from "../engine/bout/boutPhysics";
export { resolveBout, simulateBout } from "../engine/bout/boutResolver";
export { TACTIC_PROFILES, type TacticProfile } from "../engine/bout/tacticProfiles";
export { EntityCollection } from "../engine/core/EntityCollection";
export { retireRikishiImpact } from "../engine/core/ImpactBuilder";
export { resolveImpacts } from "../engine/core/ImpactResolver";
export {
  toFatigueBand,
  toScandalBand,
  toPotentialBand,
  toRivalryHeatBand,
  toStatBand,
  type PotentialBand,
} from "../engine/descriptorBands";
export type { FacilityAxis } from "../engine/facilities";
export { GlossaryService, type GlossaryTerm } from "../engine/glossary/GlossaryService";
export type { HoFCategory, HoFInductee } from "../engine/hallOfFame";
export { makeBashoKey } from "../engine/historyIndex";
export { getMentor, menteesOf } from "../engine/lineage";
export type { PerceptionSnapshot } from "../engine/perception";
export {
  getPlayerHeya,
  getHeya,
  getHeyaRoster,
  updateHeyaInWorld,
  getSekitoriInHeya,
  getActiveRikishi,
  getRikishiByDivision,
} from "../engine/queries";
export {
  createDefaultRivalriesState,
  type RivalriesState,
  type RivalryHeatBand,
  type RivalryPairState,
  type RivalryTrigger,
} from "../engine/rivalries";
export { SeededRNG, rngFromSeed, type SeededRNG as SeededRNGType } from "../engine/rng";
export { deleteSave, exportSave, importSave, type SaveSlotInfo } from "../engine/saveload";
export { getActiveRikishi as selectActiveRikishi } from "../engine/selectors";
export { generateToshiyoriName } from "../engine/shikona/toshiyoriNames";
export { calculateHeyaWeeklyFinances } from "../engine/systems/economy/FinanceCalculator";
export { InfrastructureService } from "../engine/systems/economy/InfrastructureService";
export {
  listNPCWatchedCandidates,
  getTopSuitor,
} from "../engine/systems/generation/CandidatePoolService";
export {
  listVisibleCandidates,
  getCandidateScoutingLevel,
  getForeignCountInHeya,
} from "../engine/systems/generation/TalentPoolScouting";
export { FOREIGN_RIKISHI_LIMIT_PER_HEYA } from "../engine/systems/generation/TalentPoolService";
export * as talentpool from "../engine/systems/generation/TalentPoolService";
export { DynastyService } from "../engine/systems/legacy/DynastyService";
export { MentorshipService } from "../engine/systems/training/MentorshipService";
export { SparringService } from "../engine/systems/training/SparringService";
export { computeDisplayTrainingMultiplier } from "../engine/systems/training/TrainingMath";
export { NarrativeService } from "../engine/systems/narrative/NarrativeService";
export { error, warn } from "../engine/utils/Logger";
export { getHeyaForeignUsage } from "../engine/utils/citizenshipUtils";
export { formatSaveDate } from "../engine/utils/formatters";
export { clamp } from "../engine/utils/math";
export { sortStandings } from "../engine/utils/sort";
