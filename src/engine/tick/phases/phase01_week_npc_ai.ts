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
import type { Oyakata } from "../../types/oyakata";
import type { MetaAdaptation } from "../../npcAI/ArchetypeAdaptation";
import type { NPCWeeklyDecision } from "../../npcAI/types";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { getAvailableStables } from "../../selectors";
import { buildPerceptionSnapshot } from "../../perception";
import { buildLeaguePerception } from "../../npcAI/LeaguePerception";
import { buildAIContext } from "../../npcAI/contextBuilder";
import { createPlan, shouldReplan } from "../../npcAI/StrategicPlanner";
import { makeNPCWeeklyDecision } from "../../npcAI";
import { enforceHardCapRosterOverflow } from "../../overflow";
import {
  getMemory,
  setActivePlan,
  archiveActivePlan,
  recordDecision,
} from "../../npcAI/MemoryStore";
import { evaluatePlanOutcome, planPrimaryMetricOrdinal } from "../../npcAI/planOutcomes";
import { evaluateAdaptation } from "../../npcAI/ArchetypeAdaptation";
import type { AIContext, AIPlan } from "../../ai/types";
import { handleNPCMediaEvent, resolveNPCCrisis } from "../../npcAI/handlers";
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
import {
  NPC_AI_ROTATION_DIVISOR,
  NPC_AI_ROTATION_MIN_FULL_SWEEP,
} from "../../../constants/engine/npcStrategy";
import { resolveNPCRequest, applyRequestOutcome } from "../../rikishiAgency/requests";
import type { RikishiRequest } from "../../rikishiAgency/types";
import { electFactionPostures } from "../../npcAI/factions";
import type { IchimonName, FactionPosture } from "../../types/economy";

/**
 * Selects which NPC heyas should make decisions this week.
 *
 * Full sweep (all heyas) when:
 * - cyclePhase is "active_basho" (NPCs always decide during basho)
 * - monthBoundary is pending (institutional correctness)
 * - NPC heya count is at or below NPC_AI_ROTATION_MIN_FULL_SWEEP
 *
 * Otherwise, rotates which 1/3 of heyas are skipped each week using
 * a deterministic round-robin keyed by world.week.
 */
function selectNPCHeyasForWeek(world: WorldState, npcHeyas: Heya[]): Heya[] {
  // Full sweep during active basho
  if (world.cyclePhase === "active_basho") return npcHeyas;

  // Full sweep on monthly boundary
  if (world.transientContext?.boundaries?.monthBoundary) return npcHeyas;

  // Full sweep for small heya counts
  if (npcHeyas.length <= NPC_AI_ROTATION_MIN_FULL_SWEEP) return npcHeyas;

  // Rotation: sort IDs deterministically, skip one third per week
  const sorted = [...npcHeyas].sort((a, b) => a.id.localeCompare(b.id));
  const skipGroup = (world.week ?? 0) % NPC_AI_ROTATION_DIVISOR;
  const groupSize = Math.floor(sorted.length / NPC_AI_ROTATION_DIVISOR);

  // Determine the skip range for this week's group
  const skipStart = skipGroup * groupSize;
  // The last group absorbs any remainder
  const skipEnd = skipGroup === NPC_AI_ROTATION_DIVISOR - 1 ? sorted.length : skipStart + groupSize;

  return sorted.filter((_, i) => i < skipStart || i >= skipEnd);
}

