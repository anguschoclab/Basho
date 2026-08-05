/**
 * src/engine/governance/dohyoIri.ts
 *
 * Dohyo-iri ceremony style assignment for Yokozuna promotions.
 * In real sumo, a Yokozuna performs the dohyo-iri in one of two styles:
 * Unryu (雲龍) or Shiranui (不知火). The style is traditionally chosen
 * by the heya and remains fixed for the yokozuna's career.
 */

import type { Rikishi } from "../types/rikishi";
import type { Rank } from "../types/banzuke";
import { rngFromSeed } from "../rng";

/**
 * Assigns a dohyo-iri ceremony style to a rikishi upon yokozuna promotion.
 * The style is deterministic based on the world seed and rikishi ID.
 * Non-yokozuna promotions do not receive a style.
 *
 * @param rikishi - The rikishi being promoted
 * @param newRank - The new rank being promoted to
 * @param worldSeed - The world seed for deterministic RNG
 * @returns Partial<Rikishi> with dohyoIriStyle set if applicable
 */
export function assignDohyoIriStyle(
  rikishi: Rikishi,
  newRank: Rank,
  worldSeed: string
): Partial<Rikishi> {
  if (newRank !== "yokozuna") {
    return {};
  }

  // Don't overwrite if already assigned
  if (rikishi.dohyoIriStyle) {
    return { dohyoIriStyle: rikishi.dohyoIriStyle };
  }

  const rng = rngFromSeed(`${worldSeed}::dohyo-iri`, "governance", "dohyoIri");
  const style = rng.next() < 0.5 ? "unryu" : "shiranui";

  return { dohyoIriStyle: style };
}
