import type { WorldState } from "../types/world";
import { DEFAULT_START_YEAR } from "../../constants/engine/calendar";
import type { Id } from "../types/common";
import { getAvailableStables } from "../selectors";
import { stableSort } from "../utils/sort";
import { createImpactBuilder } from "../core/ImpactBuilder";
import type { StateImpact } from "../core/StateImpact";
import { getManagerPersona } from "../systems/NPCPersonaService";
import { evaluateFinanceStrategy } from "../strategy/NPCFinanceCalculator";
import { getRecruitmentStrategy } from "../npcRecruitmentStrategy";
import { getRetirementStrategy } from "../npcRetirementStrategy";
import { getSponsorStrategy } from "../npcSponsorStrategy";
import { evaluateGovernanceStrategy } from "../strategy/NPCGovernanceCalculator";
import * as talentpool from "../systems/generation/TalentPoolService";
import { getRikishi } from "../queries";
import { WEIGHT_JOURNEY_STALL_THRESHOLD } from "../training/WeightJourney";

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
    const oyakata = world.oyakata.get(heya.oyakataId ?? "");
    if (!oyakata) continue;

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
          year: world.year ?? DEFAULT_START_YEAR,
          strategy: "rebuild",
          ambition: persona.traits.ambition,
        },
        { heyaId: heya.id, importance: "minor" }
      );
    }
  }

  return builder.build();
}
