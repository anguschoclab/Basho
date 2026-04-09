/**
 * phase01_monthly_market.ts
 * =========================
 * Pipeline Phase 1 (Monthly) — Myoseki market price drift.
 */

import type { WorldState } from "../../types/world";
import { RNGRegistry } from "../../core/RNGRegistry";

export function phase01_monthly_market(world: WorldState): WorldState {
  // Only run on month boundaries
  const boundaries = (world as any).transientContext?.boundaries;
  if (!boundaries?.monthBoundary) return world;

  const market = world.myosekiMarket;
  if (!market?.stocks) return world;

  const rng = RNGRegistry.getSystemRNG(world, "market", `month-${world.year}-${world.calendar.month}`);

  for (const stock of Object.values(market.stocks)) {
    if (stock.status === "available" && stock.askingPrice) {
      // Monthly jitter: +/- 3% price shift
      const drift = 1 + (rng.next() - 0.5) * 0.06;
      stock.askingPrice = Math.round(stock.askingPrice * drift / 10000) * 10000; // block round to 10k
    }
  }

  return world;
}
