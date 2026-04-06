/**
 * phase05_npcAI.ts
 * ================
 * Pipeline Phase 5 — Rival Stable NPC Strategic Decisions
 *
 * Delegates to the existing NPCStrategyService to make weekly decisions
 * for all non-player heyas: training intensity, focus, scouting priority, etc.
 *
 * This phase is intentionally thin — it is a controller, not a calculator.
 * All strategy logic lives in src/engine/strategy/NPCStrategyService.ts.
 *
 * Returns a structurally-shared clone; only NPC-heya training states change.
 */

import type { WorldState } from "../../types/world";
import * as npcAI from "../../npcAI";

// ── Phase ─────────────────────────────────────────────────────────────────────

export function phase05_npcAI(world: WorldState): WorldState {
  // tickWeekNPC mutates world in place — we received a clone from pipelineRunner
  // so mutation here is safe (the clone IS our "next world")
  npcAI.tickWeekNPC?.(world);
  return world;
}
