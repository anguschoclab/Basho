/**
 * Bout physics constants.
 */

/** Base mass calculation offset (kg) */
export const MASS_BASE_OFFSET = 80;

/** Mass calculation multiplier for weight stat */
export const MASS_WEIGHT_MULTIPLIER = 1.2;

/** Default weight stat for mass calculation (kg) */
export const DEFAULT_WEIGHT_STAT = 120;

/** Default height stat for CoG calculation (cm) */
export const DEFAULT_HEIGHT_STAT = 180;

/** Height to meters conversion factor */
export const HEIGHT_TO_METERS = 0.01;

/** CoG height as fraction of height */
export const COG_HEIGHT_FRACTION = 0.54;

/** Tachiai/force: power stat contribution multiplier */
export const FORCE_POWER_MULTIPLIER = 0.5;

/**
 * Tachiai/force: speed stat contribution multiplier.
 * (Renamed from FORCE_WEIGHT_MULTIPLIER — the live force formula uses the speed
 * stat here, not weight; the old name was inherited from a deleted engine.)
 */
export const FORCE_SPEED_MULTIPLIER = 0.3;

/** Tachiai/force: aggression stat contribution multiplier */
export const FORCE_AGGRESSION_MULTIPLIER = 0.2;

/** Fatigue penalty per fatigue point */
export const FATIGUE_PENALTY_PER_POINT = 0.004;

/** Minimum force after fatigue penalty */
export const MIN_FORCE_AFTER_FATIGUE = 0.6;

/** Minimum absolute force */
export const MIN_ABSOLUTE_FORCE = 1;

/** Momentum threshold for oshitaoshi kimarite */
export const MOMENTUM_THRESHOLD_OSHITAOSHI = 15;

/** Torque threshold for moderate throws */
export const TORQUE_THRESHOLD_MODERATE = 10;

/** Torque threshold for high throws */
export const TORQUE_THRESHOLD_HIGH = 20;

/** Mass advantage force multiplier per kg */
export const MASS_ADVANTAGE_MULTIPLIER = 0.05;

/** Contest line jitter multiplier */
export const CONTEST_LINE_JITTER_MULTIPLIER = 0.01;

/** Displacement per force unit (meters per tick) */
export const DISPLACEMENT_PER_FORCE = 0.04;

/** Torque to velocity conversion multiplier */
export const TORQUE_VELOCITY_MULTIPLIER = 0.05;

/** Crisis opponent pressure to pressure increase multiplier */
export const CRISIS_PRESSURE_MULTIPLIER = 0.02;

/** Bounce force to bonus conversion divisor */
export const BOUNCE_FORCE_DIVISOR = 100;

/** Minimum tick decay in crisis */
export const MIN_TICK_DECAY = 0.1;

/** Tick decay per crisis tick */
export const TICK_DECAY_PER_CRISIS = 0.05;

/** Minimum foot spread for stability calculation */
export const MIN_FOOT_SPREAD = 0.01;

/** CoG offset threshold for edge detection */
export const COG_OFFSET_EDGE_THRESHOLD = 0.05;

/** Default arm reach (meters) */
export const DEFAULT_ARM_REACH = 0.08;

/** Arm reach threshold for deep grip */
export const ARM_REACH_DEEP_THRESHOLD = 0.12;

/** Base foot spread (meters) */
export const BASE_FOOT_SPREAD = 0.35;

/** Foot spread variation per balance stat */
export const FOOT_SPREAD_BALANCE_VARIATION = 0.15;

/** Toe position threshold for edge */
export const TOE_POSITION_EDGE_THRESHOLD = 0.5;

/** Edge distance when at toe position (meters) */
export const EDGE_DISTANCE_AT_TOE = 15.0;

/** Velocity threshold for edge exit */
export const VELOCITY_EDGE_EXIT_THRESHOLD = 0.5;

/** Probability threshold for tsukidashi vs oshidashi */
export const TSUKIDASHI_PROBABILITY_THRESHOLD = 0.25;

/** Maximum bout ticks */
export const MAX_BOUT_TICKS = 120;

/** Bout duration seconds per tick */
export const BOUT_SECONDS_PER_TICK = 2;

/** Maximum bout duration (seconds) */
export const MAX_BOUT_DURATION_SECONDS = 240;

/** Belt threshold for grip calculation */
export const BELT_THRESHOLD_MAX = 0.7;

