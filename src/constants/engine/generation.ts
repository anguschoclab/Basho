/**
 * World generation constants.
 */

/** Makushita tier count */
export const MAKUSHITA_TIER_COUNT = 150;

/** Jonokuchi tier count */
export const JONOKUCHI_TIER_COUNT = 150;

/** Makushita tier weight */
export const MAKUSHITA_TIER_WEIGHT = 1;

/** Jonokuchi tier weight */
export const JONOKUCHI_TIER_WEIGHT = 0;

/** Sponsor pool base size */
export const SPONSOR_POOL_BASE_SIZE = 180;

/** Sponsor pool size per world size scalar */
export const SPONSOR_POOL_SIZE_PER_SCALAR = 60;

/** Default height mean (cm) */
export const DEFAULT_HEIGHT_MEAN = 180;

/** Height standard deviation (cm) */
export const HEIGHT_STD_DEVIATION = 8;

/** Minimum height (cm) */
export const MIN_HEIGHT = 150;

/** Maximum height (cm) */
export const MAX_HEIGHT = 210;

/** Minimum height for clamp (cm) */
export const MIN_HEIGHT_CLAMP = 160;

/** Maximum height for clamp (cm) */
export const MAX_HEIGHT_CLAMP = 210;

/** Staff name random range */
export const STAFF_NAME_RANDOM_RANGE = 1000;

/** Prodigy PA ceiling fraction */
export const PRODIGY_PA_CEILING_FRACTION = 1.0;

/** Height potential mean multiplier */
export const HEIGHT_POTENTIAL_MEAN_MULTIPLIER = 1.0;

// ─────────────────────────────────────────
// Oyakata + heya seeding (consumed by WorldFactory)
// ─────────────────────────────────────────

/** Base age for a generated oyakata */
export const OYAKATA_BASE_AGE = 45;

/** Random age spread added on top of the base oyakata age */
export const OYAKATA_AGE_RANGE = 20;

/** Base heya reputation before tier scaling */
export const HEYA_REPUTATION_BASE = 80;

/** Reputation reduction per generation tier */
export const HEYA_REPUTATION_TIER_MULTIPLIER = 50;

/** Base heya prestige before tier scaling */
export const HEYA_PRESTIGE_BASE = 50;

/** Prestige reduction per generation tier */
export const HEYA_PRESTIGE_TIER_MULTIPLIER = 30;

/** Starting funds for elite (top-tier) heyas */
export const HEYA_FUNDS_ELITE = 40_000_000;

/** Starting funds for standard heyas */
export const HEYA_FUNDS_STANDARD = 15_000_000;

/** Default welfare risk for a freshly generated heya */
export const HEYA_WELFARE_RISK_DEFAULT = 10;

/** Default starting level for each heya facility (training/recovery/nutrition) */
export const HEYA_FACILITIES_DEFAULT = 50;

/** Default political capital for a freshly generated heya */
export const HEYA_POLITICAL_CAPITAL_DEFAULT = 100;

/** Minimum number of yokozuna seeded at world generation */
export const YOKOZUNA_COUNT_MIN = 0;

/** Maximum number of yokozuna seeded at world generation */
export const YOKOZUNA_COUNT_MAX = 2;

// ─────────────────────────────────────────
// Career simulation constants
// ─────────────────────────────────────────

/** Base debut age for rikishi */
export const DEBUT_AGE_BASE = 15;

/** Random debut age range */
export const DEBUT_AGE_RANGE = 5;

/** Base max career years for foreign wrestlers */
export const FOREIGN_MAX_YEARS_BASE = 8;

/** Random foreign max career years range */
export const FOREIGN_MAX_YEARS_RANGE = 5;

/** Basho per year */
export const BASHO_PER_YEAR = 6;

/** Division win rates */
export const DIVISION_WIN_RATE_MAKUUCHI = 0.5;
export const DIVISION_WIN_RATE_JURYO = 0.52;
export const DIVISION_WIN_RATE_MAKUSHITA = 0.48;
export const DIVISION_WIN_RATE_SANDANME = 0.45;
export const DIVISION_WIN_RATE_JONIDAN = 0.42;
export const DIVISION_WIN_RATE_JONOKUCHI = 0.4;

