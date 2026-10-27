/**
 * phase01_week_scouting.ts
 * ========================
 * Pipeline Phase: Weekly Scouting Tick.
 *
 * Responsibilities:
 * 1. Apply scouting decay to all stored scouting entries.
 * 2. Keep fog-of-war meaningful between observation windows.
 */

import type { WorldState } from "@/engine/types/world";
import type { StateImpact } from "@/engine/core/StateImpact";
import { tickWeekScouting } from "@/engine/recruitment/scoutingStore";

export function phase01_week_scouting(world: WorldState): StateImpact {
  return tickWeekScouting(world);
}
