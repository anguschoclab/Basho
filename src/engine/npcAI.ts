// @ts-nocheck
// npcAI.ts
// =======================================================
// NPC Manager AI Orchestrator (Canon A7/A8/A11)
// - Coordinates weekly, monthly, and yearly decision loops
// - Delegates persona and strategy logic to specialized services
// =======================================================

import { getOyakataStyleProfile } from "./oyakataStylePreferences";
import * as talentpool from "./systems/generation/TalentPoolService";
import type { WorldState } from "./types/world";
import type { OyakataArchetype, OyakataMood } from "./types/oyakata";
import type { Id } from "./types/common";
import { TrainingIntensity, TrainingFocus, RecoveryEmphasis } from "./types/training";
import { TrainingService } from "./systems/training/TrainingService";
import { WorldCircuitService } from "./systems/global/WorldCircuitService";
import { enforceHardCapRosterOverflow, HARD_CAP_ROSTER_SIZE } from "./overflow";
import { getOyakataForHeya, getRikishi, getHeya } from "./queries";
import { getAvailableStables } from "./selectors";
import { stableSort } from "./utils/sort";
import { createImpactBuilder } from "./core/ImpactBuilder";
import type { StateImpact } from "./core/StateImpact";
import type { PerceptionSnapshot } from "./perception";
import type { IndividualFocus } from "./types/training";
import type { Heya } from "./types/heya";

// Strategies & Personas
import { getFinanceStrategy } from "./npcFinanceStrategy";
import { getRecruitmentStrategy } from "./npcRecruitmentStrategy";
import { getRetirementStrategy } from "./npcRetirementStrategy";
import { getSponsorStrategy } from "./npcSponsorStrategy";
import { getGovernanceStrategy } from "./npcGovernanceStrategy";
import { getManagerPersona } from "./systems/NPCPersonaService";
export { getManagerPersona };

import {
  spawnTrainingWorker,
  spawnScoutingWorker,
  spawnPersonnelWorker,
  spawnGlobalWorker,
  rpPerception,
  type TrainingWorkerContext,
  type ScoutingWorkerContext,
  type PersonnelWorkerContext,
  type GlobalWorkerContext,
} from "./npcAIWorkers";

// New Agent System Integration
import {
  spawnCrisisAgent,
  spawnFinanceAgent,
  spawnGovernanceAgent,
  spawnMediaAgent,
  spawnRecruitmentAgent,
  spawnRivalryAgent,
  spawnNarrativeAgent,
  type CrisisAgentContext,
  type FinanceAgentContext,
  type GovernanceAgentContext,
  type MediaAgentContext,
  type RecruitmentAgentContext,
  type RivalryAgentContext,
  type NarrativeAgentContext,
} from "./agents";

/** Agent decision outputs for extended NPC AI */
export interface AgentDecisions {
  // Finance Agent
  finance: {
    shouldBuyMyoseki: boolean;
    shouldInvestInFacilities: boolean;
    shouldBuildReserves: boolean;
    riskLevel: "conservative" | "moderate" | "aggressive";
  };
  // Governance Agent
  governance: {
    shouldReduceScandal: boolean;
    shouldUsePoliticalFavor: boolean;
    shouldSabotageRival: boolean;
  };
  // Recruitment Agent
  recruitment: {
    maxBid: number;
    shouldBid: boolean;
    bidStrategy: "aggressive" | "moderate" | "conservative";
  };
  // Rivalry Agent
  rivalry: {
    escalateRivalry: boolean;
    deescalateRivalry: boolean;
    targetRivalForMatchmaking: string[];
  };
  // Narrative Agent
  narrative: {
    shouldTriggerEvent: boolean;
    eventType?: string;
    narrativeTone: "heroic" | "tragic" | "dramatic" | "underdog" | "neutral";
  };
}