/** Belt bias divisor */
export const BELT_BIAS_DIVISOR = 200;

/** Cog offset to balance conversion multiplier */
export const COG_OFFSET_BALANCE_MULTIPLIER = 200;

/** CoG offset to balance divisor */
export const COG_OFFSET_BALANCE_DIVISOR = 200;

/** Grip jitter range */
export const GRIP_JITTER_RANGE = 0.1;

/** Kimarite weight multiplier for nage/hineri category */
export const KIMARITE_WEIGHT_NAGE_MULTIPLIER = 1.3;

/** Kimarite weight multiplier for kihon category (reduction) */
export const KIMARITE_WEIGHT_KIHON_REDUCTION = 0.8;

/** Kimarite weight multiplier for kihon category (boost) */
export const KIMARITE_WEIGHT_KIHON_BOOST = 1.5;

/** Kimarite weight multiplier for non-favored techniques */
export const KIMARITE_WEIGHT_NON_FAVORED = 0.4;

/** Kimarite weight multiplier for favored techniques */
export const KIMARITE_WEIGHT_FAVORED = 1.5;

/** Tone-specific weight multipliers */
export const TONE_WEIGHT_MULTIPLIERS = {
  explosive_push: 1.15,
  classic_belt: 1.15,
  technical_speed: 1.15,
  defensive_trick: 1.15,
} as const;

/** Minimum success probability */
export const MIN_SUCCESS_PROBABILITY = 0.05;

/** Maximum success probability */
export const MAX_SUCCESS_PROBABILITY = 0.97;

/** Base success probability divisor */
export const SUCCESS_PROBABILITY_DIVISOR = 10;

/** Makuuchi division probability bonus */
export const MAKUUCHI_PROBABILITY_BONUS = 0.1;

/** Jonidan/jonokuchi division probability penalty */
export const LOWER_DIVISION_PROBABILITY_PENALTY = 0.15;

/** Favored kimarite execution boost */
export const FAVORED_KIMARITE_BOOST = 0.08;

/** Division-specific probability adjustments */
export const DIVISION_PROBABILITY_ADJUSTMENTS = {
  makuuchi: 0.1,
  jonidan: -0.15,
  jonokuchi: -0.15,
} as const;

/** Aggression speed multiplier */
export const AGGRESSION_SPEED_MULTIPLIER = 1.5;

/** Aggression contribution multiplier */
export const AGGRESSION_CONTRIBUTION_MULTIPLIER = 0.5;

/** Stamina fatigue calculation divisor */
export const STAMINA_FATIGUE_DIVISOR = 0.02;

/** Minimum stamina fatigue divisor */
export const MIN_STAMINA_FATIGUE_DIVISOR = 0.5;

/** Technique margin for arm reach increase */
export const TECHNIQUE_MARGIN_ARM_REACH = 12;

/** Duration to closeness conversion divisor */
export const DURATION_TO_CLOSENESS_DIVISOR = 12;

/** Duration to domination conversion divisor */
export const DURATION_TO_DOMINATION_DIVISOR = 10;

/** Default closeness when no duration */
export const DEFAULT_CLOSENESS = 0.5;

/** Default domination when no duration */
export const DEFAULT_DOMINATION = 0.2;

/** Duration threshold for kinboshi bonus */
export const KINBOSHI_DURATION_THRESHOLD = 15;

// --- Bout geometry / edge (extracted from boutPhaseLoop.ts) ---

/** Destabilization per force differential (m/N) */
export const COG_OFFSET_PER_FORCE = 0.003;

/** Positional displacement from torque (m/N) */
export const TORQUE_DISPLACEMENT_MULTIPLIER = 0.005;

/** Escape resistance from available force (1/N) */
export const ESCAPE_RESISTANCE_MULTIPLIER = 0.008;

/** Maps overage to toePosition (m) */
export const TOE_OVERAGE_SCALE = 0.75;

/** Toe past this = forced out (dimensionless) */
export const TOE_POSITION_FORCED_OUT = 1.5;

/** ToePosition clamp upper bound (dimensionless) */
export const TOE_POSITION_MAX = 2.0;

/** |torqueAdvantage| to trigger edge crisis from belt (N) */
export const TORQUE_EDGE_CRISIS_THRESHOLD = 30;

/** avgFoot > this = "rear" (m) */
export const POSITION_REAR_THRESHOLD = 3.5;

