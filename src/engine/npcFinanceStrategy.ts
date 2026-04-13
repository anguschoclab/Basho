import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { Oyakata } from "./types/oyakata";
import type { OyakataArchetype } from "./types/oyakata";
import { stableSort } from "./utils/sort";
import { buyMyoseki } from "./myosekiMarket";
import { EventBus } from "./events";

interface FinanceStrategy {
  evaluateFinances: (world: WorldState, heya: Heya, oyakata: Oyakata) => void;
}

export const DefaultFinanceStrategy: FinanceStrategy = {
  evaluateFinances(world: WorldState, heya: Heya, oyakata: Oyakata) {
    if (!world.myosekiMarket) return;

    // Different archetypes have different spending thresholds
    const isAmbitious = oyakata.traits.ambition > 50;
    const isHoarder = oyakata.traits.risk < 30;

    let threshold = isHoarder ? 500_000_000 : 300_000_000;

    // Mood affects spending decisions
    if (oyakata.mood === "anxious") {
      threshold *= 1.5; // Anxious oyakata are more conservative, higher threshold
    } else if (oyakata.mood === "obsessed") {
      threshold *= 0.8; // Obsessed oyakata are more aggressive, lower threshold
    }

    if (heya.funds > threshold && isAmbitious) {
      const stocks = stableSort(
        Object.values(world.myosekiMarket.stocks),
        (x: any) => x.id || String(x)
      );
      for (const stock of stocks) {
        if (
          stock.status === "available" &&
          stock.askingPrice &&
          stock.askingPrice < heya.funds - 100_000_000
        ) {
          buyMyoseki(world, oyakata.id, heya.id, stock.id);
          EventBus.managementDecision(
            world,
            heya.id,
            {
              archetype: oyakata.archetype,
              action: "buy_myoseki",
              stockId: stock.id,
              price: stock.askingPrice,
              reasoning: "Default oyakata purchased myoseki",
            },
            "minor"
          );
          break; // Only buy one per month per heya
        }
      }
    }
  },
};

export const TraditionalistFinanceStrategy: FinanceStrategy = {
  evaluateFinances(world, heya, oyakata) {
    if (!world.myosekiMarket) return;

    // Traditionalists are conservative, prefer facility investment over myoseki
    // They only buy myoseki when they have significant funds and high tradition
    // High patience leads to even more conservative spending (higher threshold)
    let threshold = 600_000_000; // Higher threshold for traditionalists
    if (oyakata.traits.patience > 70) {
      threshold = 700_000_000; // More patient traditionalists save more
    }
    if (heya.funds > threshold && oyakata.traits.tradition > 60) {
      const stocks = stableSort(
        Object.values(world.myosekiMarket.stocks),
        (x: any) => x.id || String(x)
      );
      for (const stock of stocks) {
        if (
          stock.status === "available" &&
          stock.askingPrice &&
          stock.askingPrice < heya.funds - 200_000_000
        ) {
          buyMyoseki(world, oyakata.id, heya.id, stock.id);
          EventBus.managementDecision(
            world,
            heya.id,
            {
              archetype: oyakata.archetype,
              action: "buy_myoseki",
              stockId: stock.id,
              price: stock.askingPrice,
              reasoning: "Traditionalist purchased myoseki for tradition",
            },
            "minor"
          );
          break;
        }
      }
    }
  },
};

export const ScientistFinanceStrategy: FinanceStrategy = {
  evaluateFinances(world, heya, oyakata) {
    if (!world.myosekiMarket) return;

    // Scientists invest in myoseki that boost training efficiency
    // They value myoseki that provide technical advantages
    const threshold = 350_000_000;
    if (heya.funds > threshold && oyakata.traits.ambition > 60) {
      const stocks = stableSort(
        Object.values(world.myosekiMarket.stocks),
        (x: any) => x.id || String(x)
      );
      for (const stock of stocks) {
        if (
          stock.status === "available" &&
          stock.askingPrice &&
          stock.askingPrice < heya.funds - 100_000_000
        ) {
          buyMyoseki(world, oyakata.id, heya.id, stock.id);
          EventBus.managementDecision(
            world,
            heya.id,
            {
              archetype: oyakata.archetype,
              action: "buy_myoseki",
              stockId: stock.id,
              price: stock.askingPrice,
              reasoning: "Scientist purchased myoseki for training efficiency",
            },
            "minor"
          );
          break;
        }
      }
    }
  },
};