/** Rank win rate modifiers */
export const RANK_MODIFIER_YOKOZUNA = 0.15;
export const RANK_MODIFIER_OZEKI = 0.1;
export const RANK_MODIFIER_SEKIWAKE = 0.05;
export const RANK_MODIFIER_KOMUSUBI = 0.02;
export const RANK_MODIFIER_MAEGASHIRA = 0.0;

/** Basho per promotion base */
export const BASHO_PER_PROMOTION_BASE = 6;

/** Minimum basho per promotion */
export const BASHO_PER_PROMOTION_MIN = 2;

/** Bouts per basho for top divisions */
export const BOUTS_PER_BASHO_TOP = 15;

/** Bouts per basho for lower divisions */
export const BOUTS_PER_BASHO_LOWER = 7;

/** Win rate randomness */
export const WIN_RATE_RANDOMNESS = 0.1;

/** Minimum win rate */
export const WIN_RATE_MIN = 0.25;

/** Maximum win rate */
export const WIN_RATE_MAX = 0.85;

/** Base yusho chance */
export const YUSHO_CHANCE_BASE = 0.001;

/** Yusho chance by rank */
export const YUSHO_CHANCE_YOKOZUNA = 0.1;
export const YUSHO_CHANCE_OZEKI = 0.04;
export const YUSHO_CHANCE_SEKIWAKE = 0.02;
export const YUSHO_CHANCE_KOMUSUBI = 0.01;
export const YUSHO_CHANCE_MAEGASHIRA = 0.002;

// ─────────────────────────────────────────
// Stat generation constants
// ─────────────────────────────────────────

/** Development profile probabilities */
export const PRODIGY_EARLY_PEAKER_CHANCE = 0.5;
export const JOURNEYMAN_LATE_BLOOMER_CHANCE = 0.7;

/** Fat-tail sampling */
export const FAT_TAIL_SAMPLING_CHANCE = 0.15;
export const FAT_TAIL_STD_DEV_MULTIPLIER = 2;

/** Stat clamping bounds */
export const STAT_MIN = 25;
export const STAT_MAX = 99;
export const CA_STAT_MIN = 10;
export const CA_STAT_MAX = 100;

/** Regional stat bonuses */
export const REGIONAL_BONUS_EAST_EUROPEAN_POWER = 12;
export const REGIONAL_BONUS_EAST_EUROPEAN_STAMINA = 8;
export const REGIONAL_BONUS_MONGOLIAN_TECHNIQUE = 10;
export const REGIONAL_BONUS_MONGOLIAN_SPEED = 5;
export const REGIONAL_BONUS_AMERICAS_TECHNIQUE = 4;
export const REGIONAL_BONUS_AMERICAS_SPEED = 8;
export const REGIONAL_BONUS_AMERICAS_ADAPTABILITY = 4;

/** Current ability noise */
export const CA_NOISE_MEAN = 0;
export const CA_NOISE_STD_DEV = 2;

/** Size clamping bounds */
export const WEIGHT_MIN = 70;
export const WEIGHT_MAX = 250;
export const HEIGHT_MIN = 150;
export const HEIGHT_MAX = 210;

/** Base stat means by rank */
export const BASE_MEAN_YOKOZUNA = 85;
export const BASE_MEAN_OZEKI = 75;
export const BASE_MEAN_SEKIWAKE_KOMUSUBI = 65;
export const BASE_MEAN_MAEGASHIRA = 55;
export const BASE_MEAN_LOWER_DIVISIONS = 40;

/** Stat generation stdDev */
export const STAT_GEN_STD_DEV = 8;

/** Weight generation */
export const WEIGHT_BASE_MEAN = 150;
export const WEIGHT_GEN_STD_DEV = 20;
export const WEIGHT_GEN_MIN = 80;
export const WEIGHT_GEN_MAX = 250;

/** Height generation */
export const HEIGHT_BASE_MEAN = 180;
export const HEIGHT_GEN_STD_DEV = 8;
export const HEIGHT_GEN_MIN = 160;
export const HEIGHT_GEN_MAX = 210;

