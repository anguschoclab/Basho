// Engine index - carefully manage exports to avoid duplicates

// Core types first
export * from "./types";

// Individual modules with selective exports to avoid conflicts
export * from "./shikona";
export * from "./saveload";
export * from "./world";
export * from "./worldgen";
export * from "./bout";
export * from "./schedule";

// Banzuke - core exports only
export { 
  RANK_HIERARCHY, 
  isKachiKoshi, 
  isMakeKoshi,
  type RankInfo
} from "./banzuke";

// Scouting - label exports only
export { 
  RANK_NAMES,
  STYLE_NAMES,
  ARCHETYPE_NAMES
} from "./scouting";

// Economics - only bout resolver (tickWeek handled by timeBoundary)
export { 
  onBoutResolved 
} from "./economics";

// Events
export * from "./events";
export * from "./welfare";

// Training - export selectively
export { 
  applyWeeklyTraining,
  ensureHeyaTrainingState,
  getIndividualFocus,
  computeTrainingMultipliers,
  getCareerPhase,
  PHASE_EFFECTS
} from "./training";

export * from "./calendar";
export * from "./rivalries";
export * from "./narrative";
export * from "./narrativeDescriptions";
export * from "./uiModels";
export * from "./uiDigest";
export * from "./matchmaking";
export * from "./media";

// TimeBoundary - export the tick orchestrator
export { 
  tickWeek, 
  advanceWeeks,
  processWeeklyBoundary,
  processMonthlyBoundary,
  type BoundaryTickReport,
  type TimeState
} from "./timeBoundary";

export * from "./almanac";

// H2H and Lifecycle Systems
export * from "./h2h";
export * from "./lifecycle";

// RNG
export { rngFromSeed, rngForWorld, SeededRNG } from "./rng";
