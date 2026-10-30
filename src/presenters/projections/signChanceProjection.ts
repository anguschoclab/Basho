/**
 * signChanceProjection.ts
 * =======================
 * Player-side sign-chance projection (P4) — the same model the engine uses
 * to resolve competing suitors (prestige + scout negotiation + dormitory +
 * rival-suitor drag), computed once per heya and applied per prospect.
 */

import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import {
  computeSignChance,
  bestScoutNegotiation,
  heyaHasDormitory,
} from "@/engine/recruitment/scoutMissions";

/**
 * Returns a function mapping rival-suitor count → baseline signing chance
 * for a standard offer at high interest. `null` when the heya is missing.
 */
export function makePlayerSignChance(
  world: WorldState,
  playerHeya: Heya | null | undefined
): ((rivalSuitors: number) => number) | null {
  if (!playerHeya) return null;
  const ctx = {
    heyaPrestige: playerHeya.reputation ?? 50,
    negotiation: bestScoutNegotiation(world, playerHeya.id),
    hasDormitory: heyaHasDormitory(world, playerHeya.id),
  };
  return (rivalSuitors: number) =>
    computeSignChance({
      competingSuitors: rivalSuitors,
      ...ctx,
      offerType: "standard",
      interest: "high",
    });
}
