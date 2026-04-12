import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { Oyakata } from "./types/oyakata";
import type { OyakataArchetype } from "./types/oyakata";
import { EventBus } from "./events";
import { checkRetirement } from "./lifecycle";

interface RetirementStrategy {
  evaluateRetirements: (world: WorldState, heya: Heya, oyakata: Oyakata) => void;
}

export const DefaultRetirementStrategy: RetirementStrategy = {
  evaluateRetirements(world: WorldState, heya: Heya, oyakata: Oyakata) {
    const currentRikishiIds = [...(heya.rikishiIds || [])];

    for (const rId of currentRikishiIds) {
      const r = world.rikishi.get(rId);
      if (!r) continue;

      // checkRetirement will check injury/age thresholds.
      const retireReason = checkRetirement(
        r,
        world.calendar?.year ?? world.year ?? 2026,
        world.seed
      );

      if (retireReason) {
        // Emit retirement event
        EventBus.lifecycleEvent(world, {
          rikishiId: r.id,
          heyaId: heya.id,
          shikona: r.shikona || r.name || r.id,
          status: "retirement",
          reason: retireReason,
        });

        // Remove from heya
        heya.rikishiIds = (heya.rikishiIds ?? []).filter((id) => id !== r.id);

        // Remove from global active map
        world.rikishi.delete(r.id);
      }
    }
  },
};

export const TraditionalistRetirementStrategy: RetirementStrategy = {
  evaluateRetirements(world, heya, oyakata) {
    const currentRikishiIds = [...(heya.rikishiIds || [])];

    for (const rId of currentRikishiIds) {
      const r = world.rikishi.get(rId);
      if (!r) continue;

      // Traditionalists respect age and tradition, allow rikishi to retire naturally
      const retireReason = checkRetirement(
        r,
        world.calendar?.year ?? world.year ?? 2026,
        world.seed
      );

      // Traditionalists are more lenient with retirement thresholds
      const age = (world.calendar?.year ?? world.year ?? 2026) - r.birthYear;
      const isOldEnough = age >= 35; // Higher age threshold for traditionalists

      if (retireReason || (isOldEnough && r.rank && r.rank.startsWith("maegashira"))) {
        EventBus.lifecycleEvent(world, {
          rikishiId: r.id,
          heyaId: heya.id,
          shikona: r.shikona || r.name || r.id,
          status: "retirement",
          reason: retireReason || "Honorable retirement due to age",
        });

        heya.rikishiIds = (heya.rikishiIds ?? []).filter((id) => id !== r.id);
        world.rikishi.delete(r.id);
      }
    }
  },
};

export const ScientistRetirementStrategy: RetirementStrategy = {
  evaluateRetirements(world, heya, oyakata) {
    const currentRikishiIds = [...(heya.rikishiIds || [])];

    for (const rId of currentRikishiIds) {
      const r = world.rikishi.get(rId);
      if (!r) continue;

      const retireReason = checkRetirement(
        r,
        world.calendar?.year ?? world.year ?? 2026,
        world.seed
      );

      // Scientists cut rikishi when stats decline significantly
      if (retireReason) {
        EventBus.lifecycleEvent(world, {
          rikishiId: r.id,
          heyaId: heya.id,
          shikona: r.shikona || r.name || r.id,
          status: "retirement",
          reason: retireReason,
        });

        heya.rikishiIds = (heya.rikishiIds ?? []).filter((id) => id !== r.id);
        world.rikishi.delete(r.id);
      }
    }
  },
};

export const GamblerRetirementStrategy: RetirementStrategy = {
  evaluateRetirements(world, heya, oyakata) {
    const currentRikishiIds = [...(heya.rikishiIds || [])];

    for (const rId of currentRikishiIds) {
      const r = world.rikishi.get(rId);
      if (!r) continue;

      const retireReason = checkRetirement(
        r,
        world.calendar?.year ?? world.year ?? 2026,
        world.seed
      );

      // Gamblers cut quickly when performance drops
      if (retireReason || (oyakata.traits.risk > 60 && r.stats && (r.stats as any).strength < 30)) {
        EventBus.lifecycleEvent(world, {
          rikishiId: r.id,
          heyaId: heya.id,
          shikona: r.shikona || r.name || r.id,
          status: "retirement",
          reason: retireReason || "Cut due to poor performance",
        });

        heya.rikishiIds = (heya.rikishiIds ?? []).filter((id) => id !== r.id);
        world.rikishi.delete(r.id);
      }
    }
  },
};

