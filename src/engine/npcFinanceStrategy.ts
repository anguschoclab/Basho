import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { Oyakata } from "./types/oyakata";
import type { OyakataArchetype } from "./types/oyakata";
import { stableSort } from "./utils/sort";
import { buyMyoseki } from "./myosekiMarket";
import { createImpactBuilder } from "./core/ImpactBuilder";
import type { StateImpact } from "./core/StateImpact";

interface FinanceStrategy {
  evaluateFinances: (world: WorldState, heya: Heya, oyakata: Oyakata) => StateImpact;
}

function getSortedMyosekiStocks(world: WorldState) {
  if (!world.myosekiMarket) return [];
  return stableSort(Object.values(world.myosekiMarket.stocks), (x) => x.id);
}

function evaluateFinancesBase(
  world: WorldState,
  heya: Heya,
  oyakata: Oyakata,
  thresholdFn: () => number,
  ambitionCheck: () => boolean,
  reasoning: string,
  extraCheck?: (stock: any) => boolean
): StateImpact {
  const builder = createImpactBuilder("evaluateFinances");
  if (!world.myosekiMarket) return builder.build();

  const threshold = thresholdFn();
  if (heya.funds > threshold && ambitionCheck()) {
    for (const stock of getSortedMyosekiStocks(world)) {
      if (
        stock.status === "available" &&
        stock.askingPrice &&
        stock.askingPrice < heya.funds - 100_000_000
      ) {
        if (extraCheck && !extraCheck(stock)) continue;
        
        builder.merge(buyMyoseki(world, oyakata.id, heya.id, stock.id));
        builder.logEvent(
          "NPC_MANAGER_DECISION",
          "narrative",
          {
            archetype: oyakata.archetype,
            action: "buy_myoseki",
            stockId: stock.id,
            price: stock.askingPrice,
            reasoning,
          },
          { heyaId: heya.id, importance: "minor" }
        );
        break; // Only buy one per month per heya
      }
    }
  }
  return builder.build();
}

export const DefaultFinanceStrategy: FinanceStrategy = {
  evaluateFinances(world: WorldState, heya: Heya, oyakata: Oyakata) {
    return evaluateFinancesBase(
      world,
      heya,
      oyakata,
      () => {
        const isHoarder = oyakata.traits.risk < 30;
        let threshold = isHoarder ? 500_000_000 : 300_000_000;
        if (oyakata.mood === "anxious") threshold *= 1.5;
        else if (oyakata.mood === "obsessed") threshold *= 0.8;
        return threshold;
      },
      () => oyakata.traits.ambition > 50,
      "Default oyakata purchased myoseki"
    );
  },
};

export const TraditionalistFinanceStrategy: FinanceStrategy = {
  evaluateFinances(world, heya, oyakata) {
    return evaluateFinancesBase(
      world,
      heya,
      oyakata,
      () => oyakata.traits.patience > 70 ? 700_000_000 : 600_000_000,
      () => oyakata.traits.tradition > 60,
      "Traditionalist purchased myoseki for tradition",
      (stock) => stock.askingPrice! < heya.funds - 200_000_000
    );
  },
};

export const ScientistFinanceStrategy: FinanceStrategy = {
  evaluateFinances(world, heya, oyakata) {
    return evaluateFinancesBase(
      world,
      heya,
      oyakata,
      () => 350_000_000,
      () => oyakata.traits.ambition > 60,
      "Scientist purchased myoseki for training efficiency"
    );
  },
};

export const GamblerFinanceStrategy: FinanceStrategy = {
  evaluateFinances(world, heya, oyakata) {
    return evaluateFinancesBase(
      world,
      heya,
      oyakata,
      () => {
        let threshold = 200_000_000;
        if (oyakata.quirks?.includes("Gambler's Instinct")) threshold = 150_000_000;
        if (oyakata.traits.patience < 30) threshold = 100_000_000;
        return threshold;
      },
      () => oyakata.traits.risk > 50,
      "Gambler purchased myoseki as a risk",
      (stock) => {
        if (stock.askingPrice! >= heya.funds - 50_000_000) return false;
        if (oyakata.quirks?.includes("Cold Pragmatist") && stock.askingPrice! > 100_000_000) return false;
        return true;
      }
    );
  },
};

export const NurturerFinanceStrategy: FinanceStrategy = {
  evaluateFinances(world, heya, oyakata) {
    return evaluateFinancesBase(
      world,
      heya,
      oyakata,
      () => oyakata.quirks?.includes("Family First") ? 800_000_000 : 700_000_000,
      () => oyakata.traits.compassion > 60,
      "Nurturer purchased myoseki for rikishi welfare",
      (stock) => {
        if (stock.askingPrice! >= heya.funds - 200_000_000) return false;
        if (oyakata.quirks?.includes("Welfare Hawk") && heya.welfareState?.complianceState !== "compliant") return false;
        return true;
      }
    );
  },
};

export const TyrantFinanceStrategy: FinanceStrategy = {
  evaluateFinances(world, heya, oyakata) {
    return evaluateFinancesBase(
      world,
      heya,
      oyakata,
      () => 1_000_000_000,
      () => true,
      "Tyrant purchased myoseki for power",
      (stock) => stock.askingPrice! < heya.funds - 300_000_000
    );
  },
};

export const StrategistFinanceStrategy: FinanceStrategy = {
  evaluateFinances(world, heya, oyakata) {
    return evaluateFinancesBase(
      world,
      heya,
      oyakata,
      () => 400_000_000,
      () => oyakata.traits.ambition > 50,
      "Strategist purchased myoseki for optimal timing",
      (stock) => stock.askingPrice! < heya.funds - 150_000_000
    );
  },
};

export const StrictFinanceStrategy: FinanceStrategy = {
  evaluateFinances(world, heya, oyakata) {
    return evaluateFinancesBase(
      world,
      heya,
      oyakata,
      () => 550_000_000,
      () => oyakata.traits.tradition > 50,
      "Strict purchased myoseki following traditional patterns",
      (stock) => stock.askingPrice! < heya.funds - 180_000_000
    );
  },
};

export const IndulgentFinanceStrategy: FinanceStrategy = {
  evaluateFinances(world, heya, oyakata) {
    return evaluateFinancesBase(
      world,
      heya,
      oyakata,
      () => 450_000_000,
      () => oyakata.traits.ambition > 40,
      "Indulgent purchased myoseki generously",
      (stock) => stock.askingPrice! < heya.funds - 160_000_000
    );
  },
};

export function getFinanceStrategy(archetype: OyakataArchetype): FinanceStrategy {
  switch (archetype) {
    case "traditionalist": return TraditionalistFinanceStrategy;
    case "scientist": return ScientistFinanceStrategy;
    case "gambler": return GamblerFinanceStrategy;
    case "nurturer": return NurturerFinanceStrategy;
    case "tyrant": return TyrantFinanceStrategy;
    case "strategist": return StrategistFinanceStrategy;
    case "strict": return StrictFinanceStrategy;
    case "indulgent": return IndulgentFinanceStrategy;
    default: return DefaultFinanceStrategy;
  }
}