export function phase01_week_npc_ai(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase01_week_npc_ai");
  const scoutingMap: Record<Id, "none" | "passive" | "active" | "aggressive"> = {
    ...(world.npcScoutingPriorities || {}),
  };
  const playerHeyaId = world.playerHeyaId;
  const leaguePerception = buildLeaguePerception(world);

  const allNpcHeyas = getAvailableStables(world).filter((h) => h.id !== playerHeyaId);
  const heyasToProcess = selectNPCHeyasForWeek(world, allNpcHeyas);

  electAndPublishFactionPostures(world, leaguePerception, builder);

  // WS4 — pending rikishi requests awaiting NPC resolution this week.
  const agencyRequests = world.pendingRikishiRequests ?? [];
  const resolvedRequestIds = new Set<string>();

  const perceptionWrites: Record<Id, ReturnType<typeof buildPerceptionSnapshot>> = {};

  for (const heya of heyasToProcess) {
    const perception = buildPerceptionSnapshot(world, heya.id);
    perceptionWrites[heya.id] = perception;
    const oyakata = heya.oyakataId ? world.oyakata.get(heya.oyakataId) : undefined;

    if (oyakata) {
      // Lazily hydrate oyakata persona quirks/flags if not yet assigned
      const nextOya = { ...oyakata };
      const persona = ensurePersonaForOyakata(world, nextOya);
      nextOya.quirks = persona.quirks;
      nextOya.managerFlags = persona.managerFlags;
      nextOya.memory = consolidateOyakataMemoryPure(world, nextOya, perception);

      const aiCtx: AIContext = buildAIContext(
        world,
        heya.id,
        nextOya,
        leaguePerception,
        perception
      );

      const activePlan = nextOya.memory?.activePlan;
      const needsReplan = shouldReplan(aiCtx, activePlan);
      let currentPlan = activePlan;
      if (needsReplan || !currentPlan) {
        if (activePlan) {
          // Archive the outgoing plan with its measured outcome so future
          // plan scoring can learn from it (scoreWithMemory).
          const outcome = evaluatePlanOutcome(world, heya.id, activePlan);
          nextOya.memory = archiveActivePlan(
            nextOya.memory ?? getMemory(nextOya, world.week),
            outcome.outcome,
            outcome.summary,
            world.week
          );
          aiCtx.memory = nextOya.memory;
        }
        const newPlan = createPlan(aiCtx);
        if (newPlan) {
          nextOya.memory = setActivePlan(
            nextOya.memory ?? getMemory(nextOya, world.week),
            newPlan,
            world.week
          );
          currentPlan = newPlan;
          builder.logEvent(
            "STRATEGY_SHIFT",
            "ai_plan_change",
            {
              heyaId: heya.id,
              planId: newPlan.planId,
              previousPlanId: activePlan?.planId,
              reasoning: newPlan.reasoning.join(" | "),
            },
            { heyaId: heya.id, importance: "minor" }
          );
        }
      }

      const decision = makeNPCWeeklyDecision(world, heya.id, currentPlan);

      const adaptation = applyMetaAdaptation(world, heya, nextOya, decision);
      emitAdaptationCommit(heya.id, adaptation, builder);

      // WS4 — the oyakata answers pending rikishi requests by archetype
      // BEFORE the decision applies, so granted rest feeds the protect list.
      resolveAgencyRequests(
        world,
        heya,
        nextOya,
        decision,
        agencyRequests,
        resolvedRequestIds,
        builder
      );

      applyNPCDecisionPure(world, builder, decision);

      // The decision carries the agent-execution layer (myoseki purchases,
      // facility upgrades, scandal/favor actions, rivalry posture, academy/
      // staff investment, narrative events, npcBidPolicies, exhibition and
      // kyujo handling). Without this merge everything executeAgentDecisions
      // computed is silently discarded each week.
      builder.merge(decision.impact);

      overlayBidPolicyBias(world, heya.id, adaptation, decision, builder);

      foldExecutionCooldowns(world, nextOya, decision);

      applyPostDecisionBookkeeping(
        world,
        heya,
        nextOya,
        currentPlan,
        decision,
        scoutingMap,
        builder
      );

      builder.updateOyakata(nextOya.id, nextOya);

      maybeAssignNPCMentors(world, heya, builder);
      maybeAssignNPCSparringPairs(world, heya, builder);
    }
  }

  if (resolvedRequestIds.size > 0) {
    builder.updateWorldField(
      "pendingRikishiRequests",
      agencyRequests.filter((q) => !resolvedRequestIds.has(q.id))
    );
  }

  // Populate the declared-but-never-written perception cache so downstream
  // reads (getCachedPerception, buildFinanciallyFragileHeyas) hit real data.
  builder.updateWorldField("perceptionCache", {
    ...world.perceptionCache,
    ...perceptionWrites,
  });

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
  for (const id of [...new Set(heya.rikishiIds ?? [])]) {
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
  for (const id of [...new Set(heya.rikishiIds ?? [])]) {
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

/**
 * WS2 — Meta-drift adaptation (canon §§8–11). Lag-gated posture
 * commits drive real levers: recovery emphasis, scouting urgency, and
 * recruitment family bias. State persists on oyakata.memory.
 */
function applyMetaAdaptation(
  world: WorldState,
  heya: Heya,
  nextOya: Oyakata,
  decision: NPCWeeklyDecision
): MetaAdaptation {
  const { state: metaAdaptState, adaptation } = evaluateAdaptation(world, heya.id);
  if (adaptation.reasoning.length) decision.reasoning.push(...adaptation.reasoning);
  if (adaptation.recoveryOverride) {
    decision.recovery = adaptation.recoveryOverride;
  }
  if (adaptation.scoutingBoost && decision.scoutingPriority !== "aggressive") {
    const ladder = ["none", "passive", "active", "aggressive"] as const;
    const idx = ladder.indexOf(decision.scoutingPriority);
    decision.scoutingPriority = ladder[Math.min(idx + 1, ladder.length - 1)];
  }
  nextOya.memory = {
    ...(nextOya.memory ?? getMemory(nextOya, world.week)),
    metaAdaptation: metaAdaptState,
  };
  return adaptation;
}

/**
 * WS7 — surface adaptation commits so the NPC feed can show rival
 * managers reacting to meta drift (canon §§8–11 surfacing contract).
 */
function emitAdaptationCommit(
  heyaId: Id,
  adaptation: MetaAdaptation,
  builder: ReturnType<typeof createImpactBuilder>
): void {
  if (adaptation.posture === "none" && !adaptation.recoveryOverride) return;
  builder.logEvent(
    "NPC_MANAGER_DECISION",
    "ai_decision",
    {
      heyaId,
      category: "meta",
      domain: "meta_adaptation",
      decision:
        adaptation.posture === "counter_meta"
          ? `Counter-meta posture vs ${String(adaptation.bidFamilyBias?.family ?? "meta")}`
          : adaptation.posture === "embrace_meta"
            ? `Embracing the ${String(adaptation.bidFamilyBias?.family ?? "dominant")} meta`
            : "Elevated recovery focus in a punishing era",
      executed: true,
    },
    { heyaId, importance: "minor" }
  );
}

/**
 * WS5 — ichimon posture election: league-wide, heya-independent, so it runs
 * every week regardless of NPC rotation. Emits a canonical event only on
 * an actual posture change (no weekly spam).
 */
function electAndPublishFactionPostures(
  world: WorldState,
  leaguePerception: ReturnType<typeof buildLeaguePerception>,
  builder: ReturnType<typeof createImpactBuilder>
): void {
  const elected = electFactionPostures(world, leaguePerception);
  const prevPostures = world.factionPostures ?? {};
  for (const [ichimon, fp] of Object.entries(elected) as [IchimonName, FactionPosture][]) {
    if (prevPostures[ichimon]?.posture === fp.posture) continue;
    builder.logEvent(
      "GOVERNANCE_RULING",
      "discipline",
      {
        incident: "faction_posture",
        faction: ichimon,
        posture: fp.posture,
        targetHeyaId: fp.targetHeyaId,
        reason: `The ${ichimon} ichimon shifts to a ${fp.posture} posture.`,
      },
      { importance: "minor" }
    );
  }
  if (Object.keys(elected).length > 0) {
    builder.updateWorldField("factionPostures", elected);
  }
}

/**
 * Overlay the meta-adaptation family bias onto the heya's standing bid
 * policy. worldFields is last-write-wins, so this runs after the merge;
 * the bias is cleared when the posture lapses.
 */
function overlayBidPolicyBias(
  world: WorldState,
  heyaId: Id,
  adaptation: MetaAdaptation,
  decision: NPCWeeklyDecision,
  builder: ReturnType<typeof createImpactBuilder>
): void {
  const policies = {
    ...(decision.impact.worldFields?.npcBidPolicies ?? world.npcBidPolicies ?? {}),
  };
  const cur = policies[heyaId];
  if (cur && adaptation.bidFamilyBias) {
    policies[heyaId] = { ...cur, familyBias: adaptation.bidFamilyBias };
    builder.updateWorldField("npcBidPolicies", policies);
  } else if (cur?.familyBias && !adaptation.bidFamilyBias) {
    const next = { ...cur };
    delete next.familyBias;
    policies[heyaId] = next;
    builder.updateWorldField("npcBidPolicies", policies);
  }
}

/**
 * WS4 — the oyakata answers pending rikishi requests by archetype BEFORE the
 * decision applies, so granted rest feeds the protect list.
 */
function resolveAgencyRequests(
  world: WorldState,
  heya: Heya,
  nextOya: Oyakata,
  decision: NPCWeeklyDecision,
  agencyRequests: RikishiRequest[],
  resolvedRequestIds: Set<string>,
  builder: ReturnType<typeof createImpactBuilder>
): void {
  for (const request of agencyRequests) {
    if (request.heyaId !== heya.id || resolvedRequestIds.has(request.id)) continue;
    const granted = resolveNPCRequest(world, heya, nextOya, request) === "grant";
    if (granted && request.type === "request_rest") {
      decision.individualProtects ??= [];
      if (!decision.individualProtects.includes(request.rikishiId)) {
        decision.individualProtects.push(request.rikishiId);
      }
    }
    applyRequestOutcome(world, builder, request, granted);
    resolvedRequestIds.add(request.id);
  }
}

/**
 * Post-decision bookkeeping for one NPC heya: plan memory, mood,
 * scouting-priority map, decision/shift events, and autonomous
 * crisis/media resolution via the NPC agents.
 */
function applyPostDecisionBookkeeping(
  world: WorldState,
  heya: Heya,
  nextOya: Oyakata,
  currentPlan: AIPlan | undefined,
  decision: NPCWeeklyDecision,
  scoutingMap: Record<Id, "none" | "passive" | "active" | "aggressive">,
  builder: ReturnType<typeof createImpactBuilder>
): void {
  if (currentPlan) {
    nextOya.memory = recordDecision(
      nextOya.memory ?? getMemory(nextOya, world.week),
      world.year,
      world.week,
      `Plan ${currentPlan.planId}: intensity ${decision.trainingIntensity}, scouting ${decision.scoutingPriority}`,
      currentPlan.planId,
      planPrimaryMetricOrdinal(world, heya.id, currentPlan.planId)
    );
  }

  const newMood = processOyakataMood(nextOya, decision, heya.id, builder);
  nextOya.mood = newMood;
  scoutingMap[heya.id] = decision.scoutingPriority;
  collectManagementDecisionEvents(heya.id, decision, builder);
  collectStrategyShiftEvents(heya.id, decision, builder);

  // Resolve any active crisis autonomously via the CrisisAgent.
  if (heya.activeCrisis) {
    builder.merge(resolveNPCCrisis(world, heya.id, heya.activeCrisis));
  }

  // Handle media events for NPCs via the MediaAgent (actor-scoped
  // effects; rulings already resolved by anyone are skipped).
  if (world.governanceLog) {
    for (const event of world.governanceLog) {
      if (event.heyaId !== heya.id) continue;
      if (event.playerChoice || event.actorChoice) continue;
      const severity =
        event.severity === "high" || event.severity === "terminal"
          ? "major"
          : event.severity === "medium"
            ? "moderate"
            : "minor";
      builder.merge(
        handleNPCMediaEvent(world, heya.id, event.id, event.incident ?? event.type, severity).impact
      );
    }
  }
}

/**
 * executeAgentDecisions stamps lastExecutedAt onto the pre-consolidation
 * memory snapshot. Fold the cooldown stamps into nextOya.memory so the
 * final updateOyakata doesn't overwrite them.
 */
function foldExecutionCooldowns(
  world: WorldState,
  nextOya: Oyakata,
  decision: NPCWeeklyDecision
): void {
  const execOyaUpdate = decision.impact.entities?.oyakataUpdates?.get(nextOya.id) as
    { memory?: { lastExecutedAt?: Record<string, number> } } | undefined;
  if (execOyaUpdate?.memory?.lastExecutedAt) {
    nextOya.memory = {
      ...(nextOya.memory ?? getMemory(nextOya, world.week)),
      lastExecutedAt: execOyaUpdate.memory.lastExecutedAt,
    };
  }
}
