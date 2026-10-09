/**
 * useSponsorsDerived.ts
 *
 * Derived sponsor data for SponsorsPanel — active relationships,
 * kōenkai membership, churned sponsors, and tier distribution.
 */

import { useMemo } from "react";
import type { Sponsor, SponsorRelationship, SponsorTier, Koenkai } from "@/engine/types/sponsors";
import type { WorldState } from "@/presenters/uiDigest";

/** Defines the structure for sponsor view. */
export interface SponsorView {
  sponsor: Sponsor;
  role: string;
  strength: number;
}

export function useSponsorsDerived(world: WorldState | null, playerHeyaId: string | null) {
  return useMemo(() => {
    if (!world?.sponsorPool || !playerHeyaId) {
      return {
        activeSponsors: [] as SponsorView[],
        koenkai: null as Koenkai | null,
        churned: [] as Sponsor[],
        tierSummary: {} as Record<SponsorTier, number>,
      };
    }

    const pool = world.sponsorPool;

    const active: SponsorView[] = [];
    const lost: Sponsor[] = [];
    const tiers: Record<SponsorTier, number> = { T0: 0, T1: 0, T2: 0, T3: 0, T4: 0, T5: 0 };

    for (const sponsor of pool.sponsors.values()) {
      let activeBest: SponsorRelationship | null = null;
      let hasEnded = false;

      for (const r of sponsor.relationships) {
        if (r.targetId === playerHeyaId && r.targetType === "heya") {
          if (!r.endsAtTick) {
            if (!activeBest || r.strength > activeBest.strength) {
              activeBest = r;
            }
          } else {
            hasEnded = true;
          }
        }
      }

      if (activeBest) {
        active.push({ sponsor, role: activeBest.role, strength: activeBest.strength });
        tiers[sponsor.tier] = (tiers[sponsor.tier] || 0) + 1;
      } else if (hasEnded) {
        lost.push(sponsor);
      }
    }

    // Sort: highest tier first, then by strength
    active.sort((a, b) => {
      const tierOrder = ["T5", "T4", "T3", "T2", "T1", "T0"];
      const ta = tierOrder.indexOf(a.sponsor.tier);
      const tb = tierOrder.indexOf(b.sponsor.tier);
      if (ta !== tb) return ta - tb;
      return b.strength - a.strength;
    });

    const koe = pool.koenkais?.get(playerHeyaId) ?? null;

    return { activeSponsors: active, koenkai: koe, churned: lost.slice(0, 5), tierSummary: tiers };
  }, [world, playerHeyaId]);
}