/** Decision output for a single NPC heya per week */
export interface NPCWeeklyDecision {
  heyaId: Id;
  archetype: OyakataArchetype | "unknown";
  trainingIntensity: TrainingIntensity;
  trainingFocus: TrainingFocus;
  recovery: RecoveryEmphasis;
  scoutingPriority: "none" | "passive" | "active" | "aggressive";
  individualProtects: Id[];
  individualDevelops: Id[];
  individualPushes: Id[];
  reasoning: string[];
  mood?: OyakataMood;
  impact: StateImpact;
  agentDecisions?: AgentDecisions;
}

/**
 * Core decision function for a single NPC-managed heya.
 * All inputs are banded (PerceptionSnapshot) — AI does not cheat (A7.1).
 */
export function makeNPCWeeklyDecision(world: WorldState, heyaId: Id): NPCWeeklyDecision {
  const persona = getManagerPersona(world, heyaId);
  const perception = persona.perception;
  const reasoning: string[] = [];

  const heya = getHeya(world, heyaId);
  const oyakata = heya ? getOyakataForHeya(world, heyaId) : undefined;
  const styleProfile = oyakata ? getOyakataStyleProfile(world, oyakata) : undefined;
  const philosophy = styleProfile?.philosophy;

  const complianceCap = heya?.welfareState?.sanctions?.trainingIntensityCap;

  // --- Phase 2: Hierarchical Delegation (Worker Agents) ---

  // 1. Training Worker (Isolated Context)
  const trainingCtx: TrainingWorkerContext = {
    perception: rpPerception(perception), // Isolated rikishi perception
    riskAppetite: persona.riskAppetite,
    welfareDiscipline: persona.welfareDiscipline,
    mood: persona.mood,
    complianceCap,
    philosophy,
    styleBias: persona.styleBias,
    tradition: persona.traits.tradition,
  };
  const trainingProposal = spawnTrainingWorker(trainingCtx);
  reasoning.push(...trainingProposal.reasoning);

  // 2. Scouting Worker (Isolated Context)
  const scoutingCtx: ScoutingWorkerContext = {
    runwayBand: perception.runwayBand,
    rosterSize: perception.rosterSize,
    rosterStrengthBand: perception.rosterStrengthBand,
    ambition: persona.traits.ambition,
    hasSleeperScout: persona.quirks.includes("Sleeper Scout"),
  };
  const scoutingProposal = spawnScoutingWorker(scoutingCtx);
  reasoning.push(scoutingProposal.reason);

  // 3. Personnel Worker (Isolated Context)
  const personnelCtx: PersonnelWorkerContext = {
    rikishiPerceptions: perception.rikishiPerceptions,
    welfareDiscipline: persona.welfareDiscipline,
    styleProfile,
    world, // Needed for getRikishi (limited read)
  };
  const personnelProposal = spawnPersonnelWorker(personnelCtx);
  reasoning.push(...personnelProposal.reasoning);

  // 4. Global Worker (World Circuit Strategy)
  const globalCtx: GlobalWorkerContext = {
    heyaId,
    ambition: persona.traits.ambition,
    riskAppetite: persona.riskAppetite,
    perception,
    pendingExhibitions: world.pendingExhibitions || [],
    world,
  };
  const globalProposal = spawnGlobalWorker(globalCtx);
  reasoning.push(...globalProposal.reasoning);

  // --- Phase 2b: New Agent System Integration ---
  // Spawn specialized agents for complex decision domains
  let agentDecisions: AgentDecisions | undefined;

  if (oyakata) {
    // Finance Agent - Financial investment decisions
    const financeCtx: FinanceAgentContext = {
      oyakata,
      world,
      runwayBand: perception.runwayBand,
      funds: heya?.funds || 0,
      monthlyBurn: heya?.monthlyBurnRate || 0,
    };
    const financeResult = spawnFinanceAgent(financeCtx);
    reasoning.push(...financeResult.reasoning);

    // Governance Agent - Political maneuvering
    const governanceCtx: GovernanceAgentContext = {
      heya: heya!,
      oyakata,
      world,
      scandalScore: heya?.welfareState?.scandalScore || 0,
      politicalCapital: heya?.politicalCapital || 0,
      governanceStatus: heya?.welfareState?.complianceState || "good",
    };
    const governanceResult = spawnGovernanceAgent(governanceCtx);
    reasoning.push(...governanceResult.reasoning);

    // Rivalry Agent - Rivalry management
    const rivalryCtx: RivalryAgentContext = {
      oyakata,
      activeRivalries: world.rivalries || {},
      currentMood: persona.mood,
    };
    const rivalryResult = spawnRivalryAgent(rivalryCtx);
    reasoning.push(...rivalryResult.reasoning);

    // Narrative Agent - Story generation
    const topRikishi = Array.from(world.rikishi.values())
      .filter((r) => r.division === "makuuchi" || r.division === "juryo")
      .slice(0, 5);
    const narrativeCtx: NarrativeAgentContext = {
      oyakata,
      topRikishi,
      recentAchievements: world._recentAchievements || [],
      currentBashoPhase: world.bashoPhase || "interim",
    };
    const narrativeResult = spawnNarrativeAgent(narrativeCtx);
    reasoning.push(...narrativeResult.reasoning);

    // Recruitment Agent - Bidding strategy (if vacancies exist)
    let recruitmentResult = {
      maxBid: 0,
      shouldBid: false,
      bidStrategy: "conservative" as const,
      reasoning: ["[Recruitment Agent] No vacancies - skipping recruitment"],
      confidence: 0,
    };
    const rosterSize = heya?.rikishiIds?.length || 0;
    const vacancies = Math.max(0, 15 - rosterSize); // Assuming 15 is target roster size
    if (vacancies > 0 && world.talentPool) {
      const candidateIds = Object.keys(world.talentPool.candidates);
      if (candidateIds.length > 0) {
        const recruitmentCtx: RecruitmentAgentContext = {
          oyakata,
          world,
          vacancyCount: vacancies,
          runwayBand: perception.runwayBand,
          funds: heya?.funds || 0,
          rosterSize,
          candidateId: candidateIds[0], // Prioritize first available candidate
        };
        recruitmentResult = spawnRecruitmentAgent(recruitmentCtx);
        reasoning.push(...recruitmentResult.reasoning);
      }
    }

    // Compile agent decisions
    agentDecisions = {
      finance: {
        shouldBuyMyoseki: financeResult.shouldBuyMyoseki,
        shouldInvestInFacilities: financeResult.shouldInvestInFacilities,
        shouldBuildReserves: financeResult.shouldBuildReserves,
        riskLevel: financeResult.riskLevel,
      },
      governance: {
        shouldReduceScandal: governanceResult.shouldReduceScandal,
        shouldUsePoliticalFavor: governanceResult.shouldUsePoliticalFavor,
        shouldSabotageRival: governanceResult.shouldSabotageRival,
      },
      recruitment: {
        maxBid: recruitmentResult.maxBid,
        shouldBid: recruitmentResult.shouldBid,
        bidStrategy: recruitmentResult.bidStrategy,
      },
      rivalry: {
        escalateRivalry: rivalryResult.escalateRivalry,
        deescalateRivalry: rivalryResult.deescalateRivalry,
        targetRivalForMatchmaking: rivalryResult.targetRivalForMatchmaking,
      },
      narrative: {
        shouldTriggerEvent: narrativeResult.shouldTriggerEvent,
        eventType: narrativeResult.eventType,
        narrativeTone: narrativeResult.narrativeTone,
      },
    };

    // Agent-based overrides (Phase 2c: Agent-Lead Review)
    if (financeResult.riskLevel === "conservative" && trainingProposal.trainingIntensity === "punishing") {
      trainingProposal.trainingIntensity = "intense";
      reasoning.push("[Agent Review] Finance agent overrides: Reducing intensity to 'intense' due to conservative financial stance");
    }

    if (governanceResult.shouldReduceScandal && governanceResult.scandalReductionMethod === "cooperate") {
      // Reduce scandal impact by being cooperative
      reasoning.push("[Agent Review] Governance agent: Cooperative scandal reduction strategy selected");
    }
  }

  // --- Phase 3: Lead Review (Alignment Check) ---
  // The Oyakata (Lead Agent) reviews worker proposals against memory/mood.
  if (persona.mood === "furious" && trainingProposal.trainingIntensity !== "punishing") {
    trainingProposal.trainingIntensity = "punishing";
    reasoning.push(
      "[Lead Review] Oyakata overrides: Ignoring worker caution, imposing punishing intensity due to fury."
    );
  }

  const builder = createImpactBuilder("makeNPCWeeklyDecision");

  // Handle Global Decisions (Exhibitions)
  if (globalProposal.acceptedExhibitionId && globalProposal.rikishiId) {
    const invitation = (world.pendingExhibitions || []).find(
      (i) => i.id === globalProposal.acceptedExhibitionId
    );
    if (invitation) {
      builder.merge(
        WorldCircuitService.processExhibitionResult(
          world,
          heyaId,
          globalProposal.rikishiId,
          invitation
        )
      );
      // Remove invitation from pending
      const nextPending = (world.pendingExhibitions || []).filter(
        (i) => i.id !== globalProposal.acceptedExhibitionId
      );
      builder.updateWorldField("pendingExhibitions", nextPending);
    }
  }

  // Apply withdrawal decisions
  for (const withdrawalId of personnelProposal.withdrawalIds) {
    const rikishi = getRikishi(world, withdrawalId);
    if (rikishi && rikishi.injured) {
      builder.updateRikishi(withdrawalId, {
        isKyujo: true,
        kyujoReason: "injury",
        medicalCertificate: {
          injury: rikishi.injuryStatus?.type || "unknown",
          severity: rikishi.injuryStatus?.severity || "moderate",
          treatmentWeeks: rikishi.injuryWeeksRemaining,
          submittedDate: world.calendar?.currentWeek ?? 0,
        },
      });
    }
  }

  // Apply agent-based impacts
  if (agentDecisions) {
    // Log agent decisions for debugging/narrative
    if (agentDecisions.finance.shouldBuyMyoseki) {
      builder.logEvent("NPC_DECISION", "finance", { heyaId, decision: "buy_myoseki" }, { heyaId });
    }
    if (agentDecisions.governance.shouldReduceScandal) {
      builder.logEvent("NPC_DECISION", "governance", { heyaId, decision: "reduce_scandal" }, { heyaId });
    }
    if (agentDecisions.rivalry.escalateRivalry) {
      builder.logEvent("NPC_DECISION", "rivalry", { heyaId, decision: "escalate_rivalry" }, { heyaId });
    }
    if (agentDecisions.narrative.shouldTriggerEvent) {
      builder.logEvent("NPC_DECISION", "narrative", { heyaId, decision: "trigger_event", eventType: agentDecisions.narrative.eventType }, { heyaId });
    }
  }

  return {
    heyaId,
    archetype: persona.archetype,
    trainingIntensity: trainingProposal.trainingIntensity,
    trainingFocus: trainingProposal.trainingFocus,
    recovery: trainingProposal.recovery,
    scoutingPriority: scoutingProposal.priority,
    individualProtects: personnelProposal.individualProtects,
    individualDevelops: personnelProposal.individualDevelops,
    individualPushes: personnelProposal.individualPushes,
    reasoning,
    mood: persona.mood,
    impact: builder.build(),
    agentDecisions,
  };
}

