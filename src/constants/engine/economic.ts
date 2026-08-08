/**
 * EconomicConstants.ts
 * ====================
 * Single source of truth for all financial constants used across
 * economics.ts, phase01_economy.ts, and any future finance systems.
 */

/** Standard oyakata monthly salary (¥). Weekly slice = /4. */
export const OYAKATA_SALARY_MONTHLY = 1_200_000;

/** Weekly baseline scouting/recruitment burn (¥). */
export const RECRUITMENT_BUDGET_WEEKLY = 100_000;

/** Basho teate (tournament allowance) for non-sekitori rikishi by division (¥). */
export const NON_SEKITORI_BASHO_ALLOWANCE: Record<string, number> = {
  makushita: 180_000,
  sandanme: 120_000,
  jonidan: 96_000,
  jonokuchi: 84_000,
} as const;

/**
 * Minimum weekly income floor guaranteed by kōenkai (¥).
 * Constitution §A6 & C2.4: covers staff/roster for a new heya without sekitori.
 * Formula: (5 rikishi × ¥2,000) + (3 staff × ¥6,000) = ¥28,000.
 */
export const KOENKAI_SURVIVAL_FLOOR = 0;

/** JSA debt limit before governance intervention (¥). */
export const DEBT_LIMIT = -15_500_000;

/** Standard benefactor bailout amount (¥). */
export const BENEFACTOR_BAILOUT_AMOUNT = 10_000_000;

/** Kensho payout per envelope (¥). Constitution §6. */
export const KENSHO_AMOUNT_PER_ENVELOPE = 70_000;

/** Kensho split per envelope (¥). */
export const KENSHO_SPLIT = {
  cash: 30_000,
  retirement: 30_000,
  jsaFee: 10_000,
} as const;

/** Mochikyukin (cumulative bonus) point value (¥ per point). */
export const MOCHIKYUKIN_POINT_VALUE = 4_000;

/** Mochikyukin points earned per net win above .500. */
export const MOCHIKYUKIN_POINTS_KACHI_KOSHI_PER_NET_WIN = 0.5;

/** Mochikyukin points earned per yusho (championship). */
export const MOCHIKYUKIN_POINTS_YUSHO = 30;

/** Mochikyukin points earned per kinboshi (v Yokozuna). */
export const MOCHIKYUKIN_POINTS_KINBOSHI = 10;

/** Mochikyukin points earned per jun-yusho (runner-up). */
export const MOCHIKYUKIN_POINTS_JUN_YUSHO = 5;

/** Mochikyukin points earned for a zensho-yusho (perfect championship). */
export const MOCHIKYUKIN_POINTS_ZENSHO_YUSHO = 50;

/** Mochikyukin rank floors — minimum effective points for payout by rank. */
export const MOCHIKYUKIN_RANK_FLOORS: Record<string, number> = {
  yokozuna: 150,
  ozeki: 100,
  sekiwake: 80,
  komusubi: 70,
  maegashira: 60,
  juryo: 40,
} as const;

/** Travel/jungyo allowance per sekitori per year (¥). */
export const TRAVEL_ALLOWANCE_YEARLY = {
  yokozuna: 1_500_000,
  ozeki: 1_200_000,
  sekiwake: 900_000,
  komusubi: 750_000,
  maegashira: 600_000,
  juryo: 450_000,
} as const;

/** JSA per-wrestler monthly subsidy by rank (¥). */
export const JSA_PER_WRESTLER_SUBSIDY_MONTHLY = {
  yokozuna: 2_500_000,
  ozeki: 2_000_000,
  sekiwake: 1_200_000,
  komusubi: 1_000_000,
  maegashira: 400_000,
  juryo: 200_000,
  makushita: 50_000,
  sandanme: 30_000,
  jonidan: 20_000,
  jonokuchi: 15_000,
} as const;

/** Tsukebito (personal attendant) costs per sekitori rank (¥ per month). */
export const TSUKEBITO_COSTS_MONTHLY = {
  yokozuna: 300_000,
  ozeki: 250_000,
  sekiwake: 200_000,
  komusubi: 150_000,
  maegashira: 100_000,
  juryo: 50_000,
} as const;

/** Kōenkai income split: portion to heya vs sekitori */
export const KOENKAI_INCOME_SPLIT = {
  heyaPortion: 0.7, // 70% to heya operations
  sekitoriPortion: 0.3, // 30% distributed to sekitori
} as const;

