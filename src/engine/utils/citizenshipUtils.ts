import type { Rikishi } from "../types/rikishi";
import { FOREIGN_RIKISHI_LIMIT_PER_HEYA } from "../../constants/engine/recruitment";

export const NATURALIZATION_YEARS = 5;

/**
 * Determines the current citizenship status of a rikishi.
 */
export function getCitizenshipStatus(
  rikishi: Rikishi,
  currentYear: number
): "native" | "foreign" | "naturalized" {
  if (
    !rikishi.nationality ||
    rikishi.nationality === "Japan" ||
    rikishi.nationality === "Japanese"
  ) {
    return "native";
  }

  // "dual" citizens hold Japanese citizenship from the start (§5.3) — they
  // behave exactly like naturalized rikishi for slot purposes.
  if (rikishi.citizenshipStatus === "naturalized" || rikishi.citizenshipStatus === "dual") {
    return "naturalized";
  }

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
 * The canonical limit is FOREIGN_RIKISHI_LIMIT_PER_HEYA (1 slot, §13.1).
 */
export function getHeyaForeignUsage(rikishiList: Rikishi[], currentYear: number): number {
  let count = 0;
  for (const r of rikishiList) {
    if (countsAsForeign(r, currentYear)) {
      count++;
    }
  }
  return count;
}

export function isAtForeignLimit(rikishiList: Rikishi[], currentYear: number): boolean {
  return getHeyaForeignUsage(rikishiList, currentYear) >= FOREIGN_RIKISHI_LIMIT_PER_HEYA;
}
