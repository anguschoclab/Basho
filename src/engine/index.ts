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
export * from "./hallOfFame";
export { getVoiceMatrix, validateDiversityGates } from "./pbpMatrix";

// Daily Tick Pipeline
export { advanceOneDay, advanceDays, advanceFullInterim, enterPostBasho, enterInterim, type DailyTickReport } from "./dailyTick";

// Holiday System
export { runHoliday, DEFAULT_CRITICAL_GATES, type HolidayConfig, type HolidayResult, type HolidayTarget, type SafetyGate, type DelegationPolicy } from "./holiday";

// H2H and Lifecycle Systems
export * from "./h2h";
export * from "./lifecycle";

// RNG
export { rngFromSeed, rngForWorld, SeededRNG } from "./rng";

// NPC AI (Canon A7)
export { makeNPCWeeklyDecision, getManagerPersona } from "./npcAI";
export type { NPCWeeklyDecision } from "./npcAI";
export { buildPerceptionSnapshot, buildAllPerceptionSnapshots, getCachedPerception } from "./perception";
export type { PerceptionSnapshot, RikishiPerception, HealthBand, WelfareRiskBand, GovernancePressureBand, MediaHeatBand, RivalryPerceptionBand, RosterStrengthBand, MoraleBand } from "./perception";

// Descriptor Bands (No-Leak Observability Layer — A7.1)
// Selective exports to avoid name clashes with rivalries.ts
export {
  toBand,
  toStatBand, toConditionBand, toFatigueBand, toMomentumBand,
  toFinancialBand, toRivalryHeatBand, toTraitBand, toWinRateAssessment,
  toPrizeBand, toScandalBand, toRikishiDescriptor,
  STAT_BANDS, CONDITION_BANDS, FATIGUE_BANDS, RIVALRY_HEAT_BANDS, TRAIT_BANDS, SCANDAL_BANDS,
  STAT_BAND_LABELS, CONDITION_LABELS, FATIGUE_LABELS, MOMENTUM_LABELS,
  RIVALRY_HEAT_LABELS, TRAIT_LABELS, WIN_RATE_LABELS, PRIZE_LABELS, SCANDAL_LABELS,
} from "./descriptorBands";
export type {
  BandDef, StatBand, ConditionBand, FatigueBand, MomentumBand,
  FinancialBand, TraitBand, WinRateAssessment, PrizeBand, ScandalBand,
  RikishiDescriptor,
} from "./descriptorBands";
