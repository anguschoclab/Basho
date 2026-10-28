import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { Id } from "@/engine/types/common";
import type { Heya } from "@/engine/types/heya";
import type { Oyakata } from "@/engine/types/oyakata";
import type { RecruitmentAgentResult } from "@/engine/npc/agents/RecruitmentAgent";
import { WorldCircuitService } from "@/engine/worldCircuit/WorldCircuitService";
import { getRikishi } from "@/engine/core/queries";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { isSekitoriDivision } from "@/constants/engine/rankDisplay";
import { MONTHLY_BURN_PER_RIKISHI } from "@/constants/engine/economy";
import { TOP_RIKISHI_COUNT, MAX_ROSTER_SIZE } from "@/constants/engine/npcStrategy";
import {
  spawnFinanceAgent,
  spawnGovernanceAgent,
  spawnRecruitmentAgent,
  spawnRivalryAgent,
  spawnNarrativeAgent,
  type FinanceAgentContext,
  type GovernanceAgentContext,
  type RecruitmentAgentContext,
  type RivalryAgentContext,
  type NarrativeAgentContext,
} from "@/engine/npc/agents/index";
import type { AgentDecisions } from "@/engine/npc/npcTypes";
import type { AIPlan } from "@/engine/npc/types";
import { applyPlanConstraints } from "@/engine/npc/TacticalCoordinator";
import { executeAgentDecisions } from "@/engine/npc/execution";
import type { WeeklyContext } from "@/engine/npc/weekly/context";
import type { WorkerProposals } from "@/engine/npc/weekly/workers";
import type { StateImpact } from "@/engine/core/StateImpact";

/**
 * Runs the five agent spawns, assembles AgentDecisions, applies agent-review
 * overrides to the worker proposals, and enforces plan constraints.
 * Returns undefined when the heya has no oyakata (agents need a persona).
 */
export function runAgentLayer(
  world: WorldState,
  heyaId: Id,
  ctx: WeeklyContext,
  proposals: WorkerProposals,
  plan?: AIPlan
): AgentDecisions | undefined {
  const { persona, perception, heya, oyakata, reasoning } = ctx;
  if (!oyakata) return undefined;

  const { trainingProposal, scoutingProposal, personnelProposal } = proposals;

  // Roster-derived monthly burn — same convention as NPCFinanceCalculator /
  // npcRecruitmentStrategy (MONTHLY_BURN_PER_RIKISHI per roster member).
  const monthlyBurn = new Set(heya?.rikishiIds ?? []).size * MONTHLY_BURN_PER_RIKISHI;
  const financeCtx: FinanceAgentContext = {
    oyakata,
    world,
    runwayBand: perception.runwayBand,
    funds: heya?.funds || 0,
    monthlyBurn,
  };
  const financeResult = spawnFinanceAgent(financeCtx);
  reasoning.push(...financeResult.reasoning);

  const governanceCtx: GovernanceAgentContext = {
    heya: heya as Heya,
    oyakata,
    world,
    scandalScore: heya?.scandalScore || 0,
    politicalCapital: heya?.politicalCapital || 0,
    governanceStatus: heya?.governanceStatus ?? "good_standing",
  };
  const governanceResult = spawnGovernanceAgent(governanceCtx);
  reasoning.push(...governanceResult.reasoning);

  const rivalryCtx: RivalryAgentContext = {
    oyakata,
    activeRivalries: world.rivalriesState?.pairs || {},
    currentMood: persona.mood,
    grudgeRivalryKeys: grudgeRivalryKeys(world, oyakata),
  };
  const rivalryResult = spawnRivalryAgent(rivalryCtx);
  reasoning.push(...rivalryResult.reasoning);

  // The narrative agent speaks for THIS stable — sample the heya's own
  // sekitori, not the global roster (a stable must not headline rivals).
  const topRikishi: Rikishi[] = [];
  for (const rikishiId of heya?.rikishiIds ?? []) {
    const r = getRikishi(world, rikishiId);
    if (!r || r.isRetired) continue;
    if (isSekitoriDivision(r.division)) {
      topRikishi.push(r);
      if (topRikishi.length >= TOP_RIKISHI_COUNT) break;
    }
  }

  const narrativeCtx: NarrativeAgentContext = {
    oyakata,
    topRikishi,
    recentAchievements: [],
    currentBashoPhase: world.cyclePhase,
  };
  const narrativeResult = spawnNarrativeAgent(narrativeCtx);
  reasoning.push(...narrativeResult.reasoning);

  const recruitmentResult = runRecruitmentPass(world, heyaId, ctx, oyakata);

  const agentDecisions = assembleAgentDecisions(
    { financeResult, governanceResult, recruitmentResult, rivalryResult, narrativeResult },
    heya?.governanceStatus
  );

  if (
    financeResult.riskLevel === "conservative" &&
    trainingProposal.trainingIntensity === "punishing"
  ) {
    trainingProposal.trainingIntensity = "intensive";
    reasoning.push(
      "[Agent Review] Finance agent overrides: Reducing intensity to 'intense' due to conservative financial stance"
    );
  }

  if (
    governanceResult.shouldReduceScandal &&
    governanceResult.scandalReductionMethod === "cooperate"
  ) {
    reasoning.push(
      "[Agent Review] Governance agent: Cooperative scandal reduction strategy selected"
    );
  }

  if (plan) {
    applyPlanConstraints(
      plan,
      {
        trainingProposal,
        scoutingProposal,
        personnelProposal,
        financeResult,
        governanceResult,
        recruitmentResult,
        rivalryResult,
        agentDecisions,
      },
      perception,
      reasoning
    );
  }

  return agentDecisions;
}

