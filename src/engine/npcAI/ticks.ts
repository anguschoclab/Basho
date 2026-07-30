import type { WorldState } from "../types/world";
import type { Id } from "../types/common";
import { getAvailableStables } from "../selectors";
import { stableSort } from "../utils/sort";
import { createImpactBuilder } from "../core/ImpactBuilder";
import type { StateImpact } from "../core/StateImpact";
import { TrainingService } from "../systems/training/TrainingService";
import { getManagerPersona } from "../systems/NPCPersonaService";
import { evaluateFinanceStrategy } from "../strategy/NPCFinanceCalculator";
import { getRecruitmentStrategy } from "../npcRecruitmentStrategy";
import { getRetirementStrategy } from "../npcRetirementStrategy";
import { getSponsorStrategy } from "../npcSponsorStrategy";
import { evaluateGovernanceStrategy } from "../strategy/NPCGovernanceCalculator";
import * as talentpool from "../systems/generation/TalentPoolService";
import { enforceHardCapRosterOverflow } from "../overflow";
import { getRikishi } from "../queries";
import { WEIGHT_JOURNEY_STALL_THRESHOLD } from "../training/WeightJourney";

import type { NPCWeeklyDecision } from "./types";
import { makeNPCWeeklyDecision } from "./weekly";

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
    (f: { rikishiId: string; focusType: string }) => !allManagedIds.has(f.rikishiId)
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

export function tickWeekNPC(world: WorldState): StateImpact {
  const builder = createImpactBuilder("tickWeekNPC");

  const playerHeyaId = world.playerHeyaId;
  const scoutingMap: Record<Id, "none" | "passive" | "active" | "aggressive"> = {
    ...(world.npcScoutingPriorities || {}),
  };

  for (const heya of getAvailableStables(world)) {
    if (heya.id === playerHeyaId) continue;

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
  builder.merge(enforceHardCapRosterOverflow(world));

  return builder.build();
}

export function tickMonthlyNPC(world: WorldState): StateImpact {
  const builder = createImpactBuilder("tickMonthlyNPC");
  const playerHeyaId = world.playerHeyaId;
  const vacanciesByHeyaId: Record<Id, number> = {};
  let hasVacancies = false;

  const candidateHeyas = getAvailableStables(world).filter(
    (h) => h.id !== playerHeyaId && h.oyakataId && world.oyakata.has(h.oyakataId)
  );

  const sortedHeyas = stableSort(candidateHeyas, (h) => h.id);

  for (const heya of sortedHeyas) {
    const oyakata = world.oyakata.get(heya.oyakataId!)!;

    // Check for stalled weight journeys due to low funds
    if (heya.funds < WEIGHT_JOURNEY_STALL_THRESHOLD) {
      for (const rikishiId of heya.rikishiIds ?? []) {
        const r = getRikishi(world, rikishiId);
        if (r?.weightJourney?.stalled === true) {
          builder.logEvent(
            "FINANCIAL_ALERT",
            "economy",
            {
              decision: "weight_journey_funding_awareness",
              heyaId: heya.id,
              rikishiId,
              funds: heya.funds,
            },
            { heyaId: heya.id, importance: "notable" }
          );
          break;
        }
      }
    }

    builder.merge(evaluateFinanceStrategy({ world, heya, oyakata }));

    const sponsorStrat = getSponsorStrategy(oyakata.archetype);
    builder.merge(sponsorStrat.evaluateSponsorRecruitment(world, heya, oyakata));

    const retirementStrat = getRetirementStrategy(oyakata.archetype);
    builder.merge(retirementStrat.evaluateRetirements(world, heya, oyakata));

    const recruitmentStrat = getRecruitmentStrategy(oyakata.archetype);
    const { impact: recruitmentImpact, count: vacancies } = recruitmentStrat.evaluateVacancies(
      world,
      heya,
      oyakata
    );
    builder.merge(recruitmentImpact);

    builder.merge(evaluateGovernanceStrategy({ world, heya, oyakata }));

    if (vacancies > 0) {
      vacanciesByHeyaId[heya.id] = vacancies;
      hasVacancies = true;
    }
  }

  if (hasVacancies) {
    builder.merge(talentpool.fillVacanciesForNPCWithBidding(world, vacanciesByHeyaId));
  }

  return builder.build();
}

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
