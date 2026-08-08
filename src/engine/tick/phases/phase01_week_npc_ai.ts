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
import { buildLeaguePerception } from "../../npcAI/LeaguePerception";
import { createPlan, shouldReplan } from "../../npcAI/StrategicPlanner";
import { makeNPCWeeklyDecision } from "../../npcAI";
import { enforceHardCapRosterOverflow } from "../../overflow";
import { getMemory, setActivePlan, recordDecision } from "../../npcAI/MemoryStore";
import type { AIContext } from "../../ai/types";
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
import { SparringService } from "../../systems/training/SparringService";
import type { Rikishi } from "../../types/rikishi";
import type { SparringChemistry, SparringPair, SparringState } from "../../types/training";

export function phase01_week_npc_ai(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase01_week_npc_ai");
  const scoutingMap: Record<Id, "none" | "passive" | "active" | "aggressive"> = {};
  const playerHeyaId = world.playerHeyaId;
  const leaguePerception = buildLeaguePerception(world);

  for (const heya of getAvailableStables(world)) {
    if (heya.id === playerHeyaId) continue;

    const perception = buildPerceptionSnapshot(world, heya.id);
    const oyakata = heya.oyakataId ? world.oyakata.get(heya.oyakataId) : undefined;

    if (oyakata) {
      // Lazily hydrate oyakata persona quirks/flags if not yet assigned
      const nextOya = { ...oyakata };
      const persona = ensurePersonaForOyakata(world, nextOya);
      nextOya.quirks = persona.quirks;
      nextOya.managerFlags = persona.managerFlags;
      nextOya.memory = consolidateOyakataMemoryPure(world, nextOya, perception);

      const aiCtx: AIContext = {
        world,
        heyaId: heya.id,
        oyakata: {
          id: nextOya.id,
          archetype: nextOya.archetype,
          traits: nextOya.traits,
          mood: nextOya.mood,
        },
        perception,
        leaguePerception,
        memory: nextOya.memory,
      };

      const activePlan = nextOya.memory?.activePlan;
      const needsReplan = shouldReplan(aiCtx, activePlan);
      let currentPlan = activePlan;
      if (needsReplan || !currentPlan) {
        const newPlan = createPlan(aiCtx);
        if (newPlan) {
          nextOya.memory = setActivePlan(nextOya.memory ?? getMemory(nextOya, world.week), newPlan, world.week);
          currentPlan = newPlan;
        }
      }

      const decision = makeNPCWeeklyDecision(world, heya.id, currentPlan);
      applyNPCDecisionPure(world, builder, decision);

      if (currentPlan) {
        nextOya.memory = recordDecision(
          nextOya.memory ?? getMemory(nextOya, world.week),
          world.year,
          world.week,
          `Plan ${currentPlan.planId}: intensity ${decision.trainingIntensity}, scouting ${decision.scoutingPriority}`,
          currentPlan.planId
        );
      }

      const newMood = processOyakataMood(nextOya, decision, heya.id, builder);
      nextOya.mood = newMood;
      scoutingMap[heya.id] = decision.scoutingPriority;
      collectManagementDecisionEvents(heya.id, decision, builder);
      collectStrategyShiftEvents(heya.id, decision, builder);

      // Handle media events for NPCs
      if (world.governanceLog) {
        const mediaStrat = getMediaStrategy(oyakata.archetype);
        for (const event of world.governanceLog) {
          if (event.heyaId === heya.id && !event.playerChoice) {
            builder.merge(mediaStrat.evaluateMediaEventResponse(world, heya, oyakata, event.id));
          }
        }
      }

      builder.updateOyakata(nextOya.id, nextOya);

      maybeAssignNPCMentors(world, heya, builder);
      maybeAssignNPCSparringPairs(world, heya, builder);
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

  const active: import("../../types/rikishi").Rikishi[] = [];
  const apprentices: import("../../types/rikishi").Rikishi[] = [];
  for (const r of members) {
    if (r.isRetired || r.injured) continue;
    active.push(r);
    if (!r.mentorId && !RANK_HIERARCHY[r.rank]?.isSekitori) {
      apprentices.push(r);
    }
  }

  if (apprentices.length === 0) return;

  const mentors = active;

  for (const apprentice of apprentices) {
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

const CHEMISTRY_SCORE: Record<SparringChemistry, number> = {
  friction: 3,
  neutral: 2,
  rut: 1,
};

/**
 * Auto-assign sparring pairs for non-player heya.
 * Scores each potential pair by chemistry + stat gap, then greedily pairs
 * highest-scoring candidates first.
 */
function maybeAssignNPCSparringPairs(
  world: WorldState,
  heya: Heya,
  builder: ReturnType<typeof createImpactBuilder>
): void {
  const members: Rikishi[] = [];
  for (const id of heya.rikishiIds ?? []) {
    const r = getRikishi(world, id);
    if (r) members.push(r);
  }

  // Gather already-paired ids
  const existingState = world.sparringPairs?.get(heya.id);
  const pairedIds = new Set<string>();
  if (existingState) {
    for (const key in existingState.pairs) {
      if (Object.prototype.hasOwnProperty.call(existingState.pairs, key)) {
        const pair = existingState.pairs[key];
        pairedIds.add(pair.aId);
        pairedIds.add(pair.bId);
      }
    }
  }

  // Single-pass filter: exclude retired, injured, and already-paired rikishi
  const eligible: Rikishi[] = [];
  for (const r of members) {
    if (r.isRetired || r.injured) continue;
    if (pairedIds.has(r.id)) continue;
    eligible.push(r);
  }
  if (eligible.length < 2) return;

  // Score all potential pairs
  const candidates: { a: Rikishi; b: Rikishi; score: number }[] = [];
  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      const a = eligible[i];
      const b = eligible[j];
      if (!SparringService.canSpar(a, b)) continue;
      const chemistry = SparringService.calculateChemistry(a, b);
      const chemScore = CHEMISTRY_SCORE[chemistry];
      const statGap = Math.abs(a.stats.power - b.stats.power);
      const statGapBonus = Math.min(3, Math.floor(statGap / 20));
      candidates.push({ a, b, score: chemScore + statGapBonus });
    }
  }

  candidates.sort((x, y) => y.score - x.score);

  const assignedIds = new Set<string>();
  const currentWeek = world.calendar?.currentWeek ?? 0;
  const newPairs: SparringPair[] = [];

  for (const { a, b } of candidates) {
    if (assignedIds.has(a.id) || assignedIds.has(b.id)) continue;
    const chemistry = SparringService.calculateChemistry(a, b);
    newPairs.push({
      key: SparringService.makePairKey(a.id, b.id),
      aId: a.id,
      bId: b.id,
      chemistry,
      weeksActive: 0,
      establishedWeek: currentWeek,
    });
    assignedIds.add(a.id);
    assignedIds.add(b.id);

    builder.logEvent(
      "LIFECYCLE_EVENT",
      "narrative",
      {
        heyaId: heya.id,
        aId: a.id,
        bId: b.id,
        status: "sparring_pair_assigned",
      },
      { heyaId: heya.id, rikishiId: a.id }
    );
  }

  if (newPairs.length > 0) {
    const baseState: SparringState = existingState
      ? { ...existingState, pairs: { ...existingState.pairs } }
      : { heyaId: heya.id, pairs: {} };
    for (const pair of newPairs) {
      baseState.pairs[pair.key] = pair;
    }
    const updatedMap = new Map(world.sparringPairs || []);
    updatedMap.set(heya.id, baseState);
    builder.updateWorldField("sparringPairs", updatedMap);
  }
}
