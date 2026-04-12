import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { Oyakata } from "./types/oyakata";
import type { OyakataArchetype } from "./types/oyakata";
import { stableSort } from "./utils/sort";
import { buyMyoseki } from "./myosekiMarket";
import { buyAvailableMyoseki } from "./utils/strategy";

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
      buyAvailableMyoseki(world, heya, oyakata, 100_000_000);
    }
  },
};

export const TraditionalistFinanceStrategy: FinanceStrategy = {
  evaluateFinances(world, heya, oyakata) {
    if (!world.myosekiMarket) return;

    // Traditionalists are conservative, prefer facility investment over myoseki
    // They only buy myoseki when they have significant funds and high tradition
    const threshold = 600_000_000; // Higher threshold for traditionalists
    if (heya.funds > threshold && oyakata.traits.tradition > 60) {
      buyAvailableMyoseki(world, heya, oyakata, 200_000_000);
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
      buyAvailableMyoseki(world, heya, oyakata, 100_000_000);
    }
  },
};

export const GamblerFinanceStrategy: FinanceStrategy = {
  evaluateFinances(world, heya, oyakata) {
    if (!world.myosekiMarket) return;

    // Gamblers take aggressive financial risks
    // They'll spend more of their funds on myoseki
    const threshold = 200_000_000; // Lower threshold - they take risks
    if (heya.funds > threshold && oyakata.traits.risk > 60) {
      buyAvailableMyoseki(world, heya, oyakata, 50_000_000);
    }
  },
};

export const NurturerFinanceStrategy: FinanceStrategy = {
  evaluateFinances(world, heya, oyakata) {
    if (!world.myosekiMarket) return;

    // Nurturers spend on recovery facilities and keep larger cash reserves for rikishi welfare
    // They're cautious with myoseki spending
    const threshold = 700_000_000; // Very high threshold - they prioritize welfare
    if (heya.funds > threshold && oyakata.traits.compassion > 70) {
      buyAvailableMyoseki(world, heya, oyakata, 300_000_000);
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
      buyAvailableMyoseki(world, heya, oyakata, 400_000_000);
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
      buyAvailableMyoseki(world, heya, oyakata, 150_000_000);
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
      buyAvailableMyoseki(world, heya, oyakata, 200_000_000);
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
      buyAvailableMyoseki(world, heya, oyakata, 150_000_000);
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
