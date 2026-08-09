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

// ── Retirement age thresholds ──────────────────────────────────────────────────

export const RETIREMENT_MIN_AGE = 28;
export const RETIREMENT_MANDATORY_AGE = 45;
export const RETIREMENT_YOKOZUNA_MANDATORY_AGE = 40;
export const RETIREMENT_NATURAL_AGE_START = 34;
export const RETIREMENT_STAGNANT_AGE = 28;
export const RETIREMENT_WEAK_AGE = 38;
export const RETIREMENT_CRITICAL_WEAK_AGE = 30;

// ── Retirement injury thresholds ───────────────────────────────────────────────

export const RETIREMENT_INJURY_WEEKS_THRESHOLD = 20;

// ── Retirement council thresholds ──────────────────────────────────────────────

export const RETIREMENT_COUNCIL_WARNINGS_FORCED = 3;
export const RETIREMENT_CONSECUTIVE_MAKE_KOSHI_WEAK = 2;
export const RETIREMENT_CONSECUTIVE_KYUJO_TOO_LONG = 3;

// ── Retirement probabilities ───────────────────────────────────────────────────

export const RETIREMENT_PRESSURE_BASE = 0.5;
export const RETIREMENT_PRESSURE_PER_WARNING = 0.2;
export const RETIREMENT_PRESSURE_MAX = 0.95;
export const RETIREMENT_NATURAL_RATE_PER_YEAR = 0.1;
export const RETIREMENT_PROB_STAGNANT = 0.1;
export const RETIREMENT_PROB_WEAK = 0.25;
export const RETIREMENT_PROB_CRITICAL = 0.5;

// ── Retirement stat thresholds ─────────────────────────────────────────────────

export const RETIREMENT_STAT_WEAK_POWER = 40;
export const RETIREMENT_STAT_CRITICAL_POWER = 30;
export const RETIREMENT_STAT_DIMINISHING_POWER = 35;
export const RETIREMENT_DEFAULT_POWER = 50;

// ── Rookie generation constants ────────────────────────────────────────────────

export const ROOKIE_ID_MIN = 1000000;
export const ROOKIE_ID_MAX = 9999999;
export const ROOKIE_BASE_STAT_ELITE = 40;
export const ROOKIE_BASE_STAT_NORMAL = 20;
export const ROOKIE_STAT_VARIANCE = 15;
export const ROOKIE_BASE_WEIGHT = 100;
export const ROOKIE_WEIGHT_RANGE = 60;
export const ROOKIE_ELITE_EXPERIENCE = 20;
export const ROOKIE_BASE_HEIGHT = 175;
export const ROOKIE_HEIGHT_RANGE = 20;
export const ROOKIE_TALL_HEIGHT_THRESHOLD = 185;
export const ROOKIE_SHORT_HEIGHT_THRESHOLD = 180;
export const ROOKIE_BMI_TOWER_THRESHOLD = 30;
export const ROOKIE_BMI_BARREL_THRESHOLD = 32;
export const ROOKIE_BMI_COMPACT_THRESHOLD = 28;
export const ROOKIE_ELITE_RANK_NUMBER = 15;
export const ROOKIE_NORMAL_RANK_NUMBER = 50;
export const ROOKIE_INITIAL_MOMENTUM = 50;
export const ROOKIE_INITIAL_CONDITION = 100;
export const ROOKIE_MOTIVATION_BASE = 50;
export const ROOKIE_MOTIVATION_RANGE = 50;
export const ROOKIE_DISCIPLINE_BASE = 60;
export const ROOKIE_DISCIPLINE_RANGE = 30;
export const ROOKIE_MEDIA_SAVVY_BASE = 30;
export const ROOKIE_MEDIA_SAVVY_RANGE = 40;

// ── Body type physics behavior modifiers ───────────────────────────────────────

export const BODY_TYPE_BEHAVIORS: Record<
  string,
  {
    pushVelocityBonus: number;
    lateralMovementBonus: number;
    beltTorqueBonus: number;
    tachiaiSpeedBonus: number;
  }