export const NurturerRetirementStrategy: RetirementStrategy = {
  evaluateRetirements(world, heya, oyakata) {
    const currentRikishiIds = [...(heya.rikishiIds || [])];

    for (const rId of currentRikishiIds) {
      const r = world.rikishi.get(rId);
      if (!r) continue;

      const retireReason = checkRetirement(
        r,
        world.calendar?.year ?? world.year ?? 2026,
        world.seed
      );

      // Nurturers are protective, only retire when absolutely necessary
      const age = (world.calendar?.year ?? world.year ?? 2026) - r.birthYear;
      const isVeryOld = age >= 40; // Very high age threshold

      if (retireReason || isVeryOld) {
        EventBus.lifecycleEvent(world, {
          rikishiId: r.id,
          heyaId: heya.id,
          shikona: r.shikona || r.name || r.id,
          status: "retirement",
          reason: retireReason || "Retired after long career with care",
        });

        heya.rikishiIds = (heya.rikishiIds ?? []).filter((id) => id !== r.id);
        world.rikishi.delete(r.id);
      }
    }
  },
};

export const TyrantRetirementStrategy: RetirementStrategy = {
  evaluateRetirements(world, heya, oyakata) {
    const currentRikishiIds = [...(heya.rikishiIds || [])];

    for (const rId of currentRikishiIds) {
      const r = world.rikishi.get(rId);
      if (!r) continue;

      const retireReason = checkRetirement(
        r,
        world.calendar?.year ?? world.year ?? 2026,
        world.seed
      );

      // Tyrants force retirement aggressively for underperformers
      const isUnderperforming = r.stats && (r.stats as any).strength < 25;
      const isLowRank = r.rank && (r.rank.startsWith("maegashira") || r.rank.startsWith("juryo"));

      if (retireReason || (isUnderperforming && isLowRank)) {
        EventBus.lifecycleEvent(world, {
          rikishiId: r.id,
          heyaId: heya.id,
          shikona: r.shikona || r.name || r.id,
          status: "retirement",
          reason: retireReason || "Forced out by tyrant master",
        });

        heya.rikishiIds = (heya.rikishiIds ?? []).filter((id) => id !== r.id);
        world.rikishi.delete(r.id);
      }
    }
  },
};

export const StrategistRetirementStrategy: RetirementStrategy = {
  evaluateRetirements(world, heya, oyakata) {
    const currentRikishiIds = [...(heya.rikishiIds || [])];

    for (const rId of currentRikishiIds) {
      const r = world.rikishi.get(rId);
      if (!r) continue;

      const retireReason = checkRetirement(
        r,
        world.calendar?.year ?? world.year ?? 2026,
        world.seed
      );

      // Strategists cut based on cost-benefit analysis
      if (retireReason) {
        EventBus.lifecycleEvent(world, {
          rikishiId: r.id,
          heyaId: heya.id,
          shikona: r.shikona || r.name || r.id,
          status: "retirement",
          reason: retireReason,
        });

        heya.rikishiIds = (heya.rikishiIds ?? []).filter((id) => id !== r.id);
        world.rikishi.delete(r.id);
      }
    }
  },
};

export const StrictRetirementStrategy: RetirementStrategy = {
  evaluateRetirements(world, heya, oyakata) {
    const currentRikishiIds = [...(heya.rikishiIds || [])];

    for (const rId of currentRikishiIds) {
      const r = world.rikishi.get(rId);
      if (!r) continue;

      const retireReason = checkRetirement(
        r,
        world.calendar?.year ?? world.year ?? 2026,
        world.seed
      );

      // Strict maintain high standards, cut when discipline drops
      if (
        retireReason ||
        (oyakata.traits.tradition > 60 && r.temperament && r.temperament.discipline < 40)
      ) {
        EventBus.lifecycleEvent(world, {
          rikishiId: r.id,
          heyaId: heya.id,
          shikona: r.shikona || r.name || r.id,
          status: "retirement",
          reason: retireReason || "Cut due to lack of discipline",
        });

        heya.rikishiIds = (heya.rikishiIds ?? []).filter((id) => id !== r.id);
        world.rikishi.delete(r.id);
      }
    }
  },
};

export const IndulgentRetirementStrategy: RetirementStrategy = {
  evaluateRetirements(world, heya, oyakata) {
    const currentRikishiIds = [...(heya.rikishiIds || [])];

    for (const rId of currentRikishiIds) {
      const r = world.rikishi.get(rId);
      if (!r) continue;

      const retireReason = checkRetirement(
        r,
        world.calendar?.year ?? world.year ?? 2026,
        world.seed
      );

      // Indulgent are lenient, only retire when rikishi want to
      if (retireReason) {
        EventBus.lifecycleEvent(world, {
          rikishiId: r.id,
          heyaId: heya.id,
          shikona: r.shikona || r.name || r.id,
          status: "retirement",
          reason: retireReason,
        });

        heya.rikishiIds = (heya.rikishiIds ?? []).filter((id) => id !== r.id);
        world.rikishi.delete(r.id);
      }
    }
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
