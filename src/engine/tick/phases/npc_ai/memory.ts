/**
 * memory.ts
 * =========
 * NPC AI memory consolidation helpers.
 * Extracted from phase01_week_npc_ai.ts for modularity.
 */

import type { WorldState } from "../../../types/world";
import type { Oyakata } from "../../../types/oyakata";
import type { PerceptionSnapshot } from "../../../perception";
import { getMemory, addObservation } from "../../../npcAI/MemoryStore";

export function consolidateOyakataMemoryPure(
  world: WorldState,
  oyakata: Oyakata,
  perception: PerceptionSnapshot
): NonNullable<Oyakata["memory"]> {
  const tick = world.week;
  let memory = getMemory(oyakata, tick);

  if (
    perception.moraleBand === "mutinous" &&
    oyakata.mood !== "furious" &&
    oyakata.mood !== "anxious"
  ) {
    memory = addObservation(
      memory,
      {
        type: "alignment",
        summary: `Unexpected morale collapse detected.`,
        importance: 8,
      },
      tick
    );
  }

  if (perception.runwayBand === "desperate" || perception.runwayBand === "critical") {
    memory = addObservation(
      memory,
      {
        type: "perception",
        summary: `Financial runway is ${perception.runwayBand}.`,
        importance: 10,
      },
      tick
    );
  }

  memory = { ...memory, lastConsolidationTick: tick };
  return memory;
}
