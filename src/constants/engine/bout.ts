/**
 * Bout physics and combat constants.
 */

/** Maximum heat value for rivalries */
export const MAX_RIVALRY_HEAT = 100;

/** Maximum closeness value for rivalries */
export const MAX_RIVALRY_CLOSENESS = 100;

/** Maximum spite value for rivalries */
export const MAX_RIVALRY_SPITE = 100;

// ── Tactic profile constants ──────────────────────────────────────────────────

// Kimarite weight biases
export const KIMARITE_BIAS_BELT_YOTSU = 1.3;
export const KIMARITE_BIAS_PUSH_YOTSU = 0.8;
export const KIMARITE_BIAS_PUSH_OSHI = 1.3;
export const KIMARITE_BIAS_BELT_OSHI = 0.8;
export const KIMARITE_BIAS_TRICK_HENKA = 1.5;
export const KIMARITE_BIAS_TRICK_DEFENSIVE = 1.2;
export const KIMARITE_BIAS_SPEED_DEFENSIVE = 1.1;
export const KIMARITE_BIAS_PUSH_ALL_OUT = 1.4;
export const KIMARITE_BIAS_TRICK_NEKODAMASHI = 1.6;
export const KIMARITE_BIAS_SPEED_NEKODAMASHI = 1.2;

// Injury risk multipliers
export const INJURY_RISK_MULT_NORMAL = 1.0;
export const INJURY_RISK_MULT_OSHI_THRUST = 1.1;
export const INJURY_RISK_MULT_HENKA = 0.8;
export const INJURY_RISK_MULT_DEFENSIVE = 0.7;
export const INJURY_RISK_MULT_ALL_OUT = 1.5;

// Tachiai power modifiers
export const TACHIAI_POWER_MOD_YOTSU = 1;
export const TACHIAI_POWER_MOD_OSHI = 2;
export const TACHIAI_POWER_MOD_HENKA = -10;
export const TACHIAI_POWER_MOD_DEFENSIVE = -3;
export const TACHIAI_POWER_MOD_ALL_OUT = 3;

// Fatigue costs
export const FATIGUE_COST_YOTSU = 2;
export const FATIGUE_COST_OSHI = 3;
export const FATIGUE_COST_LIGHT = 1;
export const FATIGUE_COST_ALL_OUT = 8;

// Momentum penalties/rewards
export const MOMENTUM_WIN_YOTSU = 1;
export const MOMENTUM_LOSS_YOTSU = -1;
export const MOMENTUM_WIN_OSHI = 2;
export const MOMENTUM_LOSS_OSHI = -2;
export const MOMENTUM_WIN_HENKA = -3;
export const MOMENTUM_LOSS_HENKA = -2;
export const MOMENTUM_WIN_ALL_OUT = 4;
export const MOMENTUM_LOSS_ALL_OUT = -4;

// ── Kinjite (forbidden technique DQ) constants ────────────────────────────────

/** Minimum aggression/technique ratio to trigger foul risk. */
export const KINJITE_MIN_RATIO_FOR_FOUL_RISK = 1.4;

/** Base DQ probability before desperation scaling. */
export const KINJITE_BASE_DQ_CHANCE = 0.002;

/** Additional DQ probability on senshuraku weekend (days 14-15). */
export const KINJITE_SENSHURAKU_BONUS = 0.003;

/** Additional DQ probability when winner is 7-7 (must-win pressure). */
export const KINJITE_SEVEN_SEVEN_BONUS = 0.005;

/** Additional DQ probability when winner is kadoban ozeki. */
export const KINJITE_KADOBAN_BONUS = 0.004;

/** Maximum DQ probability cap. */
export const KINJITE_MAX_DQ_CHANCE = 0.05;

/** Senshuraku weekend start day. */
export const KINJITE_SENSHURAKU_START_DAY = 14;

/** Kadoban ozeki day threshold. */
export const KINJITE_KADOBAN_DAY_THRESHOLD = 10;

/** Kadoban ozeki win threshold. */
export const KINJITE_KADOBAN_WIN_THRESHOLD = 8;

/** Ratio subtraction for DQ scaling. */
export const KINJITE_RATIO_SUBTRACTION = 1.0;

/** Ratio divisor for DQ scaling. */
export const KINJITE_RATIO_DIVISOR = 2;

// ── Yaocho (match-fixing) constants ───────────────────────────────────────────

/** Base probability of yaocho detection per suspicious bout. */
export const YAOCHO_BASE_DETECTION_CHANCE = 0.01;

/** Additional chance per suspicious indicator. */
export const YAOCHO_PER_INDICATOR_CHANCE = 0.02;

/** Maximum detection chance cap. */
export const YAOCHO_MAX_CHANCE = 0.15;

/** Minimum repeated identical kimarite to flag as suspicious. */
export const YAOCHO_REPEAT_KIMARITE_THRESHOLD = 3;

/** Minimum h2h meetings to flag dominance pattern as suspicious. */
export const YAOCHO_H2H_DOMINANCE_MIN_MEETINGS = 4;

/** Win rate threshold for suspicious dominance. */
export const YAOCHO_H2H_DOMINANCE_WIN_RATE = 0.9;

/** Senshuraku weekend start day. */
export const YAOCHO_SENSHURAKU_START_DAY = 14;

/** Same-heya + 7-7 bonus chance. */
export const YAOCHO_SAME_HEYA_77_BONUS = 0.05;

/** Suspiciously short bout duration threshold (seconds). */
export const YAOCHO_SHORT_BOUT_THRESHOLD = 3;

/** Default bout duration if missing. */
export const YAOCHO_DEFAULT_DURATION = 10;

/** Severity indicator count thresholds. */
export const YAOCHO_SEVERITY_CRITICAL_INDICATORS = 4;
export const YAOCHO_SEVERITY_MAJOR_INDICATORS = 2;

// ── Bout phase loop constants ─────────────────────────────────────────────────

/** Momentum score accumulation factor per tick. */
export const MOMENTUM_SCORE_FACTOR = 0.01;

/** Momentum dominant threshold (absolute value to determine dominant side). */
export const MOMENTUM_DOMINANT_THRESHOLD = 0.5;

/** Tick intervals for fatigue snapshot logging. */
export const FATIGUE_LOG_TICK_1 = 10;
export const FATIGUE_LOG_TICK_2 = 20;

/** Instability floor for timeout stability comparison. */
export const INSTABILITY_FLOOR = 0.01;
