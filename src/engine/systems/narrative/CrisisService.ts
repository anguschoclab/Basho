/**
 * CrisisService.ts
 * ================
 * Orchestrates random narrative "Crises" and events during the weekly tick.
 * (Phase 4: Media, Narratives & Faction Power)
 *
 * The event registry lives in ./crisisRegistry; this service owns the
 * weekly trigger roll and the pendingCrisis hand-off to the UI.
 */

import { WorldState } from "../../types/world";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { StateImpact } from "../../core/StateImpact";
import { RNGRegistry } from "../../core/RNGRegistry";
import { getCrisisRegistry } from "./crisisRegistry";

import { ActiveCrisis } from "../../types/crises";

/**
 * Probability of a crisis event triggering per week.
 */
const TRIGGER_PROBABILITY = 0.12;

/**
 * Main entry point for the weekly crisis check.
 */
function checkForWeeklyCrisis(world: WorldState): StateImpact {
  const builder = createImpactBuilder("checkForWeeklyCrisis");
  // pendingCrisis is an interactive player gate — suppress during autonomous
  // sims, matching evaluatePendingDecisions' _autonomousSim guard.
  if (world._autonomousSim) return builder.build();
  const rng = RNGRegistry.getSystemRNG(world, "narrative", `crisis_roll_${world.week}`);

  if (rng.next() > TRIGGER_PROBABILITY) return builder.build();

  // Select a random event from the registry
  const event = rollEvent(world);
  if (!event) return builder.build();

  // In a real implementation, we would register this event in a
  // "pendingChoices" queue in the world state for the UI to consume.
  builder.logEvent(
    "NARRATIVE_CRISIS_TRIGGERED",
    "narrative",
    {
      eventId: event.id,
      title: event.title,
      description: event.description,
      incident: `An unexpected situation has developed: ${event.title}`,
    },
    { importance: "major" }
  );

  // Store only serializable fields — the registry options carry
  // `impactGenerator` functions which cannot survive structuredClone
  // (worker WORLD_UPDATED postMessage) or JSON save/load. Resolution
  // re-derives the generator from the registry by crisis id.
  builder.updateWorldField("pendingCrisis", {
    ...event,
    options: event.options.map(({ id, label, description }) => ({ id, label, description })),
  });

  return builder.build();
}

function rollEvent(world: WorldState): ActiveCrisis | null {
  const rng = RNGRegistry.getSystemRNG(world, "narrative", `crisis_select_${world.week}`);
  const events = getCrisisRegistry();
  return events[rng.int(0, events.length - 1)];
}

export const CrisisService = {
  TRIGGER_PROBABILITY,
  checkForWeeklyCrisis,
  rollEvent,
  getRegistry: getCrisisRegistry,
};