/**
 * Handle crisis response using Crisis Agent.
 * Called when a crisis event occurs for an NPC heya.
 */
export function handleNPCCrisis(
  world: WorldState,
  heyaId: Id,
  crisis: import("./types/crises").ActiveCrisis
): { choiceId: string; reasoning: string[]; impact: StateImpact } {
  const builder = createImpactBuilder("handleNPCCrisis");
  const heya = getHeya(world, heyaId);
  const oyakata = heya ? getOyakataForHeya(world, heyaId) : undefined;

  if (!oyakata || !heya) {
    return { choiceId: crisis.options[0]?.id || "default", reasoning: ["No oyakata found"], impact: builder.build() };
  }

  const crisisCtx: CrisisAgentContext = {
    crisis,
    oyakata,
    heyaId,
    world,
    currentMood: oyakata.mood,
  };

  const crisisResult = spawnCrisisAgent(crisisCtx);

  // Log the crisis response
  builder.logEvent(
    "CRISIS_RESPONSE",
    "crisis",
    {
      heyaId,
      crisisId: crisis.id,
      choiceId: crisisResult.selectedChoiceId,
      reputationChange: crisisResult.expectedImpact.reputationChange,
      politicalCapitalChange: crisisResult.expectedImpact.politicalCapitalChange,
    },
    { heyaId }
  );

  return {
    choiceId: crisisResult.selectedChoiceId,
    reasoning: crisisResult.reasoning,
    impact: builder.build(),
  };
}