/** Per-facility upkeep multipliers (¥ per quality point per week). */
export const FACILITY_UPKEEP = {
  training: 1_000,
  recovery: 1_000,
  nutrition: 2_000,
} as const;

/** Staff weekly upkeep per member (¥). */
export const STAFF_UPKEEP_PER_MEMBER = 6_000;

/**
 * Fixed weekly operating overhead (¥) — unavoidable heya administrative cost
 * (utilities, groundskeeping, association dues) that is NOT clamped away by the
 * solvency guard. Intentional sink so net can go negative for thin-income stables.
 * Tuned to exceed the maintenance subsidy (¥500k/wk) so insolvent stables keep sinking.
 */
export const FIXED_OPERATING_OVERHEAD_WEEKLY = 750_000;

/**
 * Monthly operating overhead per sekitori, scaled by rank (¥).
 * A roster-strength-scaled heya expense that is NOT covered by the JSA salary
 * credit (which goes to the rikishi, not the heya). Prevents strong rosters from
 * compounding funds without bound.
 */
export const SEKITORI_OVERHEAD_MONTHLY = {
  yokozuna: 1_500_000,
  ozeki: 1_200_000,
  sekiwake: 900_000,
  komusubi: 800_000,
  maegashira: 600_000,
  juryo: 350_000,
} as const;

/**
 * Monthly operating overhead per non-sekitori rikishi (¥).
 * Covers chanko provisions, tsukebito duties, and ring time for lower-division
 * wrestlers. Intentional roster-scaled sink.
 */
export const NON_SEKITORI_OVERHEAD_MONTHLY = 80_000;

/** Daily food cost per rikishi by diet regimen (¥).
 * Based on communal chanko-nabe bulk kitchen economics.
 * (Previously 3×–10× higher which caused immediate systemic insolvency.) */
export const DIET_COSTS: Record<string, number> = {
  austerity: 350,
  maintenance: 1_000,
  heavy_bulk: 2_000,
  premium: 3_500,
} as const;

/** JSA weekly base grant per stable (¥) — represents broadcast rights distribution,
 * tournament entry fees, and JSA operational support. Keeps all stables viable. */
export const JSA_STABLE_WEEKLY_GRANT = 50_000;

/** Loan issuance threshold (¥) - when funds drop below this, bailouts are considered. */
export const LOAN_ISSUANCE_THRESHOLD = -5_000_000;

/** Merger threshold (¥) - when funds drop below this, NPC stables are forced to merge. */
export const MERGER_THRESHOLD = -15_000_000;

/** Seed funds for a newly founded stable (¥). */
export const FOUNDING_SEED_FUNDS = 30_000_000;

/** Maximum number of stables allowed in the world. */
export const HEYA_COUNT_CAP = 50;

/** Minimum number of stables to preserve — mergers are blocked below this count. */
export const HEYA_FLOOR = 10;

/** Probability that an accomplished retiree with available myoseki founds a new stable. */
export const FOUNDING_CHANCE = 0.35;

/** Basho of consecutive make-koshi / underperformance before non-financial merger is considered. */
export const CHRONIC_UNDERPERFORMANCE_BASHO = 6;

/** Prestige band that qualifies as "collapsed" for non-financial merger. */
export const PRESTIGE_COLLAPSE_BAND = "struggling";

/** Maximum roster size for a non-financial merger trigger (small + failing). */
export const NON_FINANCIAL_MERGER_MAX_ROSTER = 5;

/** Faction bailout amount (¥) - gift from wealthy faction-mates. */
export const FACTION_BAILOUT_AMOUNT = 10_000_000;

/** Faction benefactor threshold (¥) - minimum funds required to provide faction bailout. */
export const FACTION_BENEFACTOR_THRESHOLD = 60_000_000;

/**
 * Clamps funds to the debt limit to prevent infinite debt spirals.
 * @param funds Current funds value
 * @returns Clamped funds value (never below DEBT_LIMIT)
 */
export function clampFundsToDebtLimit(funds: number): number {
  return Math.max(funds, DEBT_LIMIT);
}

// Marketability boosts
export const KINBOSHI_MARKETABILITY_BOOST = 5;
export const GINBOSHI_MARKETABILITY_BOOST = 2;
export const MARKETABILITY_POPULARITY_MULTIPLIER = 2;

