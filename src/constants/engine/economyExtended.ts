/**
 * Extended economy system constants.
 */

/** Diet cost for standard regimen (yen) */
export const DIET_COST_STANDARD = 3000;

/** Sponsor jitter range */
export const SPONSOR_JITTER_RANGE = 1.0;

/** Sponsor jitter percentage */
export const SPONSOR_JITTER_PERCENTAGE = 0.5;

/** Staff hiring baseline cost (yen) */
export const STAFF_HIRING_BASELINE = 500_000;

/** Market price drift divisor */
export const MARKET_PRICE_DRIFT_DIVISOR = 10000;

/** Market price rounding */
export const MARKET_PRICE_ROUNDING = 10000;

/** Kensho T4+ max for low importance */
export const KENSHO_LOW_MAX_T4_PLUS = 0;

/** Kensho T3 max for low importance */
export const KENSHO_LOW_MAX_T3 = 1;

/** Kensho T4+ max for mid importance */
export const KENSHO_MID_MAX_T4_PLUS = 1;

/** Kensho T3 max for mid importance */
export const KENSHO_MID_MAX_T3 = 2;

/** Kensho T4+ max for high importance */
export const KENSHO_HIGH_MAX_T4_PLUS = 2;

/** Kensho T3 max for high importance */
export const KENSHO_HIGH_MAX_T3 = 4;

/** Kensho T4+ max for peak importance */
export const KENSHO_PEAK_MAX_T4_PLUS = 4;

/** Kensho T3 max for peak importance */
export const KENSHO_PEAK_MAX_T3 = 6;

/** Final basho day */
export const FINAL_BASHO_DAY = 15;

/** Prestige affinity weight for T4+ sponsors */
export const PRESTIGE_AFFINITY_T4_WEIGHT = 0.5;

/** Loyalty weight for T4+ sponsors */
export const LOYALTY_T4_WEIGHT = 0.3;

/** T5 tier bonus */
export const T5_TIER_BONUS = 20;

/** T4 tier bonus */
export const T4_TIER_BONUS = 8;

/** Prestige affinity weight for T3 sponsors */
export const PRESTIGE_AFFINITY_T3_WEIGHT = 0.4;

/** Loyalty weight for T3 sponsors */
export const LOYALTY_T3_WEIGHT = 0.2;

/** Media heat divisor for buzz modifier */
export const MEDIA_HEAT_DIVISOR = 80;

/** Minimum kinboshi banner count */
export const MIN_KINBOSHI_BANNER_COUNT = 15;

/** Additional kinboshi banner max */
export const ADDITIONAL_KINBOSHI_BANNER_MAX = 5;

/** Minimum ginboshi banner count */
export const MIN_GINBOSHI_BANNER_COUNT = 5;

/** Additional ginboshi banner max */
export const ADDITIONAL_GINBOSHI_BANNER_MAX = 3;

/** Koenkai monthly income - none */
export const KOENKAI_INCOME_NONE = 0;

/** Koenkai monthly income - weak */
export const KOENKAI_INCOME_WEAK = 500_000;

/** Koenkai monthly income - moderate */
export const KOENKAI_INCOME_MODERATE = 1_500_000;

/** Koenkai monthly income - strong */
export const KOENKAI_INCOME_STRONG = 3_500_000;

/** Koenkai monthly income - powerful */
export const KOENKAI_INCOME_POWERFUL = 7_000_000;

/** Sponsor tier income - T0 */
export const SPONSOR_TIER_INCOME_T0 = 100_000;

/** Sponsor tier income - T1 */
export const SPONSOR_TIER_INCOME_T1 = 300_000;

/** Sponsor tier income - T2 */
export const SPONSOR_TIER_INCOME_T2 = 750_000;

/** Sponsor tier income - T3 */
export const SPONSOR_TIER_INCOME_T3 = 1_500_000;

/** Sponsor tier income - T4 */
export const SPONSOR_TIER_INCOME_T4 = 3_000_000;

/** Sponsor tier income - T5 */
export const SPONSOR_TIER_INCOME_T5 = 8_000_000;

/** Koenkai powerful threshold */
export const KOENKAI_POWERFUL_THRESHOLD = 20;

/** Koenkai strong threshold */
export const KOENKAI_STRONG_THRESHOLD = 15;

/** Koenkai moderate threshold */
export const KOENKAI_MODERATE_THRESHOLD = 10;

/** Koenkai weak threshold */
export const KOENKAI_WEAK_THRESHOLD = 5;

/** Initial koenkai member count base */
export const KOENKAI_MEMBER_COUNT_BASE = 3;

/** Initial koenkai member count max */
export const KOENKAI_MEMBER_COUNT_MAX = 5;

/** Koenkai pillar strength */
export const KOENKAI_PILLAR_STRENGTH = 4;

/** Koenkai member strength */
export const KOENKAI_MEMBER_STRENGTH = 2;

/** Construction cost level multiplier */
export const CONSTRUCTION_COST_LEVEL_MULTIPLIER = 0.8;

/** Construction build time threshold for year increment */
export const CONSTRUCTION_BUILD_TIME_THRESHOLD = 3;

/** Monthly divisor for yearly allowances */
export const MONTHLY_DIVISOR = 12;

/** Travel allowance cash split percentage */
export const TRAVEL_ALLOWANCE_CASH_SPLIT = 0.7;

/** Travel allowance retirement split percentage */
export const TRAVEL_ALLOWANCE_RETIREMENT_SPLIT = 0.3;

/**
 * Outside income — the non-JSA streams (real-2026 calibration):
 *
 * Commercial endorsements (CM/print/TV) concentrate at Yokozuna/Ōzeki
 * and charismatic makuuchi — one major corporate deal runs ¥10–30M+/yr,
 * a star yokozuna holds 2–3 (¥30–60M/yr). Rank-and-file maegashira get
 * ¥0–5M (regional ads); jūryō and below essentially nothing.
 *
 * Personal tanimachi/kōenkai gifts (goshūgi) — cash envelopes at
 * post-tournament parties and promotion celebrations — run
 * ¥10–30M+/yr for top sanyaku. Distinct from KOENKAI_INCOME_* (the
 * heya-level supporter-club stream split evenly across sekitori):
 * this is the individual, star-scaled half.
 */
export const ENDORSEMENT_ANNUAL_BY_RANK = {
  yokozuna: 35_000_000,
  ozeki: 18_000_000,
  sekiwake: 5_000_000,
  komusubi: 4_000_000,
  maegashira: 2_500_000,
  juryo: 0,
} as const;

/** Per-basho tanimachi gift base by rank (¥) — paid at basho conclusion. */
export const PATRONAGE_BASHO_BASE_BY_RANK = {
  yokozuna: 2_200_000,
  ozeki: 1_500_000,
  sekiwake: 900_000,
  komusubi: 700_000,
  maegashira: 400_000,
  juryo: 150_000,
} as const;

/**
 * Star-power multiplier on outside income — `marketability` drives both
 * streams (real-world: endorsements chase charisma, patrons chase
 * winners). 50 → 0.8, 75 → 1.05, 100 → 1.3; clamped [0.3, 1.3].
 */
export function outsideIncomeStarFactor(marketability: number): number {
  return Math.min(1.3, Math.max(0.3, 0.3 + marketability / 100));
}

/** Seeded jitter band on per-basho patronage (party size varies). */
export const PATRONAGE_JITTER_MIN = 0.85;
export const PATRONAGE_JITTER_SPAN = 0.3;