/** Assemble the AgentDecisions DTO from the five agent results. */
function assembleAgentDecisions(
  r: {
    financeResult: ReturnType<typeof spawnFinanceAgent>;
    governanceResult: ReturnType<typeof spawnGovernanceAgent>;
    recruitmentResult: RecruitmentAgentResult;
    rivalryResult: ReturnType<typeof spawnRivalryAgent>;
    narrativeResult: ReturnType<typeof spawnNarrativeAgent>;
  },
  governanceStatus: Heya["governanceStatus"] | undefined
): AgentDecisions {
  return {
    finance: {
      shouldBuyMyoseki: r.financeResult.shouldBuyMyoseki,
      myosekiId: r.financeResult.myosekiId,
      shouldInvestInFacilities: r.financeResult.shouldInvestInFacilities,
      shouldBuildReserves: r.financeResult.shouldBuildReserves,
      riskLevel: r.financeResult.riskLevel,
      shouldSeekRescue: r.financeResult.shouldSeekRescue,
      rescueMenu: r.financeResult.rescueMenu,
    },
    governance: {
      shouldReduceScandal: r.governanceResult.shouldReduceScandal,
      shouldUsePoliticalFavor: r.governanceResult.shouldUsePoliticalFavor,
      // WS6 — sanctioned/probation heya keep low visibility: sabotage is off
      // the table entirely while governance scrutiny is active.
      shouldSabotageRival:
        r.governanceResult.shouldSabotageRival &&
        governanceStatus !== "sanctioned" &&
        governanceStatus !== "probation",
    },
    recruitment: {
      maxBid: r.recruitmentResult.maxBid,
      shouldBid: r.recruitmentResult.shouldBid,
      bidStrategy: r.recruitmentResult.bidStrategy,
    },
    rivalry: {
      escalateRivalry: r.rivalryResult.escalateRivalry,
      deescalateRivalry: r.rivalryResult.deescalateRivalry,
      targetRivalForMatchmaking: r.rivalryResult.targetRivalForMatchmaking,
      vendetta: r.rivalryResult.escalatedViaGrudge,
    },
    narrative: {
      shouldTriggerEvent: r.narrativeResult.shouldTriggerEvent,
      eventType: r.narrativeResult.eventType,
      rikishiId: r.narrativeResult.rikishiId,
      narrativeTone: r.narrativeResult.narrativeTone,
    },
    infrastructure: {
      shouldHireStaff: false,
      shouldBuildAcademy: false,
      shouldUpgradeAcademy: false,
    },
  };
}

// V14-B10 — must return a FRESH object each call. TacticalCoordinator's
// boostRecruitment mutates `recruitment.shouldBid` in place; a shared
// singleton leaks `shouldBid: true` into every later caller in the process,
// including subsequent worlds in a same-process double-run.
function noVacancyResult(): RecruitmentAgentResult {
  return {
    maxBid: 0,
    shouldBid: false,
    bidStrategy: "conservative",
    reasoning: ["[Recruitment Agent] No vacancies - skipping recruitment"],
    confidence: 0,
  };
}