/** avgFoot > this = "lateral" (m) */
export const POSITION_LATERAL_THRESHOLD = 2.0;

/** Restored momentum multiplier after escape (dimensionless) */
export const EDGE_ESCAPE_MOMENTUM_RETENTION = 0.4;

/** Base chance for isamiashi/tsukite reversals (dimensionless) */
export const POST_RESOLUTION_REVERSAL_CHANCE = 0.015;

// --- Lever arms (extracted from boutGrip.ts) ---

/** Initial lever arm (m) */
export const LEVER_ARM_BASE = 0.24;

/** Tachiai winner inside arm (m) */
export const LEVER_ARM_TACHIAI_WIN = 0.29;

/** Tachiai winner partial inside arm (m) */
export const LEVER_ARM_TACHIAI_PARTIAL = 0.27;

/** Deep grip lever arm (m) */
export const LEVER_ARM_DEEP = 0.31;

/** Maemitsu grip lever arm (m) */
export const LEVER_ARM_MAEMITSU = 0.34;

// --- 1.75D Lateral & Angular DOF (TUNABLE) ---

/** Clamp for z displacement (m) */
export const LATERAL_MAX_OFFSET = 0.6;

/**
 * Per-tick z restoration toward 0 (dimensionless/tick).
 * The lateral integrator is two-stage (velocity then position), so steady-state
 * gain ≈ (d/(1-d))² — keep this well below 1 so a lateral nudge stays bounded and
 * self-centers in a few ticks instead of pegging the clamp every tick.
 */
export const LATERAL_RESTORING_DECAY = 0.6;

/**
 * Per-tick probability the retreating fighter attempts a lateral slip =
 * (defenderSpeed / 100) * this. Discrete (stochastic, seeded) rather than a
 * steady drift so even a sustained one-sided fast duel flickers between square
 * pushing and glancing instead of saturating to permanent off-axis.
 */
export const LATERAL_SLIP_CHANCE = 0.35;

/**
 * Lateral momentum added on a successful slip (m). Sized (with
 * LATERAL_RESTORING_DECAY) so one slip briefly pushes past
 * ENGAGEMENT_ANGLE_GLANCING_THRESHOLD then decays over a couple of ticks.
 */
export const LATERAL_SLIP_IMPULSE = 0.5;

/** Belt rotation → lateral drift: facingAngle * this feeds lateral momentum. */
export const LATERAL_ANGULAR_DRIFT_SCALE = 0.12;

/** x-force multiplier when engagement is glancing (dimensionless) */
export const OFF_AXIS_FORCE_FALLOFF = 0.7;

/** Above this = glancing blow (rad) */
export const ENGAGEMENT_ANGLE_GLANCING_THRESHOLD = 0.3;

/** Torque → angular velocity (rad/N) */
export const ANGULAR_TORQUE_SCALE = 0.002;

/** Per-tick angular clamp (rad/tick) */
export const ANGULAR_MAX_VELOCITY = 0.05;

/** Per-tick facingAngle restoration (dimensionless/tick) */
export const ANGULAR_RESTORING_DECAY = 0.9;

/** escapeAngle > this classifies as utchari (rad) */
export const UTCHARI_PIVOT_THRESHOLD = 0.4;

/** Engagement log entry every N ticks */
export const NARRATIVE_TICK_CADENCE = 5;

// --- Condition multiplier (from boutUtils.ts) ---
export const CONDITION_MULTIPLIER_FLOOR = 0.8;
export const CONDITION_MULTIPLIER_RANGE = 0.2;

// --- H2H confidence (from boutUtils.ts) ---
export const H2H_NEUTRAL_RECORD = 0.5;
export const H2H_CONFIDENCE_SCALE = 8;

// --- Style weakness penalty (from boutUtils.ts) ---
export const STYLE_WEAKNESS_PENALTY = 0.92;

// --- Edge crisis recovery (from boutUtils.ts) ---
export const EDGE_CRISIS_MENTAL_FACTOR = 0.005;
export const EDGE_CRISIS_BALANCE_FACTOR = 0.002;

// --- Stamina fatigue (from boutUtils.ts) ---
export const STAMINA_FATIGUE_MULTIPLIER = 0.02;
export const STAMINA_FATIGUE_FLOOR = 0.5;

// --- Tawara bounce resistance (from boutSpatial.ts) ---
export const TAWARA_BOUNCE_RESISTANCE_HEEL = 8.0;

