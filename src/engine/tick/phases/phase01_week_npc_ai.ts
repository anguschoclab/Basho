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
import type { Heya } from "../../types/heya";
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
import { ensurePersonaForOyakata } from "../../systems/NPCPersonaService";
import { getRikishi } from "../../queries";
import { assignMentor } from "../../lineage";
import { MentorshipService } from "../../systems/training/MentorshipService";
import { RANK_HIERARCHY } from "../../types/banzuke";

export function phase01_week_npc_ai(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase01_week_npc_ai");
  const scoutingMap: Record<Id, "none" | "passive" | "active" | "aggressive"> = {};
  const playerHeyaId = world.playerHeyaId;

  for (const heya of getAvailableStables(world)) {
    if (heya.id === playerHeyaId) continue;

    const perception = buildPerceptionSnapshot(world, heya.id);
    const oyakata = heya.oyakataId ? world.oyakata.get(heya.oyakataId) : undefined;

    if (oyakata) {
      // Lazily hydrate oyakata persona quirks/flags if not yet assigned
      ensurePersonaForOyakata(world, oyakata);
      const nextOya = { ...oyakata };
      consolidateOyakataMemoryPure(world, nextOya, perception);

      const decision = makeNPCWeeklyDecision(world, heya.id);
      applyNPCDecisionPure(world, builder, decision);

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
          builder.merge(mediaStrat.evaluateMediaEventResponse(world, heya, oyakata, event.id));
        }
      }

      builder.updateOyakata(nextOya.id, nextOya);

      maybeAssignNPCMentors(world, heya, builder);
    }
  }

  builder.updateWorldField("npcScoutingPriorities", scoutingMap);

  builder.merge(enforceHardCapRosterOverflow(world));

  return builder.build();
}

/**
 * Auto-assign mentors for non-player heya.
 * Uses the same canonical eligibility and lineage path as the player UI.
 */
function maybeAssignNPCMentors(
  world: WorldState,
  heya: Heya,
  builder: ReturnType<typeof createImpactBuilder>
): void {
  const members: import("../../types/rikishi").Rikishi[] = [];
  for (const id of heya.rikishiIds ?? []) {
    const r = getRikishi(world, id);
    if (r) members.push(r);
  }

  const active = members.filter((r) => !r.isRetired && !r.injured);
  const apprentices = active.filter((r) => !r.mentorId && !RANK_HIERARCHY[r.rank]?.isSekitori);

  if (apprentices.length === 0) return;

  const mentors = active;

  for (const apprentice of apprentices) {
    // ⚡ Bolt Optimization: Replace chained .filter().sort() with a single loop
    // to avoid O(N) allocations and redundant O(N log N) sorting for finding the max value.
    let bestMentor = null;
    let maxTechnique = -Infinity;

    for (const m of mentors) {
      if (m.id !== apprentice.id && MentorshipService.canMentor(m, apprentice)) {
        if (m.stats.technique > maxTechnique) {
          maxTechnique = m.stats.technique;
          bestMentor = m;
        }
      }
    }

    if (!bestMentor) continue;

    const mentor = bestMentor;
    const result = assignMentor(world, apprentice.id, mentor.id);
    if (result.ok && result.impact) {
      builder.merge(result.impact);
      builder.logEvent(
        "LIFECYCLE_EVENT",
        "narrative",
        {
          rikishiId: apprentice.id,
          heyaId: heya.id,
          status: "mentor_assigned",
          mentorId: mentor.id,
        },
        { rikishiId: apprentice.id, heyaId: heya.id }
      );
    }
  }
}
