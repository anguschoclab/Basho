import type { WorldState } from "../types/world";
import type { Id } from "../types/common";
import { getHeya, getOyakataForHeya } from "../queries";
import { createImpactBuilder } from "../core/ImpactBuilder";
import type { StateImpact } from "../core/StateImpact";

import {
  spawnCrisisAgent,
  spawnMediaAgent,
  type CrisisAgentContext,
  type MediaAgentContext,
} from "../agents";

import type { PerceptionSnapshot } from "../perception";

export function handleNPCCrisis(
  world: WorldState,
  heyaId: Id,
  crisis: import("../types/crises").ActiveCrisis
): { choiceId: string; reasoning: string[]; impact: StateImpact } {
  const builder = createImpactBuilder("handleNPCCrisis");
  const heya = getHeya(world, heyaId);
  const oyakata = heya ? getOyakataForHeya(world, heyaId) : undefined;

  if (!oyakata || !heya) {
    return {
      choiceId: crisis.options[0]?.id || "default",
      reasoning: ["No oyakata found"],
      impact: builder.build(),
    };
  }

  const crisisCtx: CrisisAgentContext = {
    crisis,
    oyakata,
    heyaId,
    world,
    currentMood: oyakata.mood,
  };

  const crisisResult = spawnCrisisAgent(crisisCtx);

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

export function handleNPCMediaEvent(
  world: WorldState,
  heyaId: Id,
  eventId: string,
  eventType: string,
  severity: "minor" | "moderate" | "major"
): {
  response: "apologize" | "deny" | "ignore" | "deflect";
  reasoning: string[];
  impact: StateImpact;
} {
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

  if (memory.observations.length > 10) {
    memory.observations.sort((a, b) => b.importance - a.importance);
    memory.observations = memory.observations.slice(0, 10);
  }

  memory.lastConsolidationTick = tick;

  builder.updateOyakata(oyakata.id, { memory });

  return builder.build();
}