// --- Utchari thresholds (from boutSpatial.ts) ---
export const UTCHARI_ESCAPE_ANGLE_THRESHOLD = 0.3;
export const UTCHARI_MIN_TICKS_IN_CRISIS = 3;

// --- Okuridashi/Okuritaoshi thresholds (from boutSpatial.ts) ---
export const OKURIDASHI_PRESSURE_Z_THRESHOLD = 0.5;
export const OKURITAOSHI_PRESSURE_Z_THRESHOLD = 0.3;

// --- Grip constants (from boutGrip.ts) ---
export const INITIAL_ARM_REACH = 0.1;
export const GRIP_RANDOM_CHANCE = 0.5;
export const MAX_ARM_REACH = 0.15;
export const ARM_REACH_INCREMENT = 0.005;
export const GRIP_RNG_FACTOR_MIN = 0.9;
export const GRIP_RNG_FACTOR_RANGE = 0.2;
export const GRIP_DEEPEN_MARGIN = 12;
export const GRIP_DEEPEN_TECHNIQUE_MARGIN = 15;

// --- Bout resolution constants (from boutResolver.ts) ---
export const CONTENTION_WINDOW = 2;
export const FINAL_DAY = 15;
export const HENKA_MOMENTUM_PENALTY = 15;
export const KENSHO_BASE_COUNT_LOW = 2;
export const KENSHO_BASE_COUNT_MID = 5;
export const KENSHO_BASE_COUNT_HIGH = 12;
export const KENSHO_BASE_COUNT_PEAK = 25;
export const KENSHO_RNG_MIN = 0.8;
export const KENSHO_RNG_RANGE = 0.4;
export const RIVALRY_HEAT_AGGRESSION_MULTIPLIER = 0.15;
export const RIVALRY_SPITE_MENTAL_MULTIPLIER = 0.2;
export const DEFAULT_YEAR = 2025;
export const DEFAULT_DAY = 1;
export const DEFAULT_BASHO_NUMBER = 1;

// ─────────────────────────────────────────
// Bout phase loop constants
// ─────────────────────────────────────────

/** Tachiai impact velocity */
export const TACHIAI_IMPACT_VELOCITY = 8.0;

/** Jitter magnitude for tachiai power calculation */
export const TACHIAI_JITTER_MAGNITUDE = 8;

/** Henka jitter magnitude */
export const HENKA_JITTER_MAGNITUDE = 8;

/** In-bout fatigue multiplier for effective fatigue */
export const BOUT_FATIGUE_MULTIPLIER = 0.4;

/** Force differential jitter magnitude */
export const FORCE_DIFF_JITTER_MAGNITUDE = 3;

/** Velocity scaling factor for dominant fighter */
export const DOMINANT_VELOCITY_SCALE = 0.1;

/** Clock multiplier (ticks to seconds) */
export const CLOCK_MULTIPLIER = 2;

/** Belt battle velocity scaling factor */
export const BELT_BATTLE_VELOCITY_SCALE = 0.05;

/** Edge crisis recovery probability */
export const EDGE_CRISIS_RECOVERY_PROBABILITY = 0.3;

/** Tawara toe position max (normalized) */
export const TOE_POSITION_NORMALIZED_MAX = 1.0;

/** Opponent pressure Z multiplier */
export const OPPONENT_PRESSURE_Z_MULTIPLIER = 0.01;

/** Angular escape power scaling */
export const ANGULAR_ESCAPE_POWER_SCALE = 50;

/** Escape margin threshold */
export const ESCAPE_MARGIN_THRESHOLD = 2;

/** Escape base probability */
export const ESCAPE_BASE_PROBABILITY = 0.5;

/** Escape margin probability multiplier */
export const ESCAPE_MARGIN_PROBABILITY_MULTIPLIER = 0.05;

/** Instability threshold for isamiashi */
export const ISAMIASHI_INSTABILITY_THRESHOLD = 0.9;

/** Duration minimum (seconds) */
export const DURATION_MIN_SECONDS = 1;

/** Excitement score tick divisor */
export const EXCITEMENT_TICK_DIVISOR = 3;

/** Edge crisis escape excitement points */
export const EDGE_CRISIS_ESCAPE_EXCITEMENT_POINTS = 20;

/** Advantage threshold differential */
export const ADVANTAGE_THRESHOLD_DIFFERENTIAL = 0.05;

/** Balance calculation multiplier */
export const BALANCE_CALCULATION_MULTIPLIER = 10;