/**
 * Handle media event response using Media Agent.
 * Called when a media event occurs for an NPC heya.
 */
export function handleNPCMediaEvent(
  world: WorldState,
  heyaId: Id,
  eventId: string,
  eventType: string,
  severity: "minor" | "moderate" | "major"
): { response: "apologize" | "deny" | "ignore" | "deflect"; reasoning: string[]; impact: StateImpact } {
  const builder = createImpactBuilder("handleNPCMediaEvent");
  const heya = getHeya(world, heyaId);
  const oyakata = heya ? getOyakataForHeya(world, heyaId) : undefined;

  if (!oyakata || !heya) {
    return { response: "ignore", reasoning: ["No oyakata found"], impact: builder.build() };
  }

  const mediaCtx: MediaAgentContext = {
    eventId,
    eventType,
    severity,
    oyakata,
    heyaId,
    world,
  };

  const mediaResult = spawnMediaAgent(mediaCtx);

  // Log the media response
  builder.logEvent(
    "MEDIA_RESPONSE",
    "media",
    {
      heyaId,
      eventId,
      response: mediaResult.response,
      confidence: mediaResult.confidence,
    },
    { heyaId }
  );

  return {
    response: mediaResult.response,
    reasoning: mediaResult.reasoning,
    impact: builder.build(),
  };
}

