/**
 * Combat archetype stat modifier constants.
 */

/** Stat modifier for technical archetype */
export const TECHNICAL_STAT_MODIFIERS = {
  technique: 1.2,
  speed: 1.1,
  weight: 0.9,
  power: 0.85,
  mental: 0.9,
} as const;

/** Stat modifier for explosive archetype */
export const EXPLOSIVE_STAT_MODIFIERS = {
  power: 1.1,
  speed: 1.1,
  technique: 0.8,
  mental: 0.85,
} as const;

/** Stat modifier for classic archetype */
export const CLASSIC_STAT_MODIFIERS = {
  technique: 1.15,
  balance: 1.1,
  mental: 1.05,
  power: 0.95,
  speed: 0.9,
} as const;

/** Stat modifier for defensive archetype */
export const DEFENSIVE_STAT_MODIFIERS = {
  balance: 1.2,
  stamina: 1.15,
  mental: 1.1,
  power: 0.9,
  speed: 0.85,
} as const;

/** Stat modifier for powerhouse archetype */
export const POWERHOUSE_STAT_MODIFIERS = {
  power: 1.15,
  speed: 1.05,
  stamina: 0.85,
  technique: 0.9,
  mental: 0.8,
} as const;

/** Stat modifier for balanced archetype */
export const BALANCED_STAT_MODIFIERS = {
  power: 0.9,
  technique: 0.9,
  speed: 0.9,
  stamina: 0.9,
  mental: 0.9,
} as const;

/** Oshi probability threshold */
export const OSHI_PROBABILITY_THRESHOLD = 0.3;

/** Tsuppari probability threshold */
export const TSUPPARI_PROBABILITY_THRESHOLD = 0.8;

/** Archetype probability thresholds for random assignment */
export const ARCHETYPE_OSHI_THRESHOLD = 0.3;
export const ARCHETYPE_YOTSU_THRESHOLD = 0.57;
export const ARCHETYPE_TRICKSTER_THRESHOLD = 0.65;
export const ARCHETYPE_SPEEDSTER_THRESHOLD = 0.73;
export const ARCHETYPE_TSUPPARI_THRESHOLD = 0.8;
export const ARCHETYPE_DEFENSIVE_THRESHOLD = 0.86;
export const ARCHETYPE_GIANT_THRESHOLD = 0.92;