// ─────────────────────────────────────────
// Naturalization constants
// ─────────────────────────────────────────

/** Career wins threshold for naturalization eligibility */
export const NATURALIZATION_CAREER_WINS_THRESHOLD = 400;

/** Age threshold for yokozuna naturalization */
export const NATURALIZATION_YOKOZUNA_AGE_THRESHOLD = 28;

/** Career wins threshold for ozeki naturalization */
export const NATURALIZATION_OZEKI_CAREER_WINS_THRESHOLD = 350;

/** Naturalization chance percentage */
export const NATURALIZATION_CHANCE_PERCENTAGE = 5;

// ─────────────────────────────────────────
// Registry/lifecycle constants
// ─────────────────────────────────────────

/** Recruitment window duration in weeks */
export const RECRUITMENT_WINDOW_WEEKS = 4;

/** Momentum max value */
export const MOMENTUM_MAX = 5;

/** Momentum min value */
export const MOMENTUM_MIN = -5;

/** Win rate threshold for high momentum gain */
export const WIN_RATE_HIGH_MOMENTUM_THRESHOLD = 0.7;

/** High momentum gain increment */
export const MOMENTUM_HIGH_GAIN = 2;

/** Win rate threshold for medium momentum gain */
export const WIN_RATE_MEDIUM_MOMENTUM_THRESHOLD = 0.55;

/** Medium momentum gain increment */
export const MOMENTUM_MEDIUM_GAIN = 1;

/** Win rate threshold for high momentum loss */
export const WIN_RATE_HIGH_MOMENTUM_LOSS_THRESHOLD = 0.35;

/** High momentum loss decrement */
export const MOMENTUM_HIGH_LOSS = 2;

/** Win rate threshold for medium momentum loss */
export const WIN_RATE_MEDIUM_MOMENTUM_LOSS_THRESHOLD = 0.45;

/** Medium momentum loss decrement */
export const MOMENTUM_MEDIUM_LOSS = 1;

/** HoF eligibility career wins threshold */
export const HOF_CAREER_WINS_THRESHOLD = 500;

/** Career win milestones */
export const CAREER_WIN_MILESTONES = [100, 200, 300, 500];

// ─────────────────────────────────────────
// History/shikona constants
// ─────────────────────────────────────────

/** Career win milestone thresholds */
export const CAREER_WIN_MILESTONE_THRESHOLDS = [100, 500, 700, 1000];

/** Base shikona change probability */
export const SHIKONA_CHANGE_BASE_PROBABILITY = 0.3;

/** Shikona change probability by archetype */
export const SHIKONA_CHANGE_PROBABILITY_TRADITIONALIST = 0.5;
export const SHIKONA_CHANGE_PROBABILITY_TYRANT = 0.4;
export const SHIKONA_CHANGE_PROBABILITY_NURTURER = 0.25;
export const SHIKONA_CHANGE_PROBABILITY_SCIENTIST = 0.2;

/** Sanyaku promotion probability bonus */
export const SHIKONA_CHANGE_SANYAKU_BONUS = 0.2;

// ─────────────────────────────────────────
// H2H constants
// ─────────────────────────────────────────

/** Minimum matches for domination check */
export const H2H_DOMINATION_MIN_MATCHES = 4;

/** Domination win rate threshold */
export const H2H_DOMINATION_WIN_RATE_THRESHOLD = 0.75;

/** Deadlock win/loss difference threshold */
export const H2H_DEADLOCK_DIFF_THRESHOLD = 1;

/** Minimum matches for deadlock check */
export const H2H_DEADLOCK_MIN_MATCHES = 2;

/** Streak threshold for narrative */
export const H2H_STREAK_THRESHOLD = 3;

/** Max recent meetings to return */
export const H2H_MAX_RECENT_MEETINGS = 5;

/** Yotsu tactic thresholds */
export const TACTIC_YOTSU_BELT_THRESHOLD = 0.65;
export const TACTIC_YOTSU_STANDARD_THRESHOLD = 0.85;
export const TACTIC_YOTSU_OSHI_THRESHOLD = 0.95;

