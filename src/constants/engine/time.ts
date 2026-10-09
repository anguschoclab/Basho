/**
 * Time-related constants for the game engine.
 */

/** Number of weeks in a year */
export const WEEKS_PER_YEAR = 52;

/** Maximum age of events to keep in log (in weeks) */
export const MAX_EVENT_AGE_WEEKS = 52;

/** Time thresholds for rivalry decay */
export const RIVALRY_DECAY_THRESHOLDS = {
  /** Weeks before decay starts */
  SHORT_TERM: 4,
  /** Medium-term decay threshold */
  MEDIUM_TERM: 12,
  /** Long-term decay threshold */
  LONG_TERM: 30,
} as const;

/** Decay rates for rivalry attributes */
export const RIVALRY_DECAY_RATES = {
  /** Heat decay rate (short/medium/long term) */
  HEAT: { SHORT: 0.5, MEDIUM: 1.0, LONG: 1.5 },
  /** Closeness decay per week */
  CLOSENESS: 0.25,
  /** Spite decay per week */
  SPITE: 0.35,
} as const;

/** Rivalry pruning thresholds */
export const RIVALRY_PRUNING = {
  /** Minimum heat to avoid pruning */
  MIN_HEAT: 5,
  /** Minimum meetings to avoid pruning */
  MIN_MEETINGS: 2,
} as const;

/** Morale boost duration (in weeks) after a basho victory */
export const MORALE_BOOST_DURATION_WEEKS = 4;

/** Sponsor contract renewal window (in weeks before expiration) */
export const SPONSOR_RENEWAL_WINDOW_WEEKS = 8;

/** Minimum sponsor loyalty for auto-renewal */
export const SPONSOR_MIN_LOYALTY_FOR_RENEWAL = 60;