// Myoseki thresholds (yen)
export const MYOSEKI_THRESHOLD_HOARDER = 500_000_000;
export const MYOSEKI_THRESHOLD_DEFAULT = 300_000_000;
export const MYOSEKI_THRESHOLD_TRADITIONALIST = 600_000_000;
export const MYOSEKI_THRESHOLD_PATIENT = 700_000_000;

// Myoseki buffers (yen)
export const MYOSEKI_BUFFER_AMOUNT = 100_000_000;
export const MYOSEKI_BUFFER_TRADITIONALIST = 200_000_000;

// Infinite runway sentinel
export const RUNWAY_INFINITE_SENTINEL = 999;

// Runway thresholds (months)
export const RUNWAY_THRESHOLD_DEFAULT = 6;
export const RUNWAY_THRESHOLD_PUBLICITY_HAWK = 9;
export const RUNWAY_THRESHOLD_GAMBLER = 2;
export const RUNWAY_THRESHOLD_TRADITIONALIST = 8;
export const RUNWAY_THRESHOLD_NEPOSTIST = 12;
export const RUNWAY_THRESHOLD_NURTURER = 6;
export const RUNWAY_THRESHOLD_TYRANT = 8;
export const RUNWAY_THRESHOLD_SCIENTIST = 5;

// === EXTRACTED MAGIC NUMBERS (§8b–§8h, §8j–§8k) ===

/** Sponsor recruitment cost by tier (¥). */
export const SPONSOR_RECRUITMENT_COSTS: Record<string, number> = {
  T0: 50_000,
  T1: 150_000,
  T2: 400_000,
  T3: 800_000,
  T4: 1_500_000,
  T5: 4_000_000,
} as const;

/** Political favor advance payout amount (¥). */
export const POLITICAL_FAVOR_ADVANCE_PAYOUT = 5_000_000;

/** NPC fallback monthly burn estimate when actual expenses can't be calculated (¥). */
export const NPC_FALLBACK_MONTHLY_BURN_ESTIMATE = 5_000_000;

/** NPC per-rikishi monthly burn estimate (¥). */
export const NPC_RIKISHI_BURN_ESTIMATE_MONTHLY = 150_000;

/** NPC facility burn multiplier — multiplied by facility level for monthly estimate (¥). */
export const NPC_FACILITY_BURN_MULTIPLIER = 9_000;

/** Insolvency warning threshold — funds below this trigger a warning (¥). */
export const INSOLVENCY_WARNING_THRESHOLD = 1_000_000;

/** Fine penalty severe threshold — violations above this incur maximum fine (¥). */
export const FINE_PENALTY_SEVERE_THRESHOLD = 10_000_000;

/** Fine penalty significant threshold (¥). */
export const FINE_PENALTY_SIGNIFICANT_THRESHOLD = 3_000_000;

/** Fine penalty moderate threshold (¥). */
export const FINE_PENALTY_MODERATE_THRESHOLD = 500_000;

/** Backstory starting funds keyed by backstory ID (¥). */
export const BACKSTORY_STARTING_FUNDS: Record<string, number> = {
  yokozuna_champion: 3_000_000,
  ozeki_legend: 5_000_000,
  sanyaku_veteran: 10_000_000,
  maegashira_lifer: 15_000_000,
  injury_comeback: 8_000_000,
  international_scout: 12_000_000,
  council_elder: 20_000_000,
} as const;

// === EXTRACTED MYOSEKI MARKET CONSTANTS (§8c) ===

/** Total number of myoseki in the world. */
export const MYOSEKI_TOTAL_COUNT = 105;

/** Base asking price for a myoseki on the market (¥). */
export const MYOSEKI_BASE_ASKING_PRICE = 150_000_000;

/** Maximum asking price for a myoseki (¥). */
export const MYOSEKI_MAX_ASKING_PRICE = 350_000_000;

/** Lease rate as a fraction of asking price per year. */
export const MYOSEKI_LEASE_RATE_PERCENT = 0.05;

/** Price jitter added to base price during market generation (¥). */
export const MYOSEKI_PRICE_JITTER = 50_000_000;

/** Price adjustment range for weekly market fluctuations (¥). */
export const MYOSEKI_PRICE_ADJUSTMENT_RANGE = 20_000_000;

/** Base prices for myoseki generation by prestige tier (¥). Used by generateMyosekiMarket(). */
export const MYOSEKI_GENERATION_BASE_PRICES: Record<string, number> = {
  elite: 250_000_000,
  respected: 200_000_000,
  modest: 150_000_000,
} as const;
