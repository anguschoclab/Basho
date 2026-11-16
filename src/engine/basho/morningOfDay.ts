/**
 * morningOfDay.ts
 * ===============
 * Morning-of-day evaluation — the withdraw/compete gate for a newly
 * scheduled basho day. Runs inside `advanceBashoDay` immediately after
 * `ensureDaySchedule`, so BOTH paths see it:
 *
 * - Interactive: bashoSlice ADVANCE_DAY → advanceBashoDay → this. The
 *   batch phases (phase00_preflight / phase01_basho_npc_tactics) never
 *   run on the interactive path, so without this hook injured rikishi
 *   could be scheduled but never evaluated — the kyujo_decision and the
 *   NPC withdraw matrix would stay dead code.
 * - Batch: phase01_basho_bouts ends with advanceBashoDay → this. The next
 *   tick's own preflight/npc-tactics phases re-run the same evaluations
 *   idempotently (decisions dedupe by id; kyujo rikishi are skipped).
 *
 *   1. NPC: day-of kyujo calls via the shared withdraw/compete matrix
 *      (evaluateNpcMorningKyujo) — same logic phase01_basho_npc_tactics
 *      runs on the batch path.
 *   2. Player: kyujo_decisions surface through the canonical decision
 *      queue (evaluatePendingDecisions / autonomouslyResolveDecisions),
 *      blocking or policy-resolved exactly as preflight handles them.
 */

import type { WorldState } from "@/engine/types/world";
import type { StateImpact } from "@/engine/core/StateImpact";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { evaluateNpcMorningKyujo } from "@/engine/tick/phases/phase01_basho_npc_tactics";
import {
  evaluatePendingDecisions,
  autonomouslyResolveDecisions,
} from "@/engine/npc/decision/LoopDecisionEngine";

export function resolveMorningOfDay(world: WorldState): StateImpact {
  const builder = createImpactBuilder("resolveMorningOfDay");
  if (world.cyclePhase !== "active_basho" || !world.currentBasho) return builder.build();

  // NPC day-of withdraw/compete matrix + posture computation.
  evaluateNpcMorningKyujo(world, builder);

  // Player-side decision surfacing — kyujo_decision entries for injured
  // player rikishi on today's card. Autonomous runs apply policy defaults
  // (never leave a blocking decision pending).
  if (world._autonomousSim) {
    builder.merge(autonomouslyResolveDecisions(world, world._autonomousPolicy ?? "balanced"));
  } else {
    builder.merge(evaluatePendingDecisions(world));
  }

  return builder.build();
}