/** Oshi tactic thresholds */
export const TACTIC_OSHI_THRUST_THRESHOLD = 0.7;
export const TACTIC_OSHI_STANDARD_THRESHOLD = 0.85;
export const TACTIC_OSHI_YOTSU_THRESHOLD = 0.95;

/** Hybrid tactic thresholds */
export const TACTIC_HYBRID_YOTSU_THRESHOLD = 0.4;
export const TACTIC_HYBRID_OSHI_THRESHOLD = 0.8;
export const TACTIC_HYBRID_STANDARD_THRESHOLD = 0.95;

/** Tactical advantage win probability shift */
export const TACTICAL_ADVANTAGE_SHIFT = 0.15;

// ─────────────────────────────────────────
// Narrative constants
// ─────────────────────────────────────────

/** Intensity values by voice style */
export const INTENSITY_DRAMATIC = 3;
export const INTENSITY_UNDERSTATED = 1;
export const INTENSITY_FORMAL = 2;

/** Kensho base chances by tier */
export const KENSHO_CHANCE_TIER_1 = 0.95;
export const KENSHO_CHANCE_TIER_2 = 0.85;
export const KENSHO_CHANCE_TIER_3 = 0.7;
export const KENSHO_CHANCE_TIER_4 = 0.5;
export const KENSHO_CHANCE_TIER_5 = 0.15;

/** Kensho base counts by tier */
export const KENSHO_COUNT_TIER_1_BASE = 15;
export const KENSHO_COUNT_TIER_1_RANGE = 20;
export const KENSHO_COUNT_TIER_2_BASE = 8;
export const KENSHO_COUNT_TIER_2_RANGE = 12;
export const KENSHO_COUNT_TIER_3_BASE = 4;
export const KENSHO_COUNT_TIER_3_RANGE = 8;
export const KENSHO_COUNT_TIER_4_BASE = 2;
export const KENSHO_COUNT_TIER_4_RANGE = 4;
export const KENSHO_COUNT_TIER_5_BASE = 1;
export const KENSHO_COUNT_TIER_5_RANGE = 2;

/** Day threshold for kensho bonus */
export const KENSHO_DAY_THRESHOLD = 13;

/** Kensho late day chance bonus */
export const KENSHO_LATE_DAY_CHANCE_BONUS = 0.2;

/** Kensho late day count multiplier */
export const KENSHO_LATE_DAY_COUNT_MULTIPLIER = 1.3;

/** Ritual salt chance for understated voice */
export const RITUAL_SALT_CHANCE_UNDERSTATED = 0.5;

/** High stakes tier threshold */
export const HIGH_STAKES_TIER_THRESHOLD = 2;

/** Day thresholds for voice style */
export const VOICE_DRAMATIC_DAY_THRESHOLD = 13;
export const VOICE_UNDERSTATED_DAY_THRESHOLD = 5;

// ─────────────────────────────────────────
// Narrative band constants
// ─────────────────────────────────────────

/** Stat band thresholds */
export const STAT_BAND_STRUGGLING_MAX = 15;
export const STAT_BAND_LIMITED_MAX = 30;
export const STAT_BAND_DEVELOPING_MAX = 45;
export const STAT_BAND_CAPABLE_MAX = 60;
export const STAT_BAND_STRONG_MAX = 75;
export const STAT_BAND_OUTSTANDING_MAX = 90;

/** Fatigue band thresholds */
export const FATIGUE_BAND_FRESH_MAX = 10;
export const FATIGUE_BAND_ALERT_MAX = 25;
export const FATIGUE_BAND_LIGHT_MAX = 40;
export const FATIGUE_BAND_TIRED_MAX = 55;
export const FATIGUE_BAND_WORN_MAX = 70;
export const FATIGUE_BAND_EXHAUSTED_MAX = 85;

/** Rivalry heat band thresholds */
export const RIVALRY_HEAT_DORMANT_MAX = 20;
export const RIVALRY_HEAT_SIMMERING_MAX = 40;
export const RIVALRY_HEAT_HEATED_MAX = 65;
export const RIVALRY_HEAT_FIERCE_MAX = 85;

/** Potential band thresholds */
export const POTENTIAL_BAND_LIMITED_MAX = 35;
export const POTENTIAL_BAND_AVERAGE_MAX = 55;
export const POTENTIAL_BAND_SOLID_MAX = 72;
export const POTENTIAL_BAND_STAR_MAX = 88;