/**
 * Recruitment pass: picks the strongest available candidate, prices rival
 * pressure from the hottest heya-rivalry pair, then spawns the agent.
 */
function runRecruitmentPass(
  world: WorldState,
  heyaId: Id,
  ctx: WeeklyContext,
  oyakata: Oyakata
): RecruitmentAgentResult {
  const { perception, heya, reasoning } = ctx;
  const rosterSize = new Set(heya?.rikishiIds ?? []).size || 0;
  const vacancies = Math.max(0, MAX_ROSTER_SIZE - rosterSize);
  if (vacancies <= 0 || !world.talentPool) return noVacancyResult();

  // Evaluate the strongest available candidate, not an arbitrary key.
  // Track the record key — RecruitmentAgent resolves candidates[candidateId].
  // Single pass preserves sort-then-first semantics: strict `>` keeps the
  // first entry among tied seeds, matching stable-sort order.
  let bestCandidateId: string | undefined;
  let bestSeed = -Infinity;
  for (const [id, c] of Object.entries(world.talentPool.candidates)) {
    if (c.availabilityState === "available") {
      const seed = c.talentSeed ?? 0;
      if (seed > bestSeed) {
        bestSeed = seed;
        bestCandidateId = id;
      }
    }
  }
  if (!bestCandidateId) return noVacancyResult();

  // Rival pressure: the hottest heya-rivalry pair this stable sits in.
  let rivalHeyaId: string | undefined;
  let maxHeat = -Infinity;
  for (const p of Object.values(world.rivalriesState?.heyaRivalryPairs ?? {})) {
    if (p.heyaAId === heyaId || p.heyaBId === heyaId) {
      if (p.heat > maxHeat) {
        maxHeat = p.heat;
        rivalHeyaId = p.heyaAId === heyaId ? p.heyaBId : p.heyaAId;
      }
    }
  }
  const recruitmentCtx: RecruitmentAgentContext = {
    oyakata,
    world,
    vacancyCount: vacancies,
    runwayBand: perception.runwayBand,
    funds: heya?.funds || 0,
    rosterSize,
    candidateId: bestCandidateId,
    rivalHeyaId,
  };
  const result = spawnRecruitmentAgent(recruitmentCtx);
  reasoning.push(...result.reasoning);
  return result;
}

/**
 * Applies side-effects of the accepted proposals/agent decisions to world
 * state: exhibition acceptance, kyujo withdrawals, and agent execution.
 */
export function buildWeeklyImpact(
  world: WorldState,
  heyaId: Id,
  ctx: WeeklyContext,
  proposals: WorkerProposals,
  agentDecisions: AgentDecisions | undefined
): StateImpact {
  const { oyakata } = ctx;
  const { globalProposal, personnelProposal } = proposals;
  const builder = createImpactBuilder("makeNPCWeeklyDecision");

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
      const nextPending = (world.pendingExhibitions || []).filter(
        (i) => i.id !== globalProposal.acceptedExhibitionId
      );
      builder.updateWorldField("pendingExhibitions", nextPending);
    }
  }

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

  if (agentDecisions && oyakata) {
    builder.merge(executeAgentDecisions(world, heyaId, agentDecisions, oyakata));
  }

  return builder.build();
}

/**
 * WS5 — map an oyakata's grudge list (heya or oyakata ids) onto live rivalry
 * pair keys: a rivalry counts when either side's rikishi fights for a grudged
 * heya or a heya whose oyakata is grudged.
 */
function grudgeRivalryKeys(world: WorldState, oyakata: Oyakata): string[] {
  const grudges = oyakata.grudges ?? [];
  if (grudges.length === 0) return [];
  const grudgedHeyas = new Set<Id>();
  for (const g of grudges) {
    if (world.heyas.has(g)) grudgedHeyas.add(g);
    else {
      const oya = world.oyakata.get(g);
      if (oya?.heyaId) grudgedHeyas.add(oya.heyaId);
    }
  }
  if (grudgedHeyas.size === 0) return [];
  const pairs = world.rivalriesState?.pairs ?? {};
  const keys: string[] = [];
  for (const [key, pair] of Object.entries(pairs)) {
    const a = world.rikishi.get(pair.aId);
    const b = world.rikishi.get(pair.bId);
    if ((a && grudgedHeyas.has(a.heyaId)) || (b && grudgedHeyas.has(b.heyaId))) {
      keys.push(key);
    }
  }
  return keys.sort();
}
