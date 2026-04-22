// @ts-nocheck
import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { Oyakata } from "./types/oyakata";
import type { OyakataArchetype } from "./types/oyakata";
import { EventBus } from "./events";
import { checkRetirement } from "./lifecycle";
import type { Rikishi } from "./types/rikishi";

interface RetirementStrategy {
  evaluateRetirements: (world: WorldState, heya: Heya, oyakata: Oyakata) => void;
}

function evaluateRetirementsBase(
  world: WorldState,
  heya: Heya,
  checkFn: (r: Rikishi, retireReason: string | undefined) => string | false
) {
  const currentRikishiIds = [...(heya.rikishiIds || [])];
  for (const rId of currentRikishiIds) {
    const r = world.rikishi.get(rId);
    if (!r) continue;
    const baseReason = getBaseRetireReason(world, r);
    const finalReason = checkFn(r, baseReason);
    if (finalReason) {
      executeRetirement(world, heya, r, finalReason);
    }
  }
}

function executeRetirement(world: WorldState, heya: Heya, r: Rikishi, reason: string) {
  EventBus.lifecycleEvent(world, {
    rikishiId: r.id,
    heyaId: heya.id,
    shikona: r.shikona || r.name || r.id,
    status: "retirement",
    reason,
  });
  heya.rikishiIds = (heya.rikishiIds ?? []).filter((id) => id !== r.id);
  world.rikishi.delete(r.id);
}

function getBaseRetireReason(world: WorldState, r: Rikishi): string | undefined {
  return checkRetirement(r, world.calendar?.year ?? world.year ?? 2026, world.seed);
}

export const DefaultRetirementStrategy: RetirementStrategy = {
  evaluateRetirements(world: WorldState, heya: Heya, _oyakata: Oyakata) {
    evaluateRetirementsBase(world, heya, (r, retireReason) => retireReason || false);
  },
};

export const TraditionalistRetirementStrategy: RetirementStrategy = {
  evaluateRetirements(world, heya, _oyakata) {
    evaluateRetirementsBase(world, heya, (r, retireReason) => {
      const age = (world.calendar?.year ?? world.year ?? 2026) - r.birthYear;
      const isOldEnough = age >= 35;
      if (retireReason || (isOldEnough && r.rank && r.rank.startsWith("maegashira"))) {
        return retireReason || "Honorable retirement due to age";
      }
      return false;
    });
  },
};

export const ScientistRetirementStrategy: RetirementStrategy = {
  evaluateRetirements(world, heya, _oyakata) {
    evaluateRetirementsBase(world, heya, (r, retireReason) => retireReason || false);
  },
};

export const GamblerRetirementStrategy: RetirementStrategy = {
  evaluateRetirements(world, heya, oyakata) {
    evaluateRetirementsBase(world, heya, (r, retireReason) => {
      if (retireReason || (oyakata.traits.risk > 60 && r.stats && (r.stats as any).strength < 30)) {
        return retireReason || "Cut due to poor performance";
      }
      return false;
    });
  },
};

export const NurturerRetirementStrategy: RetirementStrategy = {
  evaluateRetirements(world, heya, _oyakata) {
    evaluateRetirementsBase(world, heya, (r, retireReason) => {
      const age = (world.calendar?.year ?? world.year ?? 2026) - r.birthYear;
      const isVeryOld = age >= 40;
      if (retireReason || isVeryOld) {
        return retireReason || "Retired after long career with care";
      }
      return false;
    });
  },
};

export const TyrantRetirementStrategy: RetirementStrategy = {
  evaluateRetirements(world, heya, _oyakata) {
    evaluateRetirementsBase(world, heya, (r, retireReason) => {
      const isUnderperforming = r.stats && (r.stats as any).strength < 25;
      const isLowRank = r.rank && (r.rank.startsWith("maegashira") || r.rank.startsWith("juryo"));
      if (retireReason || (isUnderperforming && isLowRank)) {
        return retireReason || "Forced out by tyrant master";
      }
      return false;
    });
  },
};

export const StrategistRetirementStrategy: RetirementStrategy = {
  evaluateRetirements(world, heya, _oyakata) {
    evaluateRetirementsBase(world, heya, (r, retireReason) => retireReason || false);
  },
};

export const StrictRetirementStrategy: RetirementStrategy = {
  evaluateRetirements(world, heya, _oyakata) {
    evaluateRetirementsBase(world, heya, (r, retireReason) => {
      if (
        retireReason ||
        (r.stats && (r.stats as any).strength < 30 && r.rank && r.rank.startsWith("juryo"))
      ) {
        return retireReason || "Cut due to poor performance";
      }
      return false;
    });
  },
};

export const IndulgentRetirementStrategy: RetirementStrategy = {
  evaluateRetirements(world, heya, _oyakata) {
    evaluateRetirementsBase(world, heya, (r, retireReason) => retireReason || false);
  },
};
export function getRetirementStrategy(archetype: OyakataArchetype): RetirementStrategy {
  switch (archetype) {
    case "traditionalist":
      return TraditionalistRetirementStrategy;
    case "scientist":
      return ScientistRetirementStrategy;
    case "gambler":
      return GamblerRetirementStrategy;
    case "nurturer":
      return NurturerRetirementStrategy;
    case "tyrant":
      return TyrantRetirementStrategy;
    case "strategist":
      return StrategistRetirementStrategy;
    case "strict":
      return StrictRetirementStrategy;
    case "indulgent":
      return IndulgentRetirementStrategy;
    default:
      return DefaultRetirementStrategy;
  }
}