/**
 * Phase 1: Background Consolidation
 * Implements Directives: "Skeptical Memory" & "Background Consolidation"
 * Merges current perception with Oyakata's internal memory buffer.
 * Returns StateImpact describing memory consolidation instead of mutating directly.
 */
export function consolidateOyakataMemory(
  world: WorldState,
  heyaId: Id,
  perception: PerceptionSnapshot
): StateImpact {
  const builder = createImpactBuilder("consolidateOyakataMemory");
  const heya = getHeya(world, heyaId);
  const oyakata = heya ? getOyakataForHeya(world, heyaId) : undefined;
  if (!oyakata) return builder.build();

  const existingMemory = oyakata.memory || {
    observations: [],
    coreDirectives: [
      `Maintain the excellence of ${heya?.name || "the heya"}`,
      `Prioritize ${oyakata.archetype} values`,
    ],
    lastConsolidationTick: world.week,
  };

  const memory = { ...existingMemory };
  const tick = world.week;

  // Skeptical Check: Does current perception conflict with previous mood/state?
  if (
    perception.moraleBand === "mutinous" &&
    oyakata.mood !== "furious" &&
    oyakata.mood !== "anxious"
  ) {
    memory.observations = [
      ...memory.observations,
      {
        tick,
        type: "alignment",
        summary: `Unexpected morale collapse detected. Current banding (${perception.moraleBand}) conflicts with established mood (${oyakata.mood}).`,
        importance: 8,
      },
    ];
  }

  // Record key perception snapshots
  if (perception.runwayBand === "desperate" || perception.runwayBand === "critical") {
    memory.observations = [
      ...memory.observations,
      {
        tick,
        type: "perception",
        summary: `Financial runway is ${perception.runwayBand}. Consolidation required to prevent insolvency.`,
        importance: 10,
      },
    ];
  }

  // Prune noise (Limit to 10 observations per Canon Directive)
  if (memory.observations.length > 10) {
    memory.observations.sort((a, b) => b.importance - a.importance);
    memory.observations = memory.observations.slice(0, 10);
  }

  memory.lastConsolidationTick = tick;

  builder.updateOyakata(oyakata.id, { memory });

  return builder.build();
}