export const GamblerFinanceStrategy: FinanceStrategy = {
  evaluateFinances(world, heya, oyakata) {
    if (!world.myosekiMarket) return;

    // Gamblers take big risks, lower threshold but higher ambition check
    let threshold = 200_000_000; // Lower threshold for gamblers
    // Gambler's Instinct quirk further lowers threshold for more aggressive spending
    if (oyakata.quirks?.includes("Gambler's Instinct")) {
      threshold = 150_000_000;
    }
    // Low patience leads to even more aggressive spending (lower threshold)
    if (oyakata.traits.patience < 30) {
      threshold = 100_000_000;
    }
    if (heya.funds > threshold && oyakata.traits.risk > 50) {
      const stocks = stableSort(
        Object.values(world.myosekiMarket.stocks),
        (x: any) => x.id || String(x)
      );
      for (const stock of stocks) {
        if (
          stock.status === "available" &&
          stock.askingPrice &&
          stock.askingPrice < heya.funds - 50_000_000
        ) {
          // Cold Pragmatist quirk prioritizes price over prestige
          if (oyakata.quirks?.includes("Cold Pragmatist") && stock.askingPrice > 100_000_000) {
            continue; // Skip expensive options
          }
          buyMyoseki(world, oyakata.id, heya.id, stock.id);
          EventBus.managementDecision(
            world,
            heya.id,
            {
              archetype: oyakata.archetype,
              action: "buy_myoseki",
              stockId: stock.id,
              price: stock.askingPrice,
              reasoning: "Gambler purchased myoseki as a risk",
            },
            "minor"
          );
          break;
        }
      }
    }
  },
};

export const NurturerFinanceStrategy: FinanceStrategy = {
  evaluateFinances(world, heya, oyakata) {
    if (!world.myosekiMarket) return;

    // Nurturers prioritize rikishi welfare over expansion
    let threshold = 700_000_000; // Very high threshold for nurturers
    // Family First quirk raises threshold even more to prioritize family over expansion
    if (oyakata.quirks?.includes("Family First")) {
      threshold = 800_000_000;
    }
    if (heya.funds > threshold && oyakata.traits.compassion > 60) {
      const stocks = stableSort(
        Object.values(world.myosekiMarket.stocks),
        (x: any) => x.id || String(x)
      );
      for (const stock of stocks) {
        if (
          stock.status === "available" &&
          stock.askingPrice &&
          stock.askingPrice < heya.funds - 200_000_000
        ) {
          // Welfare Hawk quirk only buys myoseki if it benefits the stable's welfare
          if (
            oyakata.quirks?.includes("Welfare Hawk") &&
            heya.welfareState?.complianceState !== "compliant"
          ) {
            continue; // Skip expansion if welfare is poor
          }
          buyMyoseki(world, oyakata.id, heya.id, stock.id);
          EventBus.managementDecision(
            world,
            heya.id,
            {
              archetype: oyakata.archetype,
              action: "buy_myoseki",
              stockId: stock.id,
              price: stock.askingPrice,
              reasoning: "Nurturer purchased myoseki for rikishi welfare",
            },
            "minor"
          );
          break;
        }
      }
    }
  },
};

export const TyrantFinanceStrategy: FinanceStrategy = {
  evaluateFinances(world, heya, oyakata) {
    if (!world.myosekiMarket) return;

    // Tyrants hoard cash for power, minimal facility investment
    // They rarely spend on myoseki unless it's for power
    const threshold = 1_000_000_000; // Extremely high threshold
    if (heya.funds > threshold) {
      const stocks = stableSort(
        Object.values(world.myosekiMarket.stocks),
        (x: any) => x.id || String(x)
      );
      for (const stock of stocks) {
        if (
          stock.status === "available" &&
          stock.askingPrice &&
          stock.askingPrice < heya.funds - 300_000_000
        ) {
          buyMyoseki(world, oyakata.id, heya.id, stock.id);
          EventBus.managementDecision(
            world,
            heya.id,
            {
              archetype: oyakata.archetype,
              action: "buy_myoseki",
              stockId: stock.id,
              price: stock.askingPrice,
              reasoning: "Tyrant purchased myoseki for power",
            },
            "minor"
          );
          break;
        }
      }
    }
  },
};

