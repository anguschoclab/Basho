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

export const SEKIWAKE_OZEKI_RECLAIM_WINS = 10;
export const SEKIWAKE_33_WIN_THRESHOLD = 33;
export const KOMUSUBI_PROMOTION_WINS = 10;
export const MAEGASHIRA_PROMOTION_WINS = 10;
export const MAEGASHIRA_TOP_RANK_THRESHOLD = 4;

// ── Jonokuchi promotion tiers ─────────────────────────────────────────────────

export const JONOKUCHI_YUSHO_TIER = 8;
export const JONOKUCHI_KACHI_TIER = 9;
export const MAKUSHITA_PROMOTION_ZONE = 15;

/**
 * Rank-scaled net-wins (W−L) a makushita rikishi needs inside the promotion
 * zone to be juryo-eligible — the real JSA convention. Top of the zone
 * promotes on any kachi-koshi; deep-zone entries must force the issue with
 * a dominant record. The last band's +5 is only reachable at 6-1 or 7-0.
 * Without scaling, every in-zone KK qualified (~10 claims/basho → Ms→J ran
 * 3-4× hotter than the real ~2-6).
 */
export const MAKUSHITA_PROMOTION_NETWINS: Array<{ maxRank: number; netWins: number }> = [
  { maxRank: 5, netWins: 1 },
  { maxRank: 10, netWins: 3 },
  { maxRank: MAKUSHITA_PROMOTION_ZONE, netWins: 5 },
];

/**
 * WS-11 — incumbent preference: a sekitori incumbent's desiredKey drift is
 * damped by this many key units (1000 = one slot-delta, so 250 ≈ a
 * quarter-slot). On a bubble call — bottom maegashira MK vs a marginal J1
 * promotable — the makuuchi incumbent keeps his slot; the committee swaps
 * only when the challenger's case is clear. Applied symmetrically to
 * promotion and demotion drift so strong records still move.
 */
export const SEKITORI_INCUMBENT_BONUS = 250;

/**
 * WS-11 — desiredKey merit per cross-division win (wins against the
 * opposite sekitori division in tagged crossover bouts). Direct boundary
 * evidence: a J1 promotable who beat makuuchi men has proven the swap; an
 * in-zone makushita who beat juryo men has proven his claim; an incumbent
 * who held serve has proven he belongs.
 */
export const CROSS_DIVISION_WIN_BONUS = 150;

/**
 * HARD INVARIANT — fixed division membership per the real banzuke
 * (Professional_sumo_divisions): the sheet ALWAYS prints these counts.
 * The promotion bar flexes to meet the quota, never the reverse
 * (measured: makuuchi sagged to 38 late in a 25yr sim — an invalid sheet).
 *   makuuchi 42 · juryo 28 · makushita 120 · sandanme 160
 * Sandanme was reduced from 180 to 160 as of the January 2025 banzuke.
 * Jonidan (~200–250, usually the largest division) and jonokuchi
 * (~40–90 new wrestlers + fallen veterans) are UNFIXED — they flex with
 * the population and absorb whatever the fixed tiers can't.
 */
export const DIVISION_QUOTA = {
  makuuchi: 42,
  juryo: 28,
  makushita: 120,
  sandanme: 160,
} as const;

/** Jonidan — unfixed, usually the largest division at ~200–250. */
export const JONIDAN_MAX = 250;
/** Jonokuchi — unfixed, ~40–90 new wrestlers; the sheet's overflow valve. */
export const JONOKUCHI_MIN = 40;
