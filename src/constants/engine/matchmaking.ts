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
