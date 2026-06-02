import type { WorldState } from "../types/world";
import type { OyakataArchetype, OyakataMood } from "../types/oyakata";
import type { Rikishi } from "../types/rikishi";
import type { Heya } from "../types/heya";
import type { Id } from "../types/common";
import { getOyakataStyleProfile } from "../oyakataStylePreferences";
import { TrainingIntensity, TrainingFocus, RecoveryEmphasis } from "../types/training";
import { TrainingService } from "../systems/training/TrainingService";
import { WorldCircuitService } from "../systems/global/WorldCircuitService";
import { getOyakataForHeya, getRikishi, getHeya } from "../queries";
import { createImpactBuilder } from "../core/ImpactBuilder";
import type { StateImpact } from "../core/StateImpact";
import type { PerceptionSnapshot } from "../perception";
import { getManagerPersona } from "../systems/NPCPersonaService";

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
} from "../npcAIWorkers";

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
} from "../agents";

import type { AgentDecisions, NPCWeeklyDecision } from "./types";

export function makeNPCWeeklyDecision(world: WorldState, heyaId: Id): NPCWeeklyDecision {
  const persona = getManagerPersona(world, heyaId);
  const perception = persona.perception;
  const reasoning: string[] = [];

  const heya = getHeya(world, heyaId);
  const oyakata = heya ? getOyakataForHeya(world, heyaId) : undefined;
  const styleProfile = oyakata ? getOyakataStyleProfile(world, oyakata) : undefined;
  const philosophy = styleProfile?.philosophy;

  const complianceCap = heya?.welfareState?.sanctions?.trainingIntensityCap;

  const trainingCtx: TrainingWorkerContext = {
    perception: rpPerception(perception),
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

  const scoutingCtx: ScoutingWorkerContext = {
    runwayBand: perception.runwayBand,
    rosterSize: perception.rosterSize,
    rosterStrengthBand: perception.rosterStrengthBand,
    ambition: persona.traits.ambition,
    hasSleeperScout: persona.quirks.includes("Sleeper Scout"),
  };
  const scoutingProposal = spawnScoutingWorker(scoutingCtx);
  reasoning.push(scoutingProposal.reason);

  const personnelCtx: PersonnelWorkerContext = {
    rikishiPerceptions: perception.rikishiPerceptions,
    welfareDiscipline: persona.welfareDiscipline,
    styleProfile,
    world,
  };
  const personnelProposal = spawnPersonnelWorker(personnelCtx);
  reasoning.push(...personnelProposal.reasoning);

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

  let agentDecisions: AgentDecisions | undefined;

  if (oyakata) {
    const financeCtx: FinanceAgentContext = {
      oyakata,
      world,
      runwayBand: perception.runwayBand,
      funds: heya?.funds || 0,
      monthlyBurn: heya?.monthlyBurnRate || 0,
    };
    const financeResult = spawnFinanceAgent(financeCtx);
    reasoning.push(...financeResult.reasoning);

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

    const rivalryCtx: RivalryAgentContext = {
      oyakata,
      activeRivalries: world.rivalries || {},
      currentMood: persona.mood,
    };
    const rivalryResult = spawnRivalryAgent(rivalryCtx);
    reasoning.push(...rivalryResult.reasoning);

    const topRikishi: Rikishi[] = [];
    for (const rikishiId of world.activeRikishiIds) {
      const r = world.rikishi.get(rikishiId);
      if (!r) continue;
      if (r.division === "makuuchi" || r.division === "juryo") {
        topRikishi.push(r);
        if (topRikishi.length >= 5) break;
      }
    }

    const narrativeCtx: NarrativeAgentContext = {
      oyakata,
      topRikishi,
      recentAchievements: world._recentAchievements || [],
      currentBashoPhase: world.bashoPhase || "interim",
    };
    const narrativeResult = spawnNarrativeAgent(narrativeCtx);
    reasoning.push(...narrativeResult.reasoning);

    let recruitmentResult = {
      maxBid: 0,
      shouldBid: false,
      bidStrategy: "conservative" as const,
      reasoning: ["[Recruitment Agent] No vacancies - skipping recruitment"],
      confidence: 0,
    };
    const rosterSize = heya?.rikishiIds?.length || 0;
    const vacancies = Math.max(0, 15 - rosterSize);
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
          candidateId: candidateIds[0],
        };
        recruitmentResult = spawnRecruitmentAgent(recruitmentCtx);
        reasoning.push(...recruitmentResult.reasoning);
      }
    }

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

    if (
      financeResult.riskLevel === "conservative" &&
      trainingProposal.trainingIntensity === "punishing"
    ) {
      trainingProposal.trainingIntensity = "intense";
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
  }

  if (persona.mood === "furious" && trainingProposal.trainingIntensity !== "punishing") {
    trainingProposal.trainingIntensity = "punishing";
    reasoning.push(
      "[Lead Review] Oyakata overrides: Ignoring worker caution, imposing punishing intensity due to fury."
    );
  }

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

  if (agentDecisions) {
    if (agentDecisions.finance.shouldBuyMyoseki) {
      builder.logEvent("NPC_DECISION", "finance", { heyaId, decision: "buy_myoseki" }, { heyaId });
    }
    if (agentDecisions.governance.shouldReduceScandal) {
      builder.logEvent(
        "NPC_DECISION",
        "governance",
        { heyaId, decision: "reduce_scandal" },
        { heyaId }
      );
    }
    if (agentDecisions.rivalry.escalateRivalry) {
      builder.logEvent(
        "NPC_DECISION",
        "rivalry",
        { heyaId, decision: "escalate_rivalry" },
        { heyaId }
      );
    }
    if (agentDecisions.narrative.shouldTriggerEvent) {
      builder.logEvent(
        "NPC_DECISION",
        "narrative",
        { heyaId, decision: "trigger_event", eventType: agentDecisions.narrative.eventType },
        { heyaId }
      );
    }
  }

  const decision: NPCWeeklyDecision = {
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

  applyPromotionAwareness(world, heyaId, decision);
  applyInjuryRiskReduction(world, heyaId, decision);

  return decision;
}

