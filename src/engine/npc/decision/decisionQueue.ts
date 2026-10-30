/**
 * decisionQueue.ts
 * ================
 * Shared pendingDecisions queue policy — the soft cap that keeps the
 * interactive decision surface bounded when several producers (loop
 * decisions, event chains, koenkai demands) compete in the same week.
 */

import type { LoopDecision } from "@/engine/npc/decision/LoopDecisionEngine";

/**
 * Max pending non-required decisions in the queue. Required (blocking)
 * decisions always enqueue — they gate advance and must never be dropped.
 */
export const PENDING_DECISION_SOFT_CAP = 8;

/**
 * Merge incoming decisions into the queue honoring the soft cap.
 * Non-required decisions beyond the cap are dropped; their producers either
 * re-emit them next tick or they expire via QUEUE_DEFAULTS.
 */
export function enqueueDecisions(
  existing: LoopDecision[],
  incoming: LoopDecision[]
): LoopDecision[] {
  const merged = [...existing];
  for (const d of incoming) {
    if (!d.required && merged.length >= PENDING_DECISION_SOFT_CAP) continue;
    merged.push(d);
  }
  return merged;
}
