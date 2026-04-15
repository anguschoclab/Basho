/**
 * uiActions.ts
 *
 * Action functions that mutate world state from UI interactions.
 * Extracted from uiDigest.ts to separate concerns.
 */

import type { WorldState } from "../engine/types/world";
import type { DietRegimen } from "../engine/types/economy";

/**
 * Perform a contract renewal.
 * Decouples the UI from direct engine mutations.
 */
export function renewSponsorContract(
  world: WorldState,
  relId: string,
  sponsorId?: string
): boolean {
  const pool = world.sponsorPool;
  if (!pool) return false;

  if (sponsorId) {
    const sponsor = pool.sponsors.get(sponsorId);
    if (sponsor) {
      const relIdx = sponsor.relationships.findIndex((r) => r.relId === relId);
      if (relIdx >= 0) {
        const rel = sponsor.relationships[relIdx];
        sponsor.relationships[relIdx] = {
          ...rel,
          endsAtTick: (world.week ?? 0) + 52,
          strength: Math.min(5, rel.strength + 1) as 1 | 2 | 3 | 4 | 5,
        };
        sponsor.loyalty = Math.min(100, sponsor.loyalty + 3);
        return true;
      }
    }
  }

  for (const sponsor of pool.sponsors.values()) {
    const relIdx = sponsor.relationships.findIndex((r) => r.relId === relId);
    if (relIdx >= 0) {
      const rel = sponsor.relationships[relIdx];
      sponsor.relationships[relIdx] = {
        ...rel,
        endsAtTick: (world.week ?? 0) + 52,
        strength: Math.min(5, rel.strength + 1) as 1 | 2 | 3 | 4 | 5,
      };
      sponsor.loyalty = Math.min(100, sponsor.loyalty + 3);
      return true;
    }
  }
  return false;
}

/**
 * Update heya diet via presenter.
 */
export function setHeyaDietAction(world: WorldState, heyaId: string, diet: DietRegimen): boolean {
  const heya = world.heyas.get(heyaId);
  if (!heya) return false;
  if (!heya.welfareState) {
    heya.welfareState = {
      welfareRisk: 0,
      activeDiet: diet,
      complianceState: "compliant",
      weeksInState: 0,
    };
  } else {
    heya.welfareState.activeDiet = diet;
  }
  return true;
}