> = {
  tower: {
    pushVelocityBonus: 4,
    lateralMovementBonus: -2,
    beltTorqueBonus: -1,
    tachiaiSpeedBonus: 2,
  },
  barrel: {
    pushVelocityBonus: 1,
    lateralMovementBonus: -3,
    beltTorqueBonus: 5,
    tachiaiSpeedBonus: -1,
  },
  compact: {
    pushVelocityBonus: -1,
    lateralMovementBonus: 4,
    beltTorqueBonus: 2,
    tachiaiSpeedBonus: 4,
  },
  lanky: {
    pushVelocityBonus: 2,
    lateralMovementBonus: 3,
    beltTorqueBonus: -2,
    tachiaiSpeedBonus: 3,
  },
};

// ── Origin stat modifiers ──────────────────────────────────────────────────────

export interface OriginDefinition {
  name: string;
  weightMod?: number;
  strMod?: number;
  speedMod?: number;
  techMod?: number;
  mentalMod?: number;
  stamMod?: number;
  balanceMod?: number;
  description?: string;
  isElite?: boolean;
}

export const ORIGINS: OriginDefinition[] = [
  // --- Japanese Hotbeds ---
  {
    name: "Hokkaido",
    weightMod: 1.1,
    strMod: 1.05,
    description: "Land of giants and harsh winters.",
  },
  { name: "Aomori", weightMod: 1.0, strMod: 1.1, description: "Traditional sumo powerhouse." },
  {
    name: "Akita",
    weightMod: 1.0,
    techMod: 1.05,
    description: "Technical wrestlers from the north.",
  },
  { name: "Oita", weightMod: 1.05, speedMod: 1.05, description: "Dynamic and explosive style." },
  { name: "Tokyo", weightMod: 0.95, techMod: 1.15, description: "Urban perfectionists." },
  { name: "Osaka", weightMod: 1.05, mentalMod: 1.1, description: "Resilient and street-smart." },
  { name: "Fukuoka", weightMod: 1.02, strMod: 1.02, description: "Southern strength." },
  { name: "Kagoshima", weightMod: 1.05, strMod: 1.05, description: "Heavyweight islanders." },

  // --- International ---
  {
    name: "Mongolia",
    weightMod: 0.9,
    strMod: 1.25,
    mentalMod: 1.3,
    techMod: 1.1,
    description: "Masters of leverage and spirit.",
  },
  { name: "Georgia", weightMod: 1.15, strMod: 1.2, description: "Raw power from the Caucasus." },
  { name: "Egypt", weightMod: 1.1, strMod: 1.15, description: "Sturdy and relentless." },
  {
    name: "Brazil",
    weightMod: 1.0,
    speedMod: 1.15,
    techMod: 1.05,
    description: "Flexible and athletic.",
  },
  {
    name: "USA",
    weightMod: 1.2,
    strMod: 1.1,
    speedMod: 0.9,
    description: "Huge frames and collegiate power.",
  },

  // --- Academic Elite (Makushita Tsukedashi eligible) ---
  { name: "Nihon University", weightMod: 1.0, techMod: 1.4, mentalMod: 1.1, isElite: true },
  { name: "Nippon Sport Science Univ", weightMod: 1.05, stamMod: 1.3, techMod: 1.2, isElite: true },
  { name: "Kindai University", weightMod: 1.1, strMod: 1.1, techMod: 1.1, isElite: true },

  // --- General Prefectures (Fillers) ---
  { name: "Chiba", weightMod: 1.0, speedMod: 1.05 },
  { name: "Saitama", weightMod: 1.05, strMod: 1.0 },
  { name: "Kanagawa", weightMod: 0.98, techMod: 1.05 },
  { name: "Hyogo", weightMod: 1.02, mentalMod: 1.05 },
  { name: "Shizuoka", weightMod: 1.0, balanceMod: 1.1 },
  { name: "Hiroshima", weightMod: 1.0, mentalMod: 1.1 },
  { name: "Kyoto", weightMod: 0.9, techMod: 1.2 },
  { name: "Niigata", weightMod: 1.0, stamMod: 1.1 },
  { name: "Ishikawa", weightMod: 1.05, strMod: 1.05 },
];
