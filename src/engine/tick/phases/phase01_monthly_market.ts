/**
 * phase01_monthly_market.ts
 * =========================
 * Pipeline Phase 1 (Monthly) — Myoseki market price drift.
 */

import type { WorldState } from "../../types/world";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { RNGRegistry } from "../../core/RNGRegistry";

export function phase01_monthly_market(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase01_monthly_market");
  // Only run on month boundaries
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- transientContext is optional on WorldState
  const boundaries = (world as any).transientContext?.boundaries;
  if (!boundaries?.monthBoundary) return builder.build();

  const market = world.myosekiMarket;
  if (!market?.stocks) return builder.build();

  const rng = RNGRegistry.getSystemRNG(
    world,
    "economics",
    `month-${world.year}-${world.calendar.month}`
  );

  const updatedStocks = { ...market.stocks };
  for (const stock of Object.values(market.stocks)) {
    if (stock.status === "available" && stock.askingPrice) {
      // Monthly jitter: +/- 3% price shift
      const drift = 1 + (rng.next() - 0.5) * 0.06;
      const updatedStock = {
        ...stock,
        askingPrice: Math.round((stock.askingPrice * drift) / 10000) * 10000,
      };
      updatedStocks[stock.id] = updatedStock;
    }
  }

  // Note: myosekiMarket updates are not directly supported by ImpactBuilder yet
  // For now, we'll update them directly as myosekiMarket is a nested state
  world.myosekiMarket = { ...market, stocks: updatedStocks };

  return builder.build();
}
