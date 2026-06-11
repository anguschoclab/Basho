/**
 * phase01_monthly_market.ts
 * =========================
 * Pipeline Phase 1 (Monthly) — Myoseki market price drift.
 */

import type { WorldState } from "../../types/world";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { RNGRegistry } from "../../core/RNGRegistry";
import {
  MARKET_DRIFT_RANGE,
  STOCK_PRICE_ROUNDING,
  RNG_MIDPOINT,
} from "../../../constants/engine/economy";

export function phase01_monthly_market(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase01_monthly_market");
  // Only run on month boundaries
  const boundaries = world.transientContext?.boundaries;
  if (!boundaries?.monthBoundary) return builder.build();

  const market = world.myosekiMarket;
  if (!market?.stocks) return builder.build();

  const rng = RNGRegistry.getSystemRNG(
    world,
    "economics",
    `month-${world.year}-${Math.floor(world.calendar?.currentWeek ?? 1 / 4)}`
  );

  const updatedStocks = { ...market.stocks };
  for (const key in market.stocks) {
    if (!Object.prototype.hasOwnProperty.call(market.stocks, key)) continue;
    const stock = market.stocks[key];
    if (stock.status === "available" && stock.askingPrice) {
      // Monthly jitter: +/- 3% price shift
      const drift = 1 + (rng.next() - RNG_MIDPOINT) * MARKET_DRIFT_RANGE;
      const updatedStock = {
        ...stock,
        askingPrice:
          Math.round((stock.askingPrice * drift) / STOCK_PRICE_ROUNDING) * STOCK_PRICE_ROUNDING,
      };
      updatedStocks[key] = updatedStock;
    }
  }

  builder.updateWorldField("myosekiMarket", { ...market, stocks: updatedStocks });

  return builder.build();
}
