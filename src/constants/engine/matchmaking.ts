/**
 * Matchmaking Constants
 * ======================
 * Constants governing Swiss algorithm pairing weights and phase boundaries.
 */

// Swiss phase boundaries
export const SWISS_PHASE_START_DAY = 8;
export const SWISS_PHASE_END_DAY = 14;
export const SWISS_PHASE1_END_DAY = 7;
export const SWISS_PHASE3_DAY = 15;

// Division pairing weights
export const SEKIWAKE_PAIRING_WEIGHT = 200;
export const KOMUSUBI_PAIRING_WEIGHT = 300;
export const MAEGASHIRA_PAIRING_WEIGHT = 400;
export const JURYO_PAIRING_WEIGHT = 500;
export const MAKUSHITA_PAIRING_WEIGHT = 600;
export const SANDANME_PAIRING_WEIGHT = 700;
export const JONIDAN_PAIRING_WEIGHT = 800;
export const JONOKUCHI_PAIRING_WEIGHT = 900;

// Swiss rank ordinals
export const SWISS_RANK_YOKOZUNA = 0;
export const SWISS_RANK_OZEKI = 100;
export const SWISS_RANK_SEKIWAKE = 200;
export const SWISS_RANK_KOMUSUBI = 300;
export const SWISS_RANK_MAEGASHIRA = 400;
export const SWISS_RANK_JURYO = 500;
export const SWISS_RANK_MAKUSHITA = 600;
export const SWISS_RANK_SANDANME = 700;
export const SWISS_RANK_JONIDAN = 800;
export const SWISS_RANK_JONOKUCHI = 900;
export const SWISS_RANK_DEFAULT = 9000;

// Swiss pairing thresholds
export const M1_TO_M4_THRESHOLD = 4;
export const PROXIMITY_OFFSET_MAX = 3;
export const HOT_STREAK_WINS_THRESHOLD = 10;
export const RIVALRY_TENSION_THRESHOLD = 0.5;
export const RIVALRY_HEAT_BONUS = 0.3;

// Swiss algorithm magic numbers
export const RANK_NUMBER_MULTIPLIER = 2;
export const SIDE_EAST_OFFSET = 0;
export const SIDE_WEST_OFFSET = 1;
export const PROXIMITY_OFFSET_START = 1;
export const SCORE_CLAMP_MIN = 0;
export const SCORE_CLAMP_MAX = 5;
export const UNPAIRED_INCREMENT = 2;
export const FINALE_INDEX = 0;

// ── Drama scoring thresholds ──────────────────────────────────────────────────

// Drama day thresholds
export const DRAMA_DAY_SENSHURAKU = 15;
export const DRAMA_DAY_KADOBAN_START = 10;
export const DRAMA_DAY_DEMOTION_START = 12;
export const DRAMA_DAY_YOKOZUNA_HUNT_START = 10;
export const DRAMA_DAY_YOKOZUNA_HUNT_END = 14;
export const DRAMA_DAY_RELEGATION_START = 14;
export const DRAMA_DAY_WINLESS_START = 5;

// Record thresholds
export const DRAMA_MAKE_OR_BREAK_WINS = 7;
export const DRAMA_KADOBAN_WIN_THRESHOLD = 8;
export const DRAMA_YUSHO_CONTENDER_GAP = 2;
export const DRAMA_YUSHO_LEADER_MIN_WINS = 10;
export const DRAMA_DEMOTION_WIN_THRESHOLD = 6;
export const DRAMA_RELEGATION_WIN_THRESHOLD = 4;

// Rivalry thresholds
export const DRAMA_GRUDGE_HEAT_THRESHOLD = 70;
export const DRAMA_RIVALRY_HEAT_THRESHOLD = 40;
export const DRAMA_RIVALRY_SCORE_BASE = 50;
export const DRAMA_RIVALRY_SCORE_CAP = 95;
export const DRAMA_RIVALRY_SCORE_DIVISOR = 2;

