/**
 * MemoryStore.ts
 * ============
 * Immutable helpers for reading, initializing, and updating OyakataMemory.
 * All operations return a new memory object; callers are responsible for
 * applying the change via ImpactBuilder.
 */

import type { Oyakata } from "../types/oyakata";
import type { Id } from "../types/common";
import type {
  AIPlan,
  OpponentTacticModel,
  OyakataMemory,
  OyakataObservation,
} from "../ai/types";

export { type OyakataMemory } from "../ai/types";

/**
 * Build an empty memory object for a freshly generated oyakata.
 * Safe to call when memory is undefined.
 */
export function emptyOyakataMemory(oyakata: Oyakata, currentTick = 0): OyakataMemory {
  return {
    observations: [],
    coreDirectives: [
      `Maintain the excellence of stable`,
      `Prioritize ${oyakata.archetype} values`,
    ],
    lastConsolidationTick: currentTick,
    planHistory: [],
    decisionHistory: [],
    opponentModels: {},
  };
}

/** Return the current memory, initializing it if absent and normalizing
 *  any missing nested arrays/maps so downstream helpers can assume full shape. */
export function getMemory(oyakata: Oyakata, currentTick = 0): OyakataMemory {
  if (!oyakata.memory) {
    return emptyOyakataMemory(oyakata, currentTick);
  }
  const base = emptyOyakataMemory(oyakata, currentTick);
  return {
    ...base,
    ...oyakata.memory,
    observations: [...oyakata.memory.observations],
    coreDirectives: [...(oyakata.memory.coreDirectives ?? base.coreDirectives)],
    planHistory: [...(oyakata.memory.planHistory ?? base.planHistory)],
    decisionHistory: [...(oyakata.memory.decisionHistory ?? base.decisionHistory)],
    opponentModels: { ...(oyakata.memory.opponentModels ?? base.opponentModels) },
  };
}

/** Record a new observation, keeping the most important recent 10. */
export function addObservation(
  memory: OyakataMemory,
  observation: Omit<OyakataObservation, "tick">,
  tick: number
): OyakataMemory {
  const next = {
    ...memory,
    observations: [...(memory.observations ?? []), { ...observation, tick }],
  };
  if (next.observations.length > 10) {
    next.observations = next.observations
      .slice()
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 10);
  }
  return next;
}

/** Store an active plan and archive any previous plan. */
export function setActivePlan(
  memory: OyakataMemory,
  plan: AIPlan,
  currentWeek: number
): OyakataMemory {
  const next = { ...memory, activePlan: plan };
  if (memory.activePlan && memory.activePlan.planId !== plan.planId) {
    next.planHistory = [
      ...(memory.planHistory ?? []),
      {
        planId: memory.activePlan.planId,
        startedWeek: memory.activePlan.startedWeek,
        endedWeek: currentWeek,
        outcome: "abandoned",
        summary: `Replaced by ${plan.planId}`,
      },
    ];
  }
  return next;
}

/** Mark the current plan as complete/partial and archive it. */
export function archiveActivePlan(
  memory: OyakataMemory,
  outcome: "success" | "partial" | "abandoned",
  summary: string,
  currentWeek: number
): OyakataMemory {
  if (!memory.activePlan) return memory;
  const next = { ...memory, activePlan: undefined };
  next.planHistory = [
    ...(memory.planHistory ?? []),
    {
      planId: memory.activePlan.planId,
      startedWeek: memory.activePlan.startedWeek,
      endedWeek: currentWeek,
      outcome,
      summary,
    },
  ];
  return next;
}

/** Append a weekly decision summary to the decision history. */
export function recordDecision(
  memory: OyakataMemory,
  year: number,
  week: number,
  summary: string,
  planId?: string
): OyakataMemory {
  return {
    ...memory,
    decisionHistory: [...(memory.decisionHistory ?? []), { year, week, summary, planId }].slice(-52),
  };
}

/** Store or update a learned opponent tactic model. */
export function recordOpponentModel(
  memory: OyakataMemory,
  model: OpponentTacticModel
): OyakataMemory {
  return {
    ...memory,
    opponentModels: { ...(memory.opponentModels ?? {}), [model.rikishiId]: model },
  };
}

/** Retrieve a model for a specific opponent, returning undefined if absent. */
export function getOpponentModel(
  memory: OyakataMemory,
  rikishiId: Id
): OpponentTacticModel | undefined {
  return memory.opponentModels?.[rikishiId];
}
