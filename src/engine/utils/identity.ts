import type { Rikishi } from "../types/rikishi";

/**
 * Canon check for 'foreign' status (used in naturalization and roster caps).
 * In Sumo Manager Pro, "Foreign" is defined as any rikishi whose nationality
 * is NOT Japan, regardless of origin.
 */
export function isForeign(rikishi: { nationality?: string }): boolean {
  if (!rikishi.nationality) return false;
  const n = rikishi.nationality.toLowerCase();
  return n !== "japan" && n !== "japanese";
}

/**
 * Checks if the rikishi is from a university/college background (affects debut rank).
 */
export function isCollegeRecruit(rikishi: Pick<Rikishi, "origin">): boolean {
  if (!rikishi.origin) return false;
  const o = rikishi.origin.toLowerCase();
  return o.includes("university") || o.includes("univ") || o.includes("college");
}
