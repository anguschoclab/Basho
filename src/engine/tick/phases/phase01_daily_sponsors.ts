/**
 * phase01_daily_sponsors.ts
 * =========================
 * Pipeline Phase 1 (Daily) — Sponsor satisfaction pulse.
 * 
 * Logic: Every day, sponsors update their satisfaction based on
 * heya activity and reputation.
 */

import type { WorldState } from "../../types/world";
import { RNGRegistry } from "../../core/RNGRegistry";

export function phase01_daily_sponsors(world: WorldState): WorldState {
  const pool = world.sponsorPool;
  if (!pool?.sponsors) return world;

  const rng = RNGRegistry.getSystemRNG(world, "sponsors", `day-${world.dayIndexGlobal}`);

  // iterate through all sponsors and apply micro-shifts
  for (const sponsor of pool.sponsors.values()) {
    if (!sponsor.active) continue;

    // Daily jitter: +/- 0.5% satisfaction
    const jitter = (rng.next() - 0.5) * 1.0;
    
    // Check if heya they support is doing well (simplified for now: trend based)
    // In a full implementation, we'd check transientContext for recent wins
    
    // For now, let's just use the jitter to simulate an organic pulse
    sponsor.satisfaction = Math.min(100, Math.max(0, (sponsor.satisfaction ?? 50) + jitter));
  }


  return world;
}
