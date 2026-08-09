/**
 * Yokozuna Attendant Assignment — Tachimochi (sword-bearer) and Tsuyuharai (dew-sweeper)
 *
 * When a rikishi is promoted to yokozuna, two attendants from the same heya
 * are assigned to participate in the dohyo-iri procession. Being selected
 * as an attendant boosts the rikishi's popularity.
 */

import type { Rikishi } from "../types/rikishi";
import type { WorldState } from "../types/world";
import type { StateImpact } from "../core/StateImpact";
import { createImpactBuilder } from "../core/ImpactBuilder";
import { EntityCollection } from "../core/EntityCollection";
import { rngFromSeed } from "../rng";

/** Popularity boost for being selected as an attendant */
export const ATTENDANT_POPULARITY_BOOST = 5;
/**
 * Assign tachimochi and tsuyuharai attendants to a yokozuna.
 * Attendants must be same-heya, non-retired rikishi.
 * Assignment is deterministic based on the world seed and yokozuna ID.
 *
 * @returns StateImpact with attendant assignments and popularity boosts.
 */
export function assignYokozunaAttendants(
  yokozuna: Rikishi,
  world: WorldState
): StateImpact {
  const builder = createImpactBuilder("assignYokozunaAttendants");

  if (!yokozuna.dohyoIriStyle) return builder.build();

  // Skip reassignment if attendants are already set
  if (yokozuna.tachimochiId && yokozuna.tsuyuharaiId) return builder.build();

  // Get same-heya rikishi, excluding the yokozuna and retired rikishi
  const candidates = EntityCollection.getActiveRikishi(world)
    .filter((r) => r.heyaId === yokozuna.heyaId && r.id !== yokozuna.id)
    .sort((a, b) => (a.rankNumber ?? 99) - (b.rankNumber ?? 99));

  if (candidates.length < 2) return builder.build();

  const rng = rngFromSeed(`${world.seed}::attendants`, "governance", "attendants");

  // Select tachimochi (sword-bearer) — prefer higher-ranked
  const tachiIdx = Math.floor(rng.next() * Math.min(candidates.length, 3));
  const tachimochi = candidates[tachiIdx];

  // Select tsuyuharai (dew-sweeper) — different from tachimochi
  const remaining = candidates.filter((r) => r.id !== tachimochi.id);
  if (remaining.length === 0) return builder.build();
  const tsuyuIdx = Math.floor(rng.next() * Math.min(remaining.length, 3));
  const tsuyuharai = remaining[tsuyuIdx];

  // Assign attendant IDs to yokozuna
  builder.updateRikishi(yokozuna.id, {
    tachimochiId: tachimochi.id,
    tsuyuharaiId: tsuyuharai.id,
  });

  // Boost popularity for attendants (via economics.popularity)
  if (tachimochi.economics) {
    builder.updateRikishi(tachimochi.id, {
      economics: {
        ...tachimochi.economics,
        popularity: Math.min(100, tachimochi.economics.popularity + ATTENDANT_POPULARITY_BOOST),
      },
    });
  }

  if (tsuyuharai.economics) {
    builder.updateRikishi(tsuyuharai.id, {
      economics: {
        ...tsuyuharai.economics,
        popularity: Math.min(100, tsuyuharai.economics.popularity + ATTENDANT_POPULARITY_BOOST),
      },
    });
  }

  builder.logEvent(
    "BASHO_STATUS",
    "promotion",
    {
      status: "attendant_assignment",
      description: `${tachimochi.shikona} appointed as tachimochi and ${tsuyuharai.shikona} as tsuyuharai for ${yokozuna.shikona}.`,
      yokozunaId: yokozuna.id,
      tachimochiId: tachimochi.id,
      tsuyuharaiId: tsuyuharai.id,
    },
    { importance: "notable", rikishiId: yokozuna.id, heyaId: yokozuna.heyaId }
  );

  return builder.build();
}

/**
 * Validate that a rikishi is eligible to be an attendant.
 */
export function isEligibleAttendant(rikishi: Rikishi, yokozuna: Rikishi): boolean {
  if (rikishi.id === yokozuna.id) return false;
  if (rikishi.heyaId !== yokozuna.heyaId) return false;
  if (rikishi.isRetired) return false;
  return true;
}
