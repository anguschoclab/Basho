/**
 * phase01_daily_sponsors.ts
 * =========================
 * Pipeline Phase 1 (Daily) — Sponsor satisfaction pulse.
 *
 * Logic: Every day, sponsors update their satisfaction based on
 * heya activity and reputation.
 */

import type { WorldState } from "../../types/world";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { RNGRegistry } from "../../core/RNGRegistry";

export function phase01_daily_sponsors(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase01_daily_sponsors");
  const pool = world.sponsorPool;
  if (!pool?.sponsors) return builder.build();

  const rng = RNGRegistry.getSystemRNG(world, "economics", `sponsors-day-${world.dayIndexGlobal}`);

  // Clone sponsor pool map and sponsors to avoid mutation
  const nextSponsors = new Map(pool.sponsors);
  for (const [id, sponsor] of pool.sponsors) {
    if (!sponsor.active) {
      nextSponsors.set(id, sponsor);
      continue;
    }

    // Daily jitter: +/- 0.5% satisfaction
    const jitter = (rng.next() - 0.5) * 1.0;

    // Check if heya they support is doing well (simplified for now: trend based)
    // In a full implementation, we'd check transientContext for recent wins

    // For now, let's just use the jitter to simulate an organic pulse
    const nextSponsor = {
      ...sponsor,
      satisfaction: Math.min(100, Math.max(0, (sponsor.satisfaction ?? 50) + jitter)),
    };
    nextSponsors.set(id, nextSponsor);
  }

  // Note: sponsorPool updates are not directly supported by ImpactBuilder yet
  // For now, we'll update them directly as sponsorPool is a nested state
  world.sponsorPool = {
    ...pool,
    sponsors: nextSponsors,
  };

  return builder.build();
}
