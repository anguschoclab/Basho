/**
 * Extended recruitment system constants.
 */

/**
 * Target roster size per heya — headroom cap under the gap controller.
 * The replacement controller (RecruitmentController.allocateVacancies) uses this
 * as the per-heya ceiling when distributing the global replacement gap. The
 * controller's `Math.max(0, target - active)` clamp prevents over-growth toward
 * 45 × 30 = 1350; intake stops at `_populationTarget` (~1084 at worldgen).
 * Must be >= ceil(1084 / 45) ≈ 25 to ensure total headroom can absorb the gap.
 */
export const TARGET_ROSTER_SIZE = 30;

/** Critical roster threshold — legacy per-heya floor, retained for reference. */
export const CRITICAL_ROSTER_THRESHOLD = 12;

/**
 * Total active rikishi threshold — safety-net floor for emergency full-dump
 * in TalentPoolMaintenance. Under the gap controller, replacement runs every
 * weekly tick above this floor, so this only triggers if the controller itself
 * fails to hold the population. Must stay in (600, 1084) to avoid fighting
 * the controller or firing too late.
 */
export const TOTAL_ACTIVE_THRESHOLD = 800;

/** Interim duration in days */
export const INTERIM_DURATION_DAYS = 42;

/** Recruitment window closes after weeks */
export const RECRUITMENT_WINDOW_CLOSES_WEEKS = 2;

/** Primary recruitment window week */
export const PRIMARY_RECRUITMENT_WINDOW_WEEK = 3;

/** Secondary recruitment window week */
export const SECONDARY_RECRUITMENT_WINDOW_WEEK = 0;

/** Scouting bias maximum value */
export const SCOUTING_BIAS_MAX = 20;

/** Scouting bias decay factor at 20 observations */
export const SCOUTING_BIAS_DECAY_OBSERVATIONS = 20;

/** Scouting bias decay factor at 100 observations */
export const SCOUTING_BIAS_DECAY_MAX_OBSERVATIONS = 100;

/** Passive scouting base multiplier */
export const PASSIVE_SCOUTING_MULTIPLIER = 2;

/** Passive scouting maximum base */
export const PASSIVE_SCOUTING_MAX_BASE = 30;

/** Fog of war certainty threshold */
export const FOG_OF_WAR_CERTAIN_THRESHOLD = 95;

/** Fog of war high threshold */
export const FOG_OF_WAR_HIGH_THRESHOLD = 70;

/** Fog of war medium threshold */
export const FOG_OF_WAR_MEDIUM_THRESHOLD = 40;

/** Fog of war low threshold */
export const FOG_OF_WAR_LOW_THRESHOLD = 15;

/** Fog of war investment bonus high */
export const FOG_OF_WAR_INVESTMENT_HIGH = 75;

/** Fog of war investment bonus medium */
export const FOG_OF_WAR_INVESTMENT_MEDIUM = 50;

/** Fog of war investment bonus low */
export const FOG_OF_WAR_INVESTMENT_LOW = 25;

/** Fog of war error range low */
export const FOG_OF_WAR_ERROR_RANGE_LOW = 35;

/** Fog of war error range medium */
export const FOG_OF_WAR_ERROR_RANGE_MEDIUM = 20;

/** Fog of war probability threshold */
export const FOG_OF_WAR_PROBABILITY_THRESHOLD = 0.5;

/** Observation count limit for memory */
export const OBSERVATION_COUNT_LIMIT = 10;

/** Memory importance value */
export const MEMORY_IMPORTANCE = 10;

/** Max scouting level */
export const MAX_SCOUTING_LEVEL = 100;

/** Style high observations threshold */
export const STYLE_HIGH_OBSERVATIONS = 3;

/** Style medium observations threshold */
export const STYLE_MEDIUM_OBSERVATIONS = 1;

/** Potential high threshold */
export const POTENTIAL_HIGH_THRESHOLD = 95;

/** Potential medium threshold */
export const POTENTIAL_MEDIUM_THRESHOLD = 75;

/** Potential low threshold */
export const POTENTIAL_LOW_THRESHOLD = 50;

/** High error percentage */
export const HIGH_ERROR_PERCENTAGE = 9;

/** Full bias factor */
export const FULL_BIAS_FACTOR = 1.0;
