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

import { ActiveCrisis, CrisisOption } from "../../types/crises";

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

  rollEvent(world: WorldState): ActiveCrisis | null {
    const rng = RNGRegistry.getSystemRNG(world, "narrative", `crisis_select_${world.week}`);
    const events = this.getRegistry();
    return events[rng.int(0, events.length - 1)];
  },

  getRegistry(): ActiveCrisis[] {
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
            impactGenerator: (world) => {
              const b = createImpactBuilder("stomach_flu_quarantine");
              // Penalty to training for everyone, but prevents spread
              return b.build();
            },
          },
          {
            id: "push_through",
            label: "Push Through",
            impactGenerator: (world) => {
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
        options: [
          {
            id: "accept",
            label: "Accept the Challenge",
            impactGenerator: (world) => {
              const b = createImpactBuilder("dojo_duel_accept");
              b.logEvent("OYAKATA_MOOD_SHIFT", "narrative", { newMood: "furious" });
              return b.build();
            },
          },
          {
            id: "decline",
            label: "Ignore the Distraction",
            impactGenerator: (world) => {
              const b = createImpactBuilder("dojo_duel_decline");
              return b.build();
            },
          },
        ],
      },
      {
        id: "scandal_nightlife",
        title: "Nightlife Scandal",
        description: "A popular rikishi was spotted at a late-night club during a strict training period.",
        options: [
          {
            id: "suspend",
            label: "Issue Suspension",
            impactGenerator: (world) => {
              const b = createImpactBuilder("scandal_suspend");
              b.logEvent("GOVERNANCE_RULING", "discipline", { status: "suspended" });
              return b.build();
            },
          },
          {
            id: "defend",
            label: "Publicly Defend",
            impactGenerator: (world) => {
              const b = createImpactBuilder("scandal_defend");
              b.logEvent("OYAKATA_MOOD_SHIFT", "narrative", { newMood: "stubborn" });
              return b.build();
            },
          },
        ],
      },
      {
        id: "sponsorship_friction",
        title: "Sponsorship Tension",
        description: "A major sponsor is unhappy with the stable's recent public image and is threatening to pull funding.",
        options: [
          {
            id: "renegotiate",
            label: "Renegotiate Terms",
            impactGenerator: (world) => {
              const b = createImpactBuilder("sponsor_renegotiate");
              return b.build();
            },
          },
          {
            id: "call_bluff",
            label: "Call Their Bluff",
            impactGenerator: (world) => {
              const b = createImpactBuilder("sponsor_bluff");
              return b.build();
            },
          },
        ],
      },
      {
        id: "injury_training",
        title: "Training Mishap",
        description: "A freak accident during the morning practice has left several rikishi shaken and one potentially injured.",
        options: [
          {
            id: "halt_training",
            label: "Halt Training",
            impactGenerator: (world) => {
              const b = createImpactBuilder("training_halt");
              return b.build();
            },
          },
          {
            id: "continue",
            label: "Continue with Caution",
            impactGenerator: (world) => {
              const b = createImpactBuilder("training_continue");
              return b.build();
            },
          },
        ],
      },
      {
        id: "media_firestorm",
        title: "Media Firestorm",
        description: "A journalist is preparing an expose on the 'toxic culture' within the modern sumo stables.",
        options: [
          {
            id: "exclusive",
            label: "Offer Exclusive Interview",
            impactGenerator: (world) => {
              const b = createImpactBuilder("media_exclusive");
              return b.build();
            },
          },
          {
            id: "no_comment",
            label: "No Comment",
            impactGenerator: (world) => {
              const b = createImpactBuilder("media_no_comment");
              return b.build();
            },
          },
        ],
      },
      {
        id: "governance_audit",
        title: "Compliance Audit",
        description: "The Sumo Association has announced a surprise audit of stable welfare and financial records.",
        options: [
          {
            id: "cooperate",
            label: "Full Cooperation",
            impactGenerator: (world) => {
              const b = createImpactBuilder("audit_cooperate");
              return b.build();
            },
          },
          {
            id: "stonewall",
            label: "Stonewall",
            impactGenerator: (world) => {
              const b = createImpactBuilder("audit_stonewall");
              return b.build();
            },
          },
        ],
      },
    ];
  },
};