/**
 * Writes a decision into the world state (training profile + individual focus slots).
 * Returns StateImpact describing decision application instead of mutating directly.
 */
export function applyNPCDecision(world: WorldState, decision: NPCWeeklyDecision): StateImpact {
  const builder = createImpactBuilder("applyNPCDecision");
  const state = TrainingService.ensureHeyaTrainingState(world, decision.heyaId);

  const newActiveProfile = {
    ...state.activeProfile,
    intensity: decision.trainingIntensity,
    focus: decision.trainingFocus,
    recovery: decision.recovery,
  };

  const allManagedIds = new Set([
    ...decision.individualProtects,
    ...decision.individualPushes,
    ...decision.individualDevelops,
  ]);

  const existingFocus = state.focusSlots.filter(
    (f: IndividualFocus) => !allManagedIds.has(f.rikishiId)
  );

  const protectSlots = decision.individualProtects.map((id) => ({
    rikishiId: id,
    focusType: "protect" as const,
  }));
  const pushSlots = decision.individualPushes.map((id) => ({
    rikishiId: id,
    focusType: "push" as const,
  }));
  const developSlots = decision.individualDevelops.map((id) => ({
    rikishiId: id,
    focusType: "develop" as const,
  }));

  const newFocusSlots = [...existingFocus, ...protectSlots, ...pushSlots, ...developSlots];

  builder.updateTrainingState(decision.heyaId, {
    activeProfile: newActiveProfile,
    focusSlots: newFocusSlots,
  });

  return builder.build();
}

/**
 * NPC Manager AI weekly decision loop
 * Returns StateImpact describing weekly NPC decisions instead of mutating directly.
 */
export function tickWeekNPC(world: WorldState): StateImpact {
  const builder = createImpactBuilder("tickWeekNPC");

  const playerHeyaId = world.playerHeyaId;
  const scoutingMap: Record<Id, "none" | "passive" | "active" | "aggressive"> = {
    ...(world.npcScoutingPriorities || {}),
  };

  for (const heya of getAvailableStables(world)) {
    if (heya.id === playerHeyaId) continue;

    // Phase 1: Hierarchical Delegation (Decision Logic)
    const decision = makeNPCWeeklyDecision(world, heya.id);

    builder.merge(applyNPCDecision(world, decision));
    builder.merge(decision.impact);

    const oyakata = heya.oyakataId ? world.oyakata.get(heya.oyakataId) : undefined;
    const oldMood = oyakata?.mood ?? "content";
    const newMood = decision.mood;

    if (oyakata && newMood && newMood !== oldMood) {
      builder.updateOyakata(oyakata.id, { mood: newMood });

      builder.logEvent(
        "OYAKATA_MOOD_SHIFT",
        "narrative",
        { oldMood, newMood },
        { heyaId: heya.id }
      );
    }

    scoutingMap[heya.id] = decision.scoutingPriority;

    builder.logEvent(
      "NPC_MANAGER_DECISION",
      "narrative",
      {
        archetype: decision.archetype,
        intensity: decision.trainingIntensity,
        focus: decision.trainingFocus,
        recovery: decision.recovery,
        scouting: decision.scoutingPriority,
        protectedCount: decision.individualProtects.length,
        reasoningLog: decision.reasoning.join(" | "),
      },
      {
        heyaId: heya.id,
        importance:
          decision.trainingIntensity === "punishing" ||
          decision.trainingIntensity === "conservative"
            ? "notable"
            : "minor",
      }
    );

    if (decision.trainingIntensity === "punishing") {
      builder.logEvent(
        "NARRATIVE_STRATEGY_SHIFT",
        "narrative",
        { intensity: "punishing", reasoning: decision.reasoning[0] },
        { heyaId: heya.id }
      );
    }
  }

  builder.updateWorldField("npcScoutingPriorities", scoutingMap);

  // Enforce roster hard cap (A11.4)
  builder.merge(enforceHardCapRosterOverflow(world));

  return builder.build();
}

