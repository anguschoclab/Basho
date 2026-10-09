/**
 * rikishiAgency.ts — tuning constants for WS4 rikishi-level agency.
 * All values are deterministic thresholds/probabilities; no hidden inputs.
 */

/** Minimum weeks between two requests from the same rikishi. */
export const REQUEST_COOLDOWN_WEEKS = 4;

export const REST_FATIGUE_THRESHOLD = 70;
export const INTENSITY_MOTIVATION_THRESHOLD = 75;
export const INTENSITY_FATIGUE_MAX = 35;
export const TRANSFER_SATISFACTION_MAX = 30;
export const TRANSFER_RESTLESSNESS_THRESHOLD = 70;
export const RETIREMENT_AGE_MIN = 34;
export const RETIREMENT_SATISFACTION_MAX = 30;
export const MENTOR_MAX_AGE = 23;
export const DISPUTE_MOMENTUM_MAX = 25;
export const DISPUTE_RESTLESSNESS_THRESHOLD = 55;

/** Incident escalation gates + per-week trigger probability. */
export const INCIDENT_RESTLESSNESS_THRESHOLD = 80;
export const INCIDENT_STRESS_THRESHOLD = 70;
export const INCIDENT_PROBABILITY = 0.3;
/** Below this discipline, unrest escalates to a scandal; otherwise welfare pressure. */
export const INCIDENT_DISCIPLINE_SCANDAL_MAX = 40;
export const INCIDENT_WELFARE_RISK_DELTA = 4;
export const INCIDENT_STRESS_RELIEF = 15;
export const INCIDENT_MOTIVATION_DELTA = 10;

/** Outcome deltas. */
export const DENY_STRESS_DELTA = 10;
export const DENY_RESTLESSNESS_DELTA = 15;
export const DENY_MOTIVATION_DELTA = 5;
export const REST_FATIGUE_RELIEF = 25;
export const GRANT_MOTIVATION_DELTA = 5;
export const GRANT_STRESS_RELIEF = 10;
export const GRANT_SATISFACTION_DELTA = 10;