export const StrategistFinanceStrategy: FinanceStrategy = {
  evaluateFinances(world, heya, oyakata) {
    if (!world.myosekiMarket) return;

    // Strategists make balanced spending with timing-based market moves
    // They calculate optimal purchase timing
    const threshold = 400_000_000;
    if (heya.funds > threshold && oyakata.traits.ambition > 50) {
      const stocks = stableSort(
        Object.values(world.myosekiMarket.stocks),
        (x: any) => x.id || String(x)
      );
      for (const stock of stocks) {
        if (
          stock.status === "available" &&
          stock.askingPrice &&
          stock.askingPrice < heya.funds - 150_000_000
        ) {
          buyMyoseki(world, oyakata.id, heya.id, stock.id);
          EventBus.managementDecision(
            world,
            heya.id,
            {
              archetype: oyakata.archetype,
              action: "buy_myoseki",
              stockId: stock.id,
              price: stock.askingPrice,
              reasoning: "Strategist purchased myoseki for optimal timing",
            },
            "minor"
          );
          break;
        }
      }
    }
  },
};

export const StrictFinanceStrategy: FinanceStrategy = {
  evaluateFinances(world, heya, oyakata) {
    if (!world.myosekiMarket) return;

    // Strict avoid debt and use traditional investment patterns
    // They're conservative but follow traditional approaches
    const threshold = 550_000_000;
    if (heya.funds > threshold && oyakata.traits.tradition > 50) {
      const stocks = stableSort(
        Object.values(world.myosekiMarket.stocks),
        (x: any) => x.id || String(x)
      );
      for (const stock of stocks) {
        if (
          stock.status === "available" &&
          stock.askingPrice &&
          stock.askingPrice < heya.funds - 180_000_000
        ) {
          buyMyoseki(world, oyakata.id, heya.id, stock.id);
          EventBus.managementDecision(
            world,
            heya.id,
            {
              archetype: oyakata.archetype,
              action: "buy_myoseki",
              stockId: stock.id,
              price: stock.askingPrice,
              reasoning: "Strict purchased myoseki following traditional patterns",
            },
            "minor"
          );
          break;
        }
      }
    }
  },
};

export const IndulgentFinanceStrategy: FinanceStrategy = {
  evaluateFinances(world, heya, oyakata) {
    if (!world.myosekiMarket) return;

    // Indulgent are generous with rikishi expenses, less concerned with efficiency
    // They spend moderately on myoseki
    const threshold = 450_000_000;
    if (heya.funds > threshold && oyakata.traits.ambition > 40) {
      const stocks = stableSort(
        Object.values(world.myosekiMarket.stocks),
        (x: any) => x.id || String(x)
      );
      for (const stock of stocks) {
        if (
          stock.status === "available" &&
          stock.askingPrice &&
          stock.askingPrice < heya.funds - 160_000_000
        ) {
          buyMyoseki(world, oyakata.id, heya.id, stock.id);
          EventBus.managementDecision(
            world,
            heya.id,
            {
              archetype: oyakata.archetype,
              action: "buy_myoseki",
              stockId: stock.id,
              price: stock.askingPrice,
              reasoning: "Indulgent purchased myoseki generously",
            },
            "minor"
          );
          break;
        }
      }
    }
  },
};

export function getFinanceStrategy(archetype: OyakataArchetype): FinanceStrategy {
  switch (archetype) {
    case "traditionalist":
      return TraditionalistFinanceStrategy;
    case "scientist":
      return ScientistFinanceStrategy;
    case "gambler":
      return GamblerFinanceStrategy;
    case "nurturer":
      return NurturerFinanceStrategy;
    case "tyrant":
      return TyrantFinanceStrategy;
    case "strategist":
      return StrategistFinanceStrategy;
    case "strict":
      return StrictFinanceStrategy;
    case "indulgent":
      return IndulgentFinanceStrategy;
    default:
      return DefaultFinanceStrategy;
  }
}
