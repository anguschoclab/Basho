/**
 * dohyo.ts — venue clay conditions (W J).
 *
 * Each basho rolls a `dohyoCondition` at init from its venue's climate
 * profile (Kyushu's dry clay runs slick; humid Nagoya packs heavy). The
 * condition applies the SAME bout-clone modifier to both rikishi — the
 * dohyo doesn't pick sides — nudging slip/fall rates and bout tempo
 * without touching physics internals.
 */

import {
  DOHYO_HEAVY_SPEED_PENALTY,
  DOHYO_HEAVY_STAMINA_PENALTY,
  DOHYO_SLICK_BALANCE_PENALTY,
  DOHYO_WEIGHTS,
} from "@/constants/engine/geography";
import type { SeededRNG } from "@/engine/core/rng";
import type { BashoName, DohyoCondition } from "@/engine/types/basho";
import type { Rikishi } from "@/engine/types/rikishi";

/** Roll the basho's clay condition from its venue weight profile. */
export function rollDohyoCondition(rng: SeededRNG, bashoName: BashoName): DohyoCondition {
  const [firm, slick] = DOHYO_WEIGHTS[bashoName] ?? [1, 0, 0];
  const roll = rng.next();
  if (roll < firm) return "firm";
  if (roll < firm + slick) return "slick";
  return "heavy";
}

/**
 * Apply the venue modifier to a bout clone — symmetric by design (both
 * rikishi get the same call). Slick clay saps balance; heavy clay costs
 * speed and stamina. All magnitudes stay under the 10% plan cap.
 */
export function applyDohyoCondition(r: Rikishi, condition: DohyoCondition | undefined): Rikishi {
  if (!condition || condition === "firm" || !r.stats) return r;
  if (condition === "slick") {
    return {
      ...r,
      stats: {
        ...r.stats,
        balance: Math.max(1, (r.stats.balance ?? 50) * (1 - DOHYO_SLICK_BALANCE_PENALTY)),
      },
    };
  }
  return {
    ...r,
    stats: {
      ...r.stats,
      speed: Math.max(1, (r.stats.speed ?? 50) * (1 - DOHYO_HEAVY_SPEED_PENALTY)),
      stamina: Math.max(1, (r.stats.stamina ?? 50) * (1 - DOHYO_HEAVY_STAMINA_PENALTY)),
    },
  };
}