/** Scandal band thresholds */
export const SCANDAL_BAND_CLEAN_MAX = 10;
export const SCANDAL_BAND_WHISPERS_MAX = 30;
export const SCANDAL_BAND_SCRUTINY_MAX = 55;
export const SCANDAL_BAND_SCANDAL_MAX = 80;

/** Prize band thresholds (yen) */
export const PRIZE_BAND_NOMINAL_MAX = 10000;
export const PRIZE_BAND_MODEST_MAX = 100000;
export const PRIZE_BAND_NOTABLE_MAX = 1000000;
export const PRIZE_BAND_PRESTIGIOUS_MAX = 10000000;

/** Trait band thresholds */
export const TRAIT_BAND_NEGLIGIBLE_MAX = 20;
export const TRAIT_BAND_MINOR_MAX = 40;
export const TRAIT_BAND_MODERATE_MAX = 60;
export const TRAIT_BAND_STRONG_MAX = 80;

/** Condition descriptor thresholds */
export const CONDITION_ZEKKOUCHOU_MIN = 0.85;
export const CONDITION_BACHI_BACHI_MIN = 0.6;
export const CONDITION_IKI_GIRASHITE_MIN = 0.35;

/** Morale descriptor thresholds */
export const MORALE_SHIN_GI_TAI_MIN = 0.85;
export const MORALE_KIAI_JUUBUN_MIN = 0.6;
export const MORALE_MAYOI_MIN = 0.35;

/** Potential descriptor thresholds */
export const POTENTIAL_TAIKI_BANSEI_MIN = 90;
export const POTENTIAL_SOSHITSU_ARI_MIN = 75;
export const POTENTIAL_MIKAN_NO_TAIKI_MIN = 50;

/** Age band thresholds (years) */
export const AGE_BAND_PRODIGY_MAX = 20;
export const AGE_BAND_YOUNG_MAX = 25;
export const AGE_BAND_PRIME_MAX = 32;
export const AGE_BAND_VETERAN_MAX = 38;
export const AGE_BAND_AGING_MAX = 43;

/** Experience band thresholds */
export const EXPERIENCE_BAND_NOVICE_MAX = 20;
export const EXPERIENCE_BAND_DEVELOPING_MAX = 40;
export const EXPERIENCE_BAND_SEASONED_MAX = 60;
export const EXPERIENCE_BAND_VETERAN_MAX = 80;

/** Weight band thresholds (kg) */
export const WEIGHT_BAND_LEAN_MAX = 100;
export const WEIGHT_BAND_SOLID_MAX = 120;
export const WEIGHT_BAND_POWERFUL_MAX = 150;
export const WEIGHT_BAND_MASSIVE_MAX = 180;

/** Reputation band thresholds */
export const REPUTATION_BAND_OBSCURE_MAX = 20;
export const REPUTATION_BAND_KNOWN_MAX = 40;
export const REPUTATION_BAND_RESPECTED_MAX = 60;
export const REPUTATION_BAND_RENOWNED_MAX = 80;

/** Injury severity band thresholds */
export const INJURY_SEVERITY_MINIMAL_MAX = 20;
export const INJURY_SEVERITY_MILD_MAX = 40;
export const INJURY_SEVERITY_MODERATE_MAX = 60;
export const INJURY_SEVERITY_SEVERE_MAX = 80;

/** Win rate band thresholds (%) */
export const WIN_RATE_BAND_DISMAL_MAX = 25;
export const WIN_RATE_BAND_POOR_MAX = 40;
export const WIN_RATE_BAND_MEDIOCRE_MAX = 48;
export const WIN_RATE_BAND_DECENT_MAX = 55;
export const WIN_RATE_BAND_STRONG_MAX = 65;

/** Height band thresholds (cm) */
export const HEIGHT_BAND_SHORT_MAX = 170;
export const HEIGHT_BAND_AVERAGE_MAX = 182;
export const HEIGHT_BAND_TALL_MAX = 192;
export const HEIGHT_BAND_GIANT_MAX = 200;
