import type { Rikishi } from "@/engine/types/rikishi";
import type { SeededRNG } from "@/engine/core/rng";
import { FOREIGN_ORIGIN_TABLE } from "@/constants/engine/recruitment";

/**
 * Canon check for 'foreign' status (used in naturalization and roster caps).
 * In Basho, "Foreign" is defined as any rikishi whose nationality
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

/**
 * Weighted country-of-origin roll for foreign rikishi (Sept-2026 census).
 * Shared by worldgen (`generateFullRikishi`) and the recruiting pipeline
 * (`rollOriginIdentity`) so both draw from the same ~74%-Mongolian mix.
 */
export function rollForeignOrigin(rng: SeededRNG): string {
  const roll = rng.next();
  let acc = 0;
  for (const [origin, weight] of FOREIGN_ORIGIN_TABLE) {
    acc += weight;
    if (roll < acc) return origin;
  }
  return FOREIGN_ORIGIN_TABLE[0][0];
}