// ─────────────────────────────────────────
// Bout resolver constants
// ─────────────────────────────────────────

/** Rivalry heat/spite normalization divisor (convert 0-100 to 0-1) */
export const RIVALRY_NORMALIZATION_DIVISOR = 100;

/** Default stat value when stat is undefined */
export const DEFAULT_STAT_VALUE = 50;

/** Stat clamp minimum */
export const STAT_CLAMP_MIN = 0;

/** Stat clamp maximum */
export const STAT_CLAMP_MAX = 100;

// ─────────────────────────────────────────
// Edge crisis injury constants
// ─────────────────────────────────────────

/** Injury risk multiplier for edge crisis forced exits */
export const EDGE_INJURY_RISK_MULT = 0.001;

/** Injury risk threshold to trigger injury check */
export const EDGE_INJURY_RISK_THRESHOLD = 0.15;

/** Injury severity threshold for moderate (vs minor) */
export const EDGE_INJURY_SEVERITY_MODERATE = 0.3;

/** Controversial toe position multiplier (close calls) */
export const EDGE_CONTROVERSIAL_TOE_MULTIPLIER = 1.1;

/** Controversial escape margin factor */
export const EDGE_CONTROVERSIAL_MARGIN_FACTOR = 0.5;

// ─────────────────────────────────────────
// Tachiai constants
// ─────────────────────────────────────────

/** NPC counter-tactic bonus power */
export const NPC_COUNTER_BONUS = 3;

/** Tachiai speed bonus factor (body type) */
export const TACHIAI_SPEED_BONUS_FACTOR = 0.3;

/** Tachiai margin threshold for "decisive" intensity */
export const TACHIAI_MARGIN_DECISIVE = 20;

/** Tachiai margin threshold for "clear" intensity */
export const TACHIAI_MARGIN_CLEAR = 8;

/** Rounding factor for power logging */
export const POWER_LOG_ROUNDING = 10;

/** Matta (false start) chance */
export const MATTA_CHANCE = 0.05;

/** Default belt bias when combatProfile is missing */
export const DEFAULT_BELT_BIAS = 25;

// ─────────────────────────────────────────
// NPC spontaneous henka constants
// ─────────────────────────────────────────

/** Technique stat threshold for NPC henka attempt */
export const HENKA_TECHNIQUE_THRESHOLD = 60;

/** Speed stat threshold for NPC henka attempt */
export const HENKA_SPEED_THRESHOLD = 60;

/** Power gap required for NPC henka attempt */
export const HENKA_POWER_GAP_THRESHOLD = 15;

/** Max henka chance cap */
export const HENKA_MAX_CHANCE = 0.25;

/** Power gap base subtracted before scaling */
export const HENKA_POWER_GAP_BASE = 15;

/** Power gap scaling factor */
export const HENKA_POWER_GAP_FACTOR = 0.005;

/** Technique base subtracted before scaling */
export const HENKA_TECH_BASE = 60;

/** Technique scaling factor */
export const HENKA_TECH_FACTOR = 0.003;

// ─────────────────────────────────────────
// Counter-tactic reduction constants
// ─────────────────────────────────────────

/** Counter torque reduction for belt battle */
export const COUNTER_TORQUE_REDUCTION = 0.1;

/** Counter force reduction for push battle */
export const COUNTER_FORCE_REDUCTION = 0.1;

/** Torque bonus factor (archetype/body type) */
export const TORQUE_BONUS_FACTOR = 0.5;

// ─────────────────────────────────────────
// Grip evolution constants
// ─────────────────────────────────────────

/** Grip strength fatigue decay rate per fatigue point */
export const GRIP_FATIGUE_DECAY_RATE = 0.003;

/** Pressure grip decay rate per torque differential */
export const PRESSURE_GRIP_DECAY_RATE = 0.001;

/** Torque differential threshold for pressure grip decay */
export const PRESSURE_THRESHOLD = 20;

/** Grip strength floor (minimum after decay) */
export const GRIP_STRENGTH_FLOOR = 0.5;

/** Torque differential threshold for grip breaking */
export const GRIP_BREAK_THRESHOLD = 50;

/** Chance of breaking opponent's grip when dominant */
export const GRIP_BREAK_CHANCE = 0.4;

/** Arm reach reduction multiplier on grip break */
export const GRIP_BREAK_REACH_REDUCTION = 4;