// Career thresholds
export const DRAMA_ROOKIE_TOTAL_BOUTS = 5;
export const DRAMA_VETERAN_TOTAL_BOUTS = 200;
export const DRAMA_DEBUT_MAKUUCHI_BOUTS = 1;
export const DRAMA_DEBUT_TOTAL_BOUTS = 15;

// Streak threshold
export const DRAMA_STREAK_BREAKER_THRESHOLD = 5;

// Drama scores
export const DRAMA_SCORE_MAKE_OR_BREAK = 100;
export const DRAMA_SCORE_GRUDGE_MATCH = 95;
export const DRAMA_SCORE_KADOBAN = 90;
export const DRAMA_SCORE_YUSHO_DECIDER = 85;
export const DRAMA_SCORE_COMEBACK = 65;
export const DRAMA_SCORE_DEBUT_SHOWCASE = 65;
export const DRAMA_SCORE_YOKOZUNA_HUNT = 70;
export const DRAMA_SCORE_SENSHURAKU_FINALE = 70;
export const DRAMA_SCORE_ARCHETYPE_CLASH = 60;
export const DRAMA_SCORE_DEMOTION_DANGER = 60;
export const DRAMA_SCORE_RELEGATION_BATTLE = 60;
export const DRAMA_SCORE_ROOKIE_VS_VETERAN = 55;
export const DRAMA_SCORE_KINBOSHI_HUNT = 50;
export const DRAMA_SCORE_STREAK_BREAKER = 50;
export const DRAMA_SCORE_WINLESS_WARRIOR = 45;
export const DRAMA_SCORE_ORIGIN_MATCHUP = 40;

// Swap budget
export const DRAMA_MAX_SWAPS_DEFAULT = 3;
export const DRAMA_MAX_SWAPS_WITH_RIVALRY = 5;

// ── Matchmaking similarity weights ────────────────────────────────────────────

export const RECORD_SIMILARITY_DIFF_MULT = 0.5;
export const RANK_SIMILARITY_DIFF_RANK_SCORE = 0.25;
export const RANK_SIMILARITY_NO_RANKNUM_SCORE = 0.75;
export const RANK_SIMILARITY_DIFF_MULT = 0.35;

// ── Matchmaking score multipliers ─────────────────────────────────────────────

export const MATCH_BASE_SCORE = 1.0;
export const MATCH_LATE_RECORD_WEIGHT = 0.2;
export const MATCH_LATE_SIMILARITY_WEIGHT = 0.8;
export const MATCH_STRICT_RECORD_THRESHOLD = 0.9;
export const MATCH_YUSHO_CONTENDER_MULTIPLIER = 2.0;
export const MATCH_EARLY_RECORD_WEIGHT = 0.6;
export const MATCH_EARLY_SIMILARITY_WEIGHT = 0.4;
export const MATCH_SIMILAR_RECORDS_THRESHOLD = 0.75;
export const MATCH_SANYAKU_MATCHUP_MULTIPLIER = 1.5;
export const MATCH_SANYAKU_AVOIDED_MULTIPLIER = 0.5;
export const MATCH_JOI_JIN_SIMILARITY_THRESHOLD = 0.5;
export const MATCH_JOI_JIN_MULTIPLIER = 1.2;
export const MATCH_RANK_SCORE_WEIGHT = 0.6;
export const MATCH_RANK_SIMILARITY_WEIGHT = 0.4;
export const MATCH_SIMILAR_RANK_THRESHOLD = 0.75;
export const MATCH_FACED_PENALTY = 0.65;
export const MATCH_KADOBAN_PRESSURE_MULTIPLIER = 1.4;

// ── Matchmaking side bonus ────────────────────────────────────────────────────

export const SIDE_HONOR_BONUS = 0.2;

// ── Matchmaking day/record thresholds ─────────────────────────────────────────

export const MATCH_DAY_LATE_THRESHOLD = 7;
export const MATCH_YUSHO_CONTENDER_MIN_WINS = 11;
