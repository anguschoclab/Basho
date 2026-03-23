import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { Oyakata } from "./types/oyakata";
import { EventBus } from "./events";
import { checkRetirement } from "./lifecycle";

export interface RetirementStrategy {
  evaluateRetirements: (world: WorldState, heya: Heya, oyakata: Oyakata) => void;
}

export const DefaultRetirementStrategy: RetirementStrategy = {
  evaluateRetirements(world: WorldState, heya: Heya, oyakata: Oyakata) {
    const currentRikishiIds = [...(heya.rikishiIds || [])];
    
    for (const rId of currentRikishiIds) {
      const r = world.rikishi.get(rId);
      if (!r) continue;

      // checkRetirement will check injury/age thresholds. 
      // We can pass oyakata compassion trait to give a slight modifier if checkRetirement supported it.
      let retireReason: string | null = null;
      
      const lib = require("./retirements");
      if (lib && lib.checkRetirement) {
         retireReason = lib.checkRetirement(r, world.calendar?.year ?? world.year ?? 2026, world.seed);
      }

      // Tyrant oyakata might force retirement earlier if underperforming
      if (!retireReason && oyakata.archetype === "tyrant" && r.stats && (r.stats as any).strength < 20) {
         // Custom artificial reason to simulate tyrant
         // retireReason = "Forced out by tyrant master";
      }

      if (retireReason) {
        // Emit retirement event
        EventBus.retirement(world, r.id, heya.id, r.shikona || r.name || r.id, retireReason);

        // Remove from heya
        heya.rikishiIds = heya.rikishiIds.filter(id => id !== r.id);

        // Remove from global active map
        world.rikishi.delete(r.id);
      }
    }
  }
};

export function getRetirementStrategy(archetype: string): RetirementStrategy {
   return DefaultRetirementStrategy;
}
