// @ts-nocheck
/**
 * CrisisService.ts
 * ================
 * Orchestrates random narrative "Crises" and events during the weekly tick.
 * (Phase 4: Media, Narratives & Faction Power)
 */

import { WorldState } from "../../types/world";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { StateImpact } from "../../core/StateImpact";
import { RNGRegistry } from "../../core/RNGRegistry";

export interface CrisisChoice {
  id: string;
  label: string;
  impactGenerator: (world: WorldState) => StateImpact;
}

export interface CrisisEvent {
  id: string;
  title: string;
  description: string;
  choices: CrisisChoice[];
}

export const CrisisService = {
  /**
   * Probability of a crisis event triggering per week.
   */
  TRIGGER_PROBABILITY: 0.12,

  /**
   * Main entry point for the weekly crisis check.
   */
  checkForWeeklyCrisis(world: WorldState): StateImpact {
    const builder = createImpactBuilder("checkForWeeklyCrisis");
    const rng = RNGRegistry.getSystemRNG(world, "narrative", `crisis_roll_${world.week}`);

    if (rng.next() > this.TRIGGER_PROBABILITY) return builder.build();

    // Select a random event from the registry
    const event = this.rollEvent(world);
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

    // For now, we'll store the pending event in the world state
    builder.updateWorldField("pendingCrisis", event);

    return builder.build();
  },

  rollEvent(world: WorldState): CrisisEvent | null {
    const rng = RNGRegistry.getSystemRNG(world, "narrative", `crisis_select_${world.week}`);
    const events = this.getRegistry();
    return events[rng.int(0, events.length - 1)];
  },

  getRegistry(): CrisisEvent[] {
    return [
      {
        id: "stomach_flu",
        title: "Stomach Flu Outbreak",
        description:
          "A nasty virus is sweeping through the stables. Several rikishi are showing symptoms.",
        choices: [
          {
            id: "quarantine",
            label: "Quarantine & Rest",
            impactGenerator: () => {
              const b = createImpactBuilder("stomach_flu_quarantine");
              // Penalty to training for everyone, but prevents spread
              return b.build();
            },
          },
          {
            id: "push_through",
            label: "Push Through",
            impactGenerator: () => {
              const b = createImpactBuilder("stomach_flu_push");
              // Risk of severe injury or performance drop
              return b.build();
            },
          },
        ],
      },
      {
        id: "dojo_duel",
        title: "The Dojo Challenge",
        description:
          "A rival stable master has criticized your training methods and challenged your top rikishi to a private duel.",
        choices: [
          {
            id: "accept",
            label: "Accept the Challenge",
            impactGenerator: () => {
              const b = createImpactBuilder("dojo_duel_accept");
              b.logEvent("OYAKATA_MOOD_SHIFT", "narrative", { newMood: "furious" });
              return b.build();
            },
          },
          {
            id: "decline",
            label: "Ignore the Distraction",
            impactGenerator: () => {
              const b = createImpactBuilder("dojo_duel_decline");
              return b.build();
            },
          },
        ],
      },
    ];
  },
};