function applyPromotionAwareness(
  world: WorldState,
  heyaId: string,
  decision: NPCWeeklyDecision
): void {
  const heya = world.heyas.get(heyaId);
  if (!heya) return;

  for (const rikishiId of heya.rikishiIds ?? []) {
    const r = world.rikishi.get(rikishiId);
    if (!r || r.isRetired || r.injured) continue;

    const rank = r.rank?.toLowerCase() ?? "";

    if (rank === "ozeki") {
      const kadobanEntry = world.ozekiKadoban?.[rikishiId];
      const isKadoban = kadobanEntry?.isKadoban === true;

      if (isKadoban) {
        if (!decision.individualProtects.includes(rikishiId)) {
          decision.individualProtects = [...decision.individualProtects, rikishiId];
          decision.individualPushes = decision.individualPushes.filter((id) => id !== rikishiId);
          decision.individualDevelops = decision.individualDevelops.filter((id) => id !== rikishiId);
          decision.reasoning.push(
            `[PromotionAwareness] ${r.shikona ?? rikishiId} is Kadoban — added to protect list`
          );
        }
      } else {
        if (
          decision.trainingIntensity === "conservative" ||
          decision.trainingIntensity === "balanced"
        ) {
          decision.trainingIntensity = "intensive";
          decision.reasoning.push(
            `[PromotionAwareness] Ozeki in stable — raised training intensity to 'intensive' for Yokozuna run`
          );
        }
        if (!decision.individualPushes.includes(rikishiId)) {
          decision.individualPushes = [...decision.individualPushes, rikishiId];
          decision.reasoning.push(
            `[PromotionAwareness] ${r.shikona ?? rikishiId} is Ozeki — added to push list for Yokozuna run`
          );
        }
      }
    }

    if (rank === "sekiwake" || rank === "komusubi") {
      if (!decision.individualDevelops.includes(rikishiId)) {
        decision.individualDevelops = [...decision.individualDevelops, rikishiId];
        decision.reasoning.push(
          `[PromotionAwareness] ${r.shikona ?? rikishiId} is ${r.rank} — added to develop list as Ozeki candidate`
        );
      }
    }
  }
}

function applyInjuryRiskReduction(
  world: WorldState,
  heyaId: string,
  decision: NPCWeeklyDecision
): void {
  const heya = world.heyas.get(heyaId);
  if (!heya) return;

  let highRiskCount = 0;
  const protectIds: Id[] = [];

  for (const rikishiId of heya.rikishiIds ?? []) {
    const r = world.rikishi.get(rikishiId);
    if (!r || r.isRetired || r.injured) continue;

    const condition = r.condition ?? 100;
    const fatigue = r.fatigue ?? 0;
    const riskScore = (100 - condition) * 0.6 + fatigue * 0.4;

    if (riskScore > 60) {
      highRiskCount++;
      protectIds.push(rikishiId);
    }
  }

  const rosterSize = (heya.rikishiIds ?? []).length;
  if (rosterSize > 0 && highRiskCount / rosterSize > 0.4) {
    const intensity = decision.trainingIntensity;
    if (intensity === "punishing") {
      decision.trainingIntensity = "intensive";
      decision.reasoning.push(
        `[InjuryRisk] ${highRiskCount}/${rosterSize} rikishi at high risk — reduced intensity from 'punishing' to 'intensive'.`
      );
    } else if (intensity === "intensive") {
      decision.trainingIntensity = "balanced";
      decision.reasoning.push(
        `[InjuryRisk] ${highRiskCount}/${rosterSize} rikishi at high risk — reduced intensity from 'intensive' to 'balanced'.`
      );
    }
  }

  const existingProtects = new Set(decision.individualProtects);
  for (const id of protectIds) {
    if (!existingProtects.has(id)) {
      decision.individualProtects = [...decision.individualProtects, id];
      existingProtects.add(id);
      decision.individualPushes = decision.individualPushes.filter((pid) => pid !== id);
      decision.individualDevelops = decision.individualDevelops.filter((did) => did !== id);
    }
  }
}
