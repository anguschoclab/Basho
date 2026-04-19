/**
 * phase01_week_npc_ai.ts
 * =======================
 * Pipeline Phase: NPC Management AI.
 *
 * Responsibilities:
 * 1. Build perception snapshots for all NPC stables.
 * 2. Consolidate oyakata memory.
 * 3. Run decision workers (Training, Scouting, Personnel).
 * 4. Apply management decisions purely to the world state.
 */

import type { WorldState } from "../../types/world";
import type { Id } from "../../types/common";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { getAvailableStables } from "../../selectors";
import { buildPerceptionSnapshot } from "../../perception";
import { makeNPCWeeklyDecision } from "../../npcAI";
import { enforceHardCapRosterOverflow } from "../../overflow";
import { getMediaStrategy } from "../../npcMediaStrategy";
import {
  processOyakataMood,
  consolidateOyakataMemoryPure,
  applyNPCDecisionPure,
  collectManagementDecisionEvents,
  collectStrategyShiftEvents,
} from "./npc_ai";

export function phase01_week_npc_ai(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase01_week_npc_ai");
  const scoutingMap: Record<Id, "none" | "passive" | "active" | "aggressive"> = {};
  const playerHeyaId = world.playerHeyaId;

  for (const heya of getAvailableStables(world)) {
    if (heya.id === playerHeyaId) continue;

    const perception = buildPerceptionSnapshot(world, heya.id);
    const oyakata = heya.oyakataId ? world.oyakata.get(heya.oyakataId) : undefined;

    if (oyakata) {
      const nextOya = { ...oyakata };
      consolidateOyakataMemoryPure(world, nextOya, perception);

      const decision = makeNPCWeeklyDecision(world, heya.id);
      // Note: applyNPCDecisionPure mutates world.trainingState
      applyNPCDecisionPure(world, world.trainingState || new Map(), decision);

      processOyakataMood(nextOya, decision, heya.id, builder);
      scoutingMap[heya.id] = decision.scoutingPriority;
      collectManagementDecisionEvents(heya.id, decision, builder);
      collectStrategyShiftEvents(heya.id, decision, builder);

      // Handle media events for NPCs
      if (world.governanceLog) {
        const mediaEvents = world.governanceLog.filter(
          (r) => r.heyaId === heya.id && !r.playerChoice
        );
        const mediaStrat = getMediaStrategy(oyakata.archetype);
        for (const event of mediaEvents) {
          mediaStrat.evaluateMediaEventResponse(world, heya, oyakata, event.id);
        }
      }

      // Note: oyakata updates are not directly supported by ImpactBuilder yet
      world.oyakata = world.oyakata || new Map();
      world.oyakata.set(nextOya.id, nextOya);
    }
  }

  // Note: trainingState updates are not directly supported by ImpactBuilder yet
  world.npcScoutingPriorities = scoutingMap;

  enforceHardCapRosterOverflow(world);

  return builder.build();
}