/**
 * NPC Manager AI monthly decision loop
 * Returns StateImpact describing monthly NPC decisions instead of mutating directly.
 */
export function tickMonthlyNPC(world: WorldState): StateImpact {
  const builder = createImpactBuilder("tickMonthlyNPC");
  const playerHeyaId = world.playerHeyaId;
  const vacanciesByHeyaId: Record<Id, number> = {};
  let hasVacancies = false;

  const candidateHeyas = getAvailableStables(world).filter(
    (h) => h.id !== playerHeyaId && h.oyakataId && world.oyakata.has(h.oyakataId)
  );

  // Use stableSort to ensure determinism across simulation runs
  const sortedHeyas = stableSort(candidateHeyas, (h) => h.id);

  for (const heya of sortedHeyas) {
    const oyakata = world.oyakata.get(heya.oyakataId!)!;

    // 1. Finance & Sponsorship
    const financeStrat = getFinanceStrategy(oyakata.archetype);
    builder.merge(financeStrat.evaluateFinances(world, heya, oyakata));

    const sponsorStrat = getSponsorStrategy(oyakata.archetype);
    builder.merge(sponsorStrat.evaluateSponsorRecruitment(world, heya, oyakata));

    // 2. Lifecycle (Retirements)
    const retirementStrat = getRetirementStrategy(oyakata.archetype);
    builder.merge(retirementStrat.evaluateRetirements(world, heya, oyakata));

    // 3. Recruitment (Vacancies)
    const recruitmentStrat = getRecruitmentStrategy(oyakata.archetype);
    const { impact: recruitmentImpact, count: vacancies } = recruitmentStrat.evaluateVacancies(
      world,
      heya,
      oyakata
    );
    builder.merge(recruitmentImpact);

    // 4. Governance & Politics
    const governanceStrat = getGovernanceStrategy(oyakata.archetype);
    builder.merge(governanceStrat.evaluateGovernanceDecisions(world, heya, oyakata));

    if (vacancies > 0) {
      vacanciesByHeyaId[heya.id] = vacancies;
      hasVacancies = true;
    }
  }

  // 5. Global Recruitment Resolution (Competitive Bidding)
  if (hasVacancies) {
    builder.merge(talentpool.fillVacanciesForNPCWithBidding(world, vacanciesByHeyaId));
  }

  return builder.build();
}

/**
 * NPC Manager AI yearly decision loop
 * Returns StateImpact describing yearly NPC decisions instead of mutating directly.
 */
export function tickYear(world: WorldState): StateImpact {
  const builder = createImpactBuilder("tickYear");

  for (const heya of getAvailableStables(world)) {
    if (heya.id === world.playerHeyaId) continue;
    const persona = getManagerPersona(world, heya.id);

    if (persona.traits.ambition > 70 && persona.perception.rosterStrengthBand === "weak") {
      builder.logEvent(
        "NPC_MANAGER_DECISION",
        "narrative",
        {
          year: world.calendar?.year ?? 0,
          strategy: "rebuild",
          ambition: persona.traits.ambition,
        },
        { heyaId: heya.id, importance: "minor" }
      );
    }
  }

  return builder.build();
}
