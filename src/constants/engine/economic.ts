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

/** Weekly allowance for non-sekitori rikishi (¥). */
export const NON_SEKITORI_ALLOWANCE = 15_000;

/**
 * Minimum weekly income floor guaranteed by kōenkai (¥).
 * Constitution §A6 & C2.4: covers staff/roster for a new heya without sekitori.
 * Formula: (5 rikishi × ¥2,000) + (3 staff × ¥6,000) = ¥28,000.
 */
export const KOENKAI_SURVIVAL_FLOOR = 28_000;

/** JSA debt limit before governance intervention (¥). */
export const DEBT_LIMIT = -20_000_000;

/** Standard benefactor bailout amount (¥). */
export const BENEFACTOR_BAILOUT_AMOUNT = 10_000_000;

/** Kensho payout per envelope (¥). Constitution §6. */
export const KENSHO_AMOUNT_PER_ENVELOPE = 70_000;

/** Kensho split per envelope (¥). */
export const KENSHO_SPLIT = {
  cash: 10_000,
  retirement: 50_000,
  jsaFee: 10_000,
} as const;

/** Mochikyukin (cumulative bonus) point value (¥ per point). */
export const MOCHIKYUKIN_POINT_VALUE = 4_000;

/** Mochikyukin points earned per kachi-koshi (winning record). */
export const MOCHIKYUKIN_POINTS_KACHI_KOSHI = 1;

/** Mochikyukin points earned per yusho (championship). */
export const MOCHIKYUKIN_POINTS_YUSHO = 10;

/** Mochikyukin points earned per kinboshi (v Yokozuna). */
export const MOCHIKYUKIN_POINTS_KINBOSHI = 3;

/** Mochikyukin points earned per jun-yusho (runner-up). */
export const MOCHIKYUKIN_POINTS_JUN_YUSHO = 5;

/** Travel/jungyo allowance per sekitori per year (¥). */
export const TRAVEL_ALLOWANCE_YEARLY = {
  yokozuna: 1_500_000,
  ozeki: 1_200_000,
  sekiwake: 900_000,
  komusubi: 750_000,
  maegashira: 600_000,
  juryo: 450_000,
} as const;

/** JSA per-wrestler monthly subsidy by division (¥). */
export const JSA_PER_WRESTLER_SUBSIDY_MONTHLY = {
  makuuchi: 150_000,
  juryo: 100_000,
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
 */
export const FIXED_OPERATING_OVERHEAD_WEEKLY = 250_000;

/**
 * Monthly operating overhead per sekitori, scaled by rank (¥).
 * A roster-strength-scaled heya expense that is NOT covered by the JSA salary
 * credit (which goes to the rikishi, not the heya). Prevents strong rosters from
 * compounding funds without bound.
 */
export const SEKITORI_OVERHEAD_MONTHLY = {
  yokozuna: 1_500_000,
  ozeki: 1_000_000,
  sekiwake: 700_000,
  komusubi: 550_000,
  maegashira: 400_000,
  juryo: 250_000,
} as const;

/**
 * Monthly operating overhead per non-sekitori rikishi (¥).
 * Covers chanko provisions, tsukebito duties, and ring time for lower-division
 * wrestlers. Intentional roster-scaled sink.
 */
export const NON_SEKITORI_OVERHEAD_MONTHLY = 40_000;

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

// Kensho split ratios
export const KENSHO_RIKISHI_SHARE_RATIO = 0.5;
export const KENSHO_RETIREMENT_DIVERSION_RATIO = 0.3;

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

// Maintenance subsidy (yen)
export const MAINTENANCE_SUBSIDY_AMOUNT = 500_000;

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
