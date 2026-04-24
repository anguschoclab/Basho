/**
 * WorldCircuitService.ts
 * ======================
 * Manages overseas exhibition invitations, regional scouting presence,
 * and cultural friction mechanics.
 * (Phase 5: The World Circuit)
 */

import { WorldState } from "../../types/world";
import type { Rank } from "../../types/banzuke";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { StateImpact } from "../../core/StateImpact";
import { RNGRegistry } from "../../core/RNGRegistry";

export type ExhibitionRegion = "Mongolia" | "Georgia" | "Europe" | "Americas" | "East_Asia";

export interface ExhibitionInvitation {
  id: string;
  heyaId: string;
  region: ExhibitionRegion;
  prestige: number; // 1–100: affects reward magnitude
  expiresAtWeek: number;
  requiresRank?: Rank;
}

/** Presence thresholds. */
const PRESENCE_GATES = {
  VISIBLE_THRESHOLD: 40,
  ACADEMY_THRESHOLD: 80,
} as const;

/** Points gained per successful exhibition. Scales with prestige. */
const PRESENCE_GAIN_PER_WIN = 15;
const PRESENCE_GAIN_PER_LOSS = 5;

export const WorldCircuitService = {
  // ──────────────────────────────────────────────────────────────────────────
  // 1. Generate Yearly Invitations
  // ──────────────────────────────────────────────────────────────────────────

  generateYearlyInvitations(world: WorldState, heyaId: string): StateImpact {
    const builder = createImpactBuilder("generateYearlyInvitations");
    const heya = world.heyas.get(heyaId);
    if (!heya) return builder.build();

    const rng = RNGRegistry.getSystemRNG(world, "scouting", `exhibitions_${world.year}_${heyaId}`);
    const count = 1 + (rng.next() < 0.4 ? 1 : 0); // 1-2 invitations per year
    const regions: ExhibitionRegion[] = ["Mongolia", "Georgia", "Europe", "Americas", "East_Asia"];
    const invitations: ExhibitionInvitation[] = [];

    for (let i = 0; i < count; i++) {
      const region = rng.pick(regions);
      const existingPresence = heya.regionalPresence?.[region] ?? 0;
      // Higher existing presence → higher prestige invitations
      const prestige = Math.min(100, 20 + existingPresence + rng.int(0, 30));

      invitations.push({
        id: rng.uuid("EX"),
        heyaId,
        region,
        prestige,
        expiresAtWeek: (world.week ?? 0) + 8,
        requiresRank: prestige > 60 ? "sekiwake" : "maegashira",
      });
    }

    builder.logEvent(
      "NARRATIVE_CRISIS_TRIGGERED",
      "narrative",
      {
        eventId: "exhibition_invitation",
        title: "Overseas Exhibition Invitations",
        description: `Your stable has received ${count} international exhibition invitation(s).`,
        incident: `Cards from abroad: ${invitations.map((i) => i.region).join(", ")}.`,
        invitationCount: count,
        regions: invitations.map((i) => i.region).join(", "),
      },
      { heyaId, importance: "notable" }
    );

    // Store pending invitations in world state
    builder.appendToWorldArray("pendingExhibitions", invitations);

    return builder.build();
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Process Exhibition Result
  // ──────────────────────────────────────────────────────────────────────────

  processExhibitionResult(
    world: WorldState,
    heyaId: string,
    rikishiId: string,
    invitation: ExhibitionInvitation
  ): StateImpact {
    const builder = createImpactBuilder("processExhibitionResult");
    const heya = world.heyas.get(heyaId);
    const rikishi = world.rikishi.get(rikishiId);
    if (!heya || !rikishi) return builder.build();

    const rng = RNGRegistry.getSystemRNG(
      world,
      "scouting",
      `exhibition_result_${world.week}_${rikishiId}`
    );

    // Simulate result: rikishi's combined stats vs. generated regional champion
    const rikishiPower =
      ((rikishi.technique || 50) + (rikishi.speed || 50) + (rikishi.mental || 50)) / 3;
    const regionalChampion = 50 + invitation.prestige / 2; // prestige 50 → opponent CA ~75
    const win = rng.next() < rikishiPower / (rikishiPower + regionalChampion);

    const presenceGain = win ? PRESENCE_GAIN_PER_WIN : PRESENCE_GAIN_PER_LOSS;
    const currentPresence = heya.regionalPresence?.[invitation.region] ?? 0;
    const newPresence = Math.min(100, currentPresence + presenceGain);

    // Update regional presence
    builder.updateHeya(heyaId, {
      regionalPresence: {
        ...(heya.regionalPresence || {}),
        [invitation.region]: newPresence,
      },
    });

    // Cultural friction: 4-week training de-buff on return
    if (!win || invitation.prestige > 60) {
      builder.logEvent(
        "TRAINING_UPDATE",
        "training",
        {
          rikishiId,
          heyaId,
          shikona: rikishi.shikona,
          incident: "cultural_friction",
          status: "debuff",
          score: -5,
        },
        { rikishiId }
      );
    }

    builder.logEvent(
      "GOVERNANCE_RULING",
      "discipline",
      {
        incident: win ? "exhibition_victory" : "exhibition_defeat",
        status: win ? "success" : "failure",
        reason: `${rikishi.shikona} competed in the ${invitation.region} Exhibition.`,
        score: newPresence,
      },
      { heyaId, importance: "notable" }
    );

    // Check academy unlock
    if (
      newPresence >= PRESENCE_GATES.ACADEMY_THRESHOLD &&
      currentPresence < PRESENCE_GATES.ACADEMY_THRESHOLD
    ) {
      builder.logEvent(
        "NARRATIVE_CRISIS_TRIGGERED",
        "narrative",
        {
          eventId: "academy_unlocked",
          title: `${invitation.region} Academy Available`,
          description: `Your reputation in ${invitation.region} is now high enough to construct a Foreign Academy there.`,
          incident: `Build a Foreign Academy in ${invitation.region} to generate elite regional candidates.`,
        },
        { heyaId, importance: "headline" }
      );
    }

    return builder.build();
  },

  /**
   * Gets the candidate visibility gate for a given region.
   */
  getRegionVisibility(
    heya: { regionalPresence?: Record<string, number> },
    region: string
  ): "hidden" | "visible" | "academy" {
    const score = heya.regionalPresence?.[region] ?? 0;
    if (score >= PRESENCE_GATES.ACADEMY_THRESHOLD) return "academy";
    if (score >= PRESENCE_GATES.VISIBLE_THRESHOLD) return "visible";
    return "hidden";
  },

  hasForeignAcademy(world: WorldState, heyaId: string, region: ExhibitionRegion): boolean {
    const heya = world.heyas.get(heyaId);
    if (!heya) return false;
    return this.getRegionVisibility(heya, region) === "academy";
  },

  /**
   * Applies "Style Drift" to a heya based on its international presence.
   * (Phase 5: Cultural Friction & Dynasty Drift)
   */
  applyStyleDrift(world: WorldState, heyaId: string): StateImpact {
    const builder = createImpactBuilder("applyStyleDrift");
    const heya = world.heyas.get(heyaId);
    if (!heya || !heya.regionalPresence) return builder.build();

    const regions = Object.keys(heya.regionalPresence) as ExhibitionRegion[];
    if (regions.length === 0) return builder.build();

    // Find the region with the highest presence
    let dominantRegion = regions[0];
    let maxPresence = 0;
    for (const r of regions) {
      if ((heya.regionalPresence[r] || 0) > maxPresence) {
        maxPresence = heya.regionalPresence[r] || 0;
        dominantRegion = r;
      }
    }

    if (maxPresence < PRESENCE_GATES.VISIBLE_THRESHOLD) return builder.build();

    // Small weekly drift towards regional philosophy
    // This could modify the heya's trainingPhilosophy or just log a trend
    const currentPhilosophy = heya.trainingPhilosophy || { 
      focusBias: "balanced",
      intensityBias: "moderate",
      recruitmentBias: "domestic",
      powerBias: 0, 
      techniqueBias: 0, 
      speedBias: 0 
    };

    const nextPhilosophy = { ...currentPhilosophy };
    const driftAmount = 0.02 * (maxPresence / 100);

    switch (dominantRegion) {
      case "Mongolia":
        nextPhilosophy.speedBias = (nextPhilosophy.speedBias || 0) + driftAmount;
        nextPhilosophy.powerBias = (nextPhilosophy.powerBias || 0) - driftAmount * 0.5;
        break;
      case "Georgia":
        nextPhilosophy.powerBias = (nextPhilosophy.powerBias || 0) + driftAmount;
        nextPhilosophy.techniqueBias = (nextPhilosophy.techniqueBias || 0) - driftAmount * 0.5;
        break;
      case "Europe":
        nextPhilosophy.techniqueBias = (nextPhilosophy.techniqueBias || 0) + driftAmount;
        nextPhilosophy.speedBias = (nextPhilosophy.speedBias || 0) - driftAmount * 0.5;
        break;
      case "Americas":
        nextPhilosophy.powerBias = (nextPhilosophy.powerBias || 0) + driftAmount * 0.7;
        nextPhilosophy.speedBias = (nextPhilosophy.speedBias || 0) - driftAmount * 0.3;
        break;
      case "East_Asia":
        nextPhilosophy.techniqueBias = (nextPhilosophy.techniqueBias || 0) + driftAmount * 0.7;
        nextPhilosophy.powerBias = (nextPhilosophy.powerBias || 0) - driftAmount * 0.3;
        break;
    }

    builder.updateHeya(heyaId, { trainingPhilosophy: nextPhilosophy });

    if (world.week % 4 === 0) {
      builder.logEvent(
        "NARRATIVE_STRATEGY_SHIFT",
        "narrative",
        {
          heyaId,
          region: dominantRegion,
          incident: "style_drift_observation",
          status: "trending",
          detail: `The training methods at ${heya.name} are showing a distinct ${dominantRegion} influence.`,
        },
        { heyaId, importance: "minor" }
      );
    }

    return builder.build();
  },
};