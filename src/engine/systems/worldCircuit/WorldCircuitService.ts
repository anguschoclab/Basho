/**
 * WorldCircuitService.ts
 * ======================
 * Manages overseas exhibition invitations, regional scouting presence,
 * and cultural friction mechanics.
 * (Phase 5: The World Circuit)
 */

import { WorldState } from "../../types/world";
import type { Rank } from "../../types/banzuke";
import type { AcademyConfig } from "../../types/academy";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { StateImpact } from "../../core/StateImpact";
import { RNGRegistry } from "../../core/RNGRegistry";
import { getHeya, getRikishi } from "../../queries";

export type ExhibitionRegion = "Mongolia" | "Georgia" | "Europe" | "Americas" | "East_Asia";

interface ExhibitionInvitation {
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
    const heya = getHeya(world, heyaId);
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
    const heya = getHeya(world, heyaId);
    const rikishi = getRikishi(world, rikishiId);
    if (!heya || !rikishi) return builder.build();

    const rng = RNGRegistry.getSystemRNG(
      world,
      "scouting",
      `exhibition_result_${world.week}_${rikishiId}`
    );

    // Simulate result: rikishi's combined stats vs. generated regional champion
    const rikishiPower =
      ((rikishi.stats.technique ?? 50) +
        (rikishi.stats.speed ?? 50) +
        (rikishi.stats.mental ?? 50)) /
      3;
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
    const heya = getHeya(world, heyaId);
    if (!heya) return false;
    // Academy is "had" if either built (in foreignAcademies) or presence is at academy threshold
    const hasBuilt = (heya.foreignAcademies ?? []).some((a) => a.region === region);
    const hasPresence = this.getRegionVisibility(heya, region) === "academy";
    return hasBuilt || hasPresence;
  },

  /**
   * Build a foreign academy in a region where the heya has sufficient presence.
   * Requires presence >= ACADEMY_THRESHOLD (80). Refuses duplicates.
   */
  buildForeignAcademy(
    world: WorldState,
    heyaId: string,
    region: ExhibitionRegion
  ): StateImpact {
    const builder = createImpactBuilder("buildForeignAcademy");
    const heya = getHeya(world, heyaId);
    if (!heya) return builder.build();

    const presence = heya.regionalPresence?.[region] ?? 0;
    if (presence < PRESENCE_GATES.ACADEMY_THRESHOLD) return builder.build();

    // Check for duplicate
    const existing = heya.foreignAcademies ?? [];
    if (existing.some((a) => a.region === region)) return builder.build();

    const academy = {
      region,
      builtAtYear: world.year,
      builtAtWeek: world.week ?? 0,
      candidateQualityBonus: 5 + Math.floor(presence / 20),
    };

    builder.updateHeya(heyaId, {
      foreignAcademies: [...existing, academy],
    });

    builder.logEvent(
      "NARRATIVE_CRISIS_TRIGGERED",
      "narrative",
      {
        eventId: "academy_built",
        title: `${region} Academy Established`,
        description: `${heya.name} has established a Foreign Academy in ${region}.`,
        incident: `Elite regional candidates from ${region} will now be available for recruitment.`,
        region,
      },
      { heyaId, importance: "headline" }
    );

    return builder.build();
  },

  /**
   * Applies "Style Drift" to a heya based on its international presence.
   * (Phase 5: Cultural Friction & Dynasty Drift)
   */
  applyStyleDrift(world: WorldState, heyaId: string): StateImpact {
    const builder = createImpactBuilder("applyStyleDrift");
    const heya = getHeya(world, heyaId);
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
      speedBias: 0,
    };

    const nextPhilosophy = { ...currentPhilosophy };
    const driftAmount = 0.02 * (maxPresence / 100);

    const DRIFT_HANDLERS: Record<ExhibitionRegion, () => void> = {
      Mongolia: () => {
        nextPhilosophy.speedBias = (nextPhilosophy.speedBias ?? 0) + driftAmount;
        nextPhilosophy.powerBias = (nextPhilosophy.powerBias ?? 0) - driftAmount * 0.5;
      },
      Georgia: () => {
        nextPhilosophy.powerBias = (nextPhilosophy.powerBias ?? 0) + driftAmount;
        nextPhilosophy.techniqueBias = (nextPhilosophy.techniqueBias ?? 0) - driftAmount * 0.5;
      },
      Europe: () => {
        nextPhilosophy.techniqueBias = (nextPhilosophy.techniqueBias ?? 0) + driftAmount;
        nextPhilosophy.speedBias = (nextPhilosophy.speedBias ?? 0) - driftAmount * 0.5;
      },
      Americas: () => {
        nextPhilosophy.powerBias = (nextPhilosophy.powerBias ?? 0) + driftAmount * 0.7;
        nextPhilosophy.speedBias = (nextPhilosophy.speedBias ?? 0) - driftAmount * 0.3;
      },
      East_Asia: () => {
        nextPhilosophy.techniqueBias = (nextPhilosophy.techniqueBias ?? 0) + driftAmount * 0.7;
        nextPhilosophy.powerBias = (nextPhilosophy.powerBias ?? 0) - driftAmount * 0.3;
      },
    };

    const handler = DRIFT_HANDLERS[dominantRegion];
    if (handler) handler();

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

/**
 * Manage a foreign academy — adjust budget (quality bonus) and optionally hire staff.
 * Unified management function per plan Feature 11.
 */
export function manageAcademy(
  world: WorldState,
  heyaId: string,
  region: ExhibitionRegion,
  config: AcademyConfig
): StateImpact {
  const builder = createImpactBuilder("manageAcademy");

  const heya = getHeya(world, heyaId);
  if (!heya) return builder.build();

  const academies = heya.foreignAcademies ?? [];
  const academy = academies.find((a) => a.region === region);
  if (!academy) return builder.build();

  // Update the academy's quality bonus based on budget investment
  const updatedAcademies = academies.map((a) =>
    a.region === region
      ? {
          ...a,
          candidateQualityBonus: a.candidateQualityBonus + Math.floor(config.budget / 50_000),
        }
      : a
  );

  builder.updateHeya(heyaId, { foreignAcademies: updatedAcademies });

  // Deduct budget from heya funds
  if (config.budget > 0) {
    builder.updateHeya(heyaId, { funds: Math.max(0, heya.funds - config.budget) });
  }

  builder.logEvent(
    "GOVERNANCE_RULING",
    "discipline",
    {
      incident: "academy_managed",
      status: "success",
      reason: `${heya.name} invested ¥${config.budget.toLocaleString()} in ${region} academy.`,
      score: updatedAcademies.find((a) => a.region === region)?.candidateQualityBonus ?? 0,
    },
    { heyaId, importance: "minor" }
  );

  return builder.build();
}
