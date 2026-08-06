/**
 * Banzuke Promotion Constants
 * ============================
 * Constants governing rank movement, absence penalties, and promotion thresholds.
 */

// ── Absence penalty weights ───────────────────────────────────────────────────

export const ABSENCE_WEIGHT_FULL_KYUJO = 2.5;
export const ABSENCE_WEIGHT_HEAVY_KYUJO = 1.8;
export const ABSENCE_WEIGHT_DEFAULT = 1.4;
export const HEAVY_KYUJO_FRACTION = 0.5;

// ── Performance bonus values ──────────────────────────────────────────────────

export const OPPONENT_TIER_BONUS_MULT = 0.5;
export const OPPONENT_TIER_BONUS_CAP = 1;
export const YUSHO_BONUS = 5;
export const JUN_YUSHO_BONUS = 2;
export const SPECIAL_PRIZE_BONUS_CAP = 3;
export const KINBOSHI_BONUS_CAP = 3;
export const COMEBACK_WINS_BONUS_CAP = 2;
export const EDGE_CRISIS_BONUS_CAP = 2;
export const EDGE_CRISIS_DIVISOR = 2;

// ── Rank movement caps ────────────────────────────────────────────────────────

export const RANK_MOVE_CAP_YOKOZUNA_MIN = -2;
export const RANK_MOVE_CAP_YOKOZUNA_MAX = 2;
export const RANK_MOVE_CAP_OZEKI_MIN = -4;
export const RANK_MOVE_CAP_OZEKI_MAX = 4;
export const RANK_MOVE_CAP_OZEKI_DEMOTED_MIN = -6;
export const RANK_MOVE_CAP_SANYAKU_MIN = -8;
export const RANK_MOVE_CAP_SANYAKU_MAX = 8;
export const RANK_MOVE_CAP_MAKUUCHI_MIN = -18;
export const RANK_MOVE_CAP_MAKUUCHI_MAX = 15;
export const RANK_MOVE_CAP_MAKUSHITA_MIN = -30;
export const RANK_MOVE_CAP_MAKUSHITA_MAX = 25;
export const RANK_MOVE_CAP_JONOKUCHI_MIN = -30;
export const RANK_MOVE_CAP_JONOKUCHI_MAX = 25;

// ── Rank movement multipliers ─────────────────────────────────────────────────

export const RANK_MOVE_MULT_OZEKI = 0.65;
export const RANK_MOVE_MULT_SANYAKU = 0.8;
export const RANK_MOVE_MULT_MAKUSHITA_TOP_PROMO = 1.5;
export const RANK_MOVE_MULT_MAKUSHITA_BOTTOM_PROMO = 0.8;
export const RANK_MOVE_MULT_MAKUSHITA_TOP_DEMO = 0.5;
export const RANK_MOVE_MULT_MAKUSHITA_BOTTOM_DEMO = 1.5;

// ── Makushita thresholds ──────────────────────────────────────────────────────

export const MAKUSHITA_TOP_RANK_NUMBER = 20;
export const MAKUSHITA_DEFAULT_RANK_NUMBER = 60;

// ── Ozeki demotion ────────────────────────────────────────────────────────────

export const OZEKI_DEMOTED_FLOOR = -4;

// ── Jonokuchi special movement ────────────────────────────────────────────────

export const JONOKUCHI_NEAR_KACHI_WINS = 3;

// ── Promotion win thresholds ──────────────────────────────────────────────────

export const SEKIWAKE_OZEKI_PROMOTION_WINS = 11;
export const SEKIWAKE_OZEKI_RECLAIM_WINS = 10;
export const SEKIWAKE_33_WIN_THRESHOLD = 33;
export const KOMUSUBI_PROMOTION_WINS = 10;
export const MAEGASHIRA_PROMOTION_WINS = 10;
export const MAEGASHIRA_TOP_RANK_THRESHOLD = 4;

// ── Jonokuchi promotion tiers ─────────────────────────────────────────────────

export const JONOKUCHI_YUSHO_TIER = 8;
export const JONOKUCHI_KACHI_TIER = 9;
