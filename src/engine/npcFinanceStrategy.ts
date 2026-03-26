import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { Oyakata } from "./types/oyakata";
import { stableSort } from "./utils/sort";
import { buyMyoseki } from "./myosekiMarket";

interface FinanceStrategy {
  evaluateFinances: (world: WorldState, heya: Heya, oyakata: Oyakata) => void;
}

export const DefaultFinanceStrategy: FinanceStrategy = {
  evaluateFinances(world: WorldState, heya: Heya, oyakata: Oyakata) {
    if (!world.myosekiMarket) return;
    
    // Different archetypes have different spending thresholds
    const isAmbitious = oyakata.traits.ambition > 50;
    const isHoarder = oyakata.traits.risk < 30;
    
    const threshold = isHoarder ? 500_000_000 : 300_000_000;

    if (heya.funds > threshold && isAmbitious) {
      const stocks = stableSort(Object.values(world.myosekiMarket.stocks), (x: any) => x.id || String(x));
      for (const stock of stocks) {
        if (stock.status === "available" && stock.askingPrice && stock.askingPrice < (heya.funds - 100_000_000)) {
           buyMyoseki(world, oyakata.id, heya.id, stock.id);
           break; // Only buy one per month per heya
        }
      }
    }
  }
};

export function getFinanceStrategy(archetype: string): FinanceStrategy {
   return DefaultFinanceStrategy;
}
