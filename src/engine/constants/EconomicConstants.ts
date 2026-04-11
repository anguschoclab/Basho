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

/** Per-facility upkeep multipliers (¥ per quality point per week). */
export const FACILITY_UPKEEP = {
  training: 1_000,
  recovery: 1_000,
  nutrition: 2_000,
} as const;

/** Staff weekly upkeep per member (¥). */
export const STAFF_UPKEEP_PER_MEMBER = 6_000;

/** Daily food cost per rikishi by diet regimen (¥). */
export const DIET_COSTS: Record<string, number> = {
  austerity: 1_000,
  maintenance: 3_000,
  heavy_bulk: 6_000,
  premium: 10_000
} as const;

/** Loan issuance threshold (¥) - when funds drop below this, bailouts are considered. */
export const LOAN_ISSUANCE_THRESHOLD = -5_000_000;

/** Merger threshold (¥) - when funds drop below this, NPC stables are forced to merge. */
export const MERGER_THRESHOLD = -15_000_000;

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
