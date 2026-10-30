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
import { tickScoutMissions } from "@/engine/recruitment/scoutMissions";
import { mergeImpacts } from "@/engine/core/ImpactResolver";

export function phase01_week_scouting(world: WorldState): StateImpact {
  const base = tickWeekScouting(world);
  const missions = tickScoutMissions(world);
  // Passthrough when nothing returned — keeps the phase's impact shape
  // identical to tickWeekScouting's on quiet weeks.
  const empty =
    !missions.worldFields &&
    !missions.entities &&
    !missions.collections &&
    !(missions.events?.length ?? 0);
  return empty ? base : mergeImpacts([base, missions]);
}
