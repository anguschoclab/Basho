/**
 * Career Constants
 * ================
 * Constants governing career length, milestones, and bout schedules.
 */

// Career basho calculation
export const CAREER_BASHO_BASE = 6;
export const CAREER_BASHO_RANK_MULTIPLIER = 12;
export const CAREER_BASHO_RNG_RANGE = 10;

// Climbing win rate
export const CLIMBING_WIN_RATE_BASE = 0.58;
export const CLIMBING_WIN_RATE_RNG_RANGE = 0.12;

// Yusho thresholds
export const YUSHO_THRESHOLD_15_DAY = 13;
export const YUSHO_THRESHOLD_7_DAY = 6;

// Debut age
export const DEBUT_AGE_BASE = 15;
export const DEBUT_AGE_RNG_RANGE = 5;

// Foreign career years
export const FOREIGN_CAREER_MIN_YEARS = 8;
export const FOREIGN_CAREER_MAX_YEARS = 12;
export const FOREIGN_CAREER_MAX_YEARS_JAPANESE = 15;
export const FOREIGN_CAREER_MAX_YEARS_JAPANESE_ALT = 20;

// Yokozuna career multiplier
export const YOKOZUNA_CAREER_MULTIPLIER = 0.15;

// Bouts per basho
export const BOUTS_PER_BASHO_SEKITORI = 15;
export const BOUTS_PER_BASHO_LOWER_DIVISION = 7;

// Fat-tail sampling for stats
export const FAT_TAIL_SAMPLING_CHANCE = 0.15;
export const FAT_TAIL_STDDEV_MULTIPLIER = 2;

// Naturalization thresholds
export const NATURALIZATION_CAREER_WINS_THRESHOLD = 300;
export const NATURALIZATION_CAREER_WINS_HIGH_THRESHOLD = 400;
export const NATURALIZATION_CAREER_YEARS_THRESHOLD = 10;

// HoF and milestones
export const HOF_WINS_THRESHOLD = 500;
export const MILESTONE_FIRST = 100;
export const MILESTONE_SECOND = 200;
export const MILESTONE_THIRD = 300;
export const MILESTONE_FOURTH = 500;
export const MILESTONE_FIFTH = 1000;

// Career milestone thresholds
export const CAREER_MILESTONE_FIRST = 100;
export const CAREER_MILESTONE_SECOND = 500;
export const CAREER_MILESTONE_THIRD = 700;
export const CAREER_MILESTONE_FOURTH = 1000;

// Additional career constants
export const BASE_WIN_RATE = 0.5;
export const DECLINING_WIN_RATE_BASE = 0.38;
export const DECLINING_WIN_RATE_RNG_RANGE = 0.15;
export const WIN_RATE_VARIANCE_MULTIPLIER = 3;
export const GINO_SHO_CHANCE = 0.015;
export const ABSENCE_CHANCE = 0.06;
export const ABSENCE_RANGE = 2;
export const ABSENCE_MIN = 1;

// At target win rate
export const AT_TARGET_WIN_RATE_BASE = 0.47;
export const AT_TARGET_WIN_RATE_RNG_RANGE = 0.1;

// Sansho chances
export const YUSHO_CHANCE = 0.08;
export const JUN_YUSHO_CHANCE = 0.1;
export const KANTOSHO_CHANCE = 0.02;
export const SHUKUNSHO_CHANCE = 0.01;
export const KINBOSHI_CHANCE = 0.08;

// Rank progression margins
export const RANK_PROGRESSION_DOUBLE_PROMOTE_MARGIN = 5;
export const RANK_PROGRESSION_PROMOTE_MARGIN = 2;
export const RANK_PROGRESSION_NUMBER_MARGIN = 3;
export const RANK_PROGRESSION_DOUBLE_DEMOTE_MARGIN = 5;
export const RANK_PROGRESSION_DEMOTE_MARGIN = 2;
