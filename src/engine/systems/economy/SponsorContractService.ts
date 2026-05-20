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

/**
 * Renews a sponsor contract.
 * Extends the contract duration and increases relationship strength and loyalty.
 *
 * @param {WorldState} world - The current world state.
 * @param {string} relationshipId - The relationship ID to renew.
 * @param {string} sponsorId - The sponsor ID.
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
  sponsorId: string
): StateImpact {
  const builder = createImpactBuilder("renewSponsorContract");
  const pool = world.sponsorPool;
  if (!pool) return builder.build();

  const sponsor = pool.sponsors.get(sponsorId);
  if (!sponsor) return builder.build();

  const relIdx = sponsor.relationships.findIndex((r) => r.relId === relationshipId);
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
    "MANAGEMENT_DECISION",
    "economy",
    {
      action: "sponsor_renewal",
      sponsor: sponsor.name,
      relationshipId,
    },
    { importance: "notable" }
  );

  return builder.build();
}
