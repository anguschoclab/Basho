import type { Rikishi } from "../types/rikishi";

const NATURALIZATION_YEARS = 5;

/**
 * Determines the current citizenship status of a rikishi.
 */
export function getCitizenshipStatus(
  rikishi: Rikishi,
  currentYear: number
): "native" | "foreign" | "naturalized" {
  if (rikishi.nationality === "Japan" || rikishi.nationality === "Japanese") {
    return "native";
  }

  if (rikishi.citizenshipStatus === "naturalized") return "naturalized";

  // Check tenure for automatic naturalization logic
  if (rikishi.joinedHeyaDate) {
    const joinedYear = parseInt(rikishi.joinedHeyaDate, 10);
    if (currentYear >= joinedYear + NATURALIZATION_YEARS) {
      return "naturalized";
    }
  }

  return "foreign";
}

/**
 * Checks if a rikishi counts against the foreign recruitment limit.
 */
export function countsAsForeign(rikishi: Rikishi, currentYear: number): boolean {
  return getCitizenshipStatus(rikishi, currentYear) === "foreign";
}

/**
 * Calculates how many years until a foreign-born rikishi is eligible for citizenship.
 */
export function yearsUntilNaturalization(rikishi: Rikishi, currentYear: number): number {
  if (getCitizenshipStatus(rikishi, currentYear) !== "foreign") return 0;

  const joinedYear = parseInt(rikishi.joinedHeyaDate || String(currentYear), 10);
  const eligibleYear = joinedYear + NATURALIZATION_YEARS;
  return Math.max(0, eligibleYear - currentYear);
}

/**
 * Returns the current foreign quota usage for a given stable.
 * Limits are typically 2 per heya.
 */
export function getHeyaForeignUsage(rikishiList: Rikishi[], currentYear: number): number {
  // ⚡ Bolt Optimization: Use a direct for...of loop instead of Array.from().filter().length
  // to avoid O(N) intermediate array allocation overhead
  let count = 0;
  for (const r of rikishiList) {
    if (countsAsForeign(r, currentYear)) {
      count++;
    }
  }
  return count;
}

export function isAtForeignLimit(rikishiList: Rikishi[], currentYear: number): boolean {
  return getHeyaForeignUsage(rikishiList, currentYear) >= 2;
}
