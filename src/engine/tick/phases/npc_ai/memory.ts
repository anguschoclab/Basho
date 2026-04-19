/**
 * memory.ts
 * =========
 * NPC AI memory consolidation helpers.
 * Extracted from phase01_week_npc_ai.ts for modularity.
 */

import type { WorldState } from "../../../types/world";
import type { Oyakata } from "../../../types/oyakata";
import type { PerceptionSnapshot } from "../../../perception";

interface OyakataObservation {
  tick: number;
  type: string;
  summary: string;
  importance: number;
}

export function consolidateOyakataMemoryPure(
  world: WorldState,
  oyakata: Oyakata,
  perception: PerceptionSnapshot
): void {
  if (!oyakata.memory) {
    oyakata.memory = {
      observations: [],
      coreDirectives: [
        `Maintain the excellence of stable`,
        `Prioritize ${oyakata.archetype} values`,
      ],
      lastConsolidationTick: world.week,
    };
  }

  const memory = { ...oyakata.memory };
  memory.observations = [...memory.observations];
  const tick = world.week;

  if (
    perception.moraleBand === "mutinous" &&
    oyakata.mood !== "furious" &&
    oyakata.mood !== "anxious"
  ) {
    memory.observations.push({
      tick,
      type: "alignment",
      summary: `Unexpected morale collapse detected.`,
      importance: 8,
    });
  }

  if (perception.runwayBand === "desperate" || perception.runwayBand === "critical") {
    memory.observations.push({
      tick,
      type: "perception",
      summary: `Financial runway is ${perception.runwayBand}.`,
      importance: 10,
    });
  }

  if (memory.observations.length > 10) {
    memory.observations.sort(
      (a: OyakataObservation, b: OyakataObservation) => b.importance - a.importance
    );
    memory.observations = memory.observations.slice(0, 10);
  }

  memory.lastConsolidationTick = tick;
  oyakata.memory = memory;
}
