// MediaEventService.ts — Event-driven media operations.
// Handles handleMediaEvent, evaluateScandals, generateGovernanceHeadline,
// and processMediaDecision.

import type { WorldState } from "../../types/world";
import { MediaHeadline, HeadlineTier } from "../../types/media";
import type { GovernanceRuling } from "../../types/economy";
import { rngForWorld } from "../../rng";
import { BardEngine } from "../../bard/BardEngine";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { getHeya } from "../../queries";

/**
 * Generates a headline for a governance or welfare event using the BardEngine.
 * Returns StateImpact describing headline generation instead of mutating state directly.
 */
export function generateGovernanceHeadline(args: {
  world: WorldState;
  heyaId: string;
  templatePath: string; // e.g., 'institutional.welfare.watch_headline'
  severity?: HeadlineTier;
}): StateImpact {
  const { world, heyaId, templatePath, severity = "local" } = args;
  const builder = createImpactBuilder("generateGovernanceHeadline");

  if (!world.mediaState || !world.mediaState.headlines) return builder.build();

  const heya = getHeya(world, heyaId);
  const context = {
    heyaname: heya?.name ?? "Heya",
    heya: heya?.name ?? "Heya",
  };

  const week = world.week ?? 0;
  const rng = rngForWorld(world, "media", `gov::${heyaId}::${templatePath}::${week}`);

  // Resolve title from archive
  const { text: title } = BardEngine.resolve(rng, templatePath, context);

  const headline: MediaHeadline = {
    id: rng.uuid("MH"),
    week,
    tier: severity,
    beat: templatePath.includes("welfare") ? "discipline" : "controversy",
    tone: severity === "main_event" || severity === "national" ? "controversy" : "neutral",
    rikishiIds: [],
    heyaIds: [heyaId],
    title,
    subtitle: "", // Optional for now
    impact: severity === "main_event" ? 60 : severity === "national" ? 40 : 20,
    tags: ["governance", "institutional"],
  };

  // Update media state with new headline
  const updatedHeadlines = [...world.mediaState.headlines, headline];
  if (updatedHeadlines.length > 250) updatedHeadlines.shift();

  builder.updateWorldField("mediaState", {
    ...world.mediaState,
    headlines: updatedHeadlines,
    heyaPressure: {
      ...world.mediaState.heyaPressure,
      [heyaId]: Math.min(100, (world.mediaState.heyaPressure[heyaId] ?? 0) + headline.impact / 2),
    },
  });

  return builder.build();
}

/**
 * Handles a media event choice and applies its effects.
 * Returns StateImpact describing event handling instead of mutating state directly.
 * Note: governanceLog updates are handled separately as it's not a supported world field in ImpactBuilder.
 */
export function handleMediaEvent(world: WorldState, eventId: string, choice: string): StateImpact {
  const builder = createImpactBuilder("handleMediaEvent");

  if (!world.mediaState) return builder.build();

  // Find the event in the governance log or media state
  const eventIndex = world.governanceLog?.findIndex((r) => r.id === eventId);
  if (eventIndex !== undefined && eventIndex >= 0 && world.governanceLog) {
    // Update the ruling with the player's choice via ImpactBuilder
    const ruling = world.governanceLog[eventIndex] as GovernanceRuling;
    const updatedRuling: GovernanceRuling = {
      ...ruling,
      playerChoice: choice,
      playerResponse: `Player chose: ${choice}`,
    };

    // Replace the ruling in governanceLog by updating the entire array
    const updatedGovernanceLog = [...world.governanceLog];
    updatedGovernanceLog[eventIndex] = updatedRuling;
    builder.updateWorldField("governanceLog", updatedGovernanceLog);
  }

  // Apply choice effects to media state
  // Different choices could affect heat/pressure differently
  const updatedMediaHeat = { ...world.mediaState.mediaHeat };
  const updatedHeyaPressure = { ...world.mediaState.heyaPressure };

  if (choice === "apologize") {
    // Apologizing reduces heat but may hurt reputation
    // ⚡ Bolt Optimization: Replace Object.entries() with for...in loop to avoid O(N) tuple allocations
    for (const id in world.mediaState.mediaHeat) {
      if (!Object.prototype.hasOwnProperty.call(world.mediaState.mediaHeat, id)) continue;
      updatedMediaHeat[id] = Math.max(0, (world.mediaState.mediaHeat[id] as number) - 5);
    }
  } else if (choice === "deny") {
    // Denying may increase pressure
    // ⚡ Bolt Optimization: Replace Object.entries() with for...in loop to avoid O(N) tuple allocations
    for (const id in world.mediaState.heyaPressure) {
      if (!Object.prototype.hasOwnProperty.call(world.mediaState.heyaPressure, id)) continue;
      updatedHeyaPressure[id] = Math.min(100, (world.mediaState.heyaPressure[id] as number) + 5);
    }
  } else if (choice === "ignore") {
    // Ignoring has no immediate effect but may cause decay
    // Natural decay will happen in weekly boundary
  }

  builder.updateWorldField("mediaState", {
    ...world.mediaState,
    mediaHeat: updatedMediaHeat,
    heyaPressure: updatedHeyaPressure,
  });

  return builder.build();
}

/**
 * Evaluates active scandals and applies ongoing pressure/heat effects.
 * Called every week during the media tick to keep scandal dynamics alive.
 * Returns StateImpact describing scandal evaluation instead of mutating state directly.
 */
export function evaluateScandals(world: WorldState): StateImpact {
  const builder = createImpactBuilder("evaluateScandals");

  if (!world.mediaState) return builder.build();

  // Scandal pressure: stables with high scandalScore get persistent heyaPressure bumps
  const updatedHeyaPressure = { ...world.mediaState.heyaPressure };

  for (const heya of world.heyas.values()) {
    if (!heya.scandalScore || heya.scandalScore <= 0) continue;
    const pressBump = Math.floor(heya.scandalScore / 10); // 0-3 per week
    if (pressBump > 0) {
      updatedHeyaPressure[heya.id] = Math.min(100, (updatedHeyaPressure[heya.id] ?? 0) + pressBump);
    }
  }

  builder.updateWorldField("mediaState", {
    ...world.mediaState,
    heyaPressure: updatedHeyaPressure,
  });

  return builder.build();
}

export function processMediaDecision(
  world: WorldState,
  choiceId: string,
  impact: { rep?: number; politicalCapital?: number }
): StateImpact {
  const builder = createImpactBuilder("processMediaDecision");
  const heyaId = world.playerHeyaId;
  if (!heyaId) return builder.build();

  if (impact.rep) {
    const heya = getHeya(world, heyaId);
    builder.updateHeya(heyaId, {
      reputation: Math.max(0, Math.min(100, (heya?.reputation ?? 50) + impact.rep)),
    });
  }

  if (impact.politicalCapital) {
    const heya = getHeya(world, heyaId);
    builder.updateHeya(heyaId, {
      politicalCapital: Math.max(
        0,
        Math.min(100, (heya?.politicalCapital ?? 50) + impact.politicalCapital)
      ),
    });
  }

  builder.logEvent("MEDIA_INTERVIEW_COMPLETED", "media", {
    choiceId,
    incident: `Press conference concluded. Impact: ${JSON.stringify(impact)}`,
  });

  return builder.build();
}
