/**
 * src/engine/systems/economy/SponsorContractService.ts
 * ======================================================
 * Sponsor Contract Service
 *
 * Responsibilities:
 * - Handle sponsor contract renewals
 * - Update relationship strength and loyalty
 * - Extend contract end dates
 * - Log renewal events
 */

import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import type { WorldState } from "../../types/world";
import type { Sponsor } from "../../types/sponsors";

/**
 * Renews a sponsor contract.
 * Extends the contract duration and increases relationship strength and loyalty.
 *
 * @param {WorldState} world - The current world state.
 * @param {string} relationshipId - The relationship ID to renew.
 * @param {string} sponsorId - The sponsor ID.
 * @param {object} [hints] - Optional pre-resolved sponsor and relationship index to skip redundant Map.get/findIndex lookups. The relIndex is validated against relationshipId and falls back to findIndex on mismatch.
 * @param {Sponsor} [hints.sponsor] - Pre-resolved sponsor object (skips pool.sponsors.get).
 * @param {number} [hints.relIndex] - Pre-resolved relationship index (validated, falls back to findIndex on mismatch).
 * @returns {StateImpact} Impact describing contract renewal (or empty if failed).
 *
 * @example
 * ```ts
 * const impact = renewSponsorContract(world, relationshipId, sponsorId);
 * const updatedWorld = resolveImpacts(world, [impact]);
 * ```
 */
export function renewSponsorContract(
  world: WorldState,
  relationshipId: string,
  sponsorId: string,
  hints?: { sponsor?: Sponsor; relIndex?: number }
): StateImpact {
  const builder = createImpactBuilder("renewSponsorContract");
  const pool = world.sponsorPool;
  if (!pool) return builder.build();

  const sponsor = hints?.sponsor ?? pool.sponsors.get(sponsorId);
  if (!sponsor) return builder.build();

  let relIdx: number;
  if (hints?.relIndex !== undefined) {
    const hintedRel = sponsor.relationships[hints.relIndex];
    if (hintedRel && hintedRel.relId === relationshipId) {
      relIdx = hints.relIndex;
    } else {
      relIdx = sponsor.relationships.findIndex((r) => r.relId === relationshipId);
    }
  } else {
    relIdx = sponsor.relationships.findIndex((r) => r.relId === relationshipId);
  }
  if (relIdx < 0) return builder.build();

  const rel = sponsor.relationships[relIdx];
  const updatedRelationships = [...sponsor.relationships];
  updatedRelationships[relIdx] = {
    ...rel,
    endsAtTick: (world.week ?? 0) + 52,
    strength: Math.min(5, rel.strength + 1) as 1 | 2 | 3 | 4 | 5,
  };

  builder.updateSponsor(sponsorId, {
    relationships: updatedRelationships,
    loyalty: Math.min(100, sponsor.loyalty + 3),
  });

  builder.logEvent(
    "SPONSOR_UPDATE",
    "sponsor",
    {
      action: "sponsor_renewal",
      sponsor: sponsor.displayName,
      relationshipId,
    },
    { importance: "notable" }
  );

  return builder.build();
}
