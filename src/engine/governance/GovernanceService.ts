/**
 * GovernanceService.ts — Core logic for reporting scandals and managing institutional status.
 */

import { WorldState } from "../types/world";

import { generateGovernanceHeadline } from "../systems/media/MediaService";
import type { GovernanceStatus, GovernanceRuling } from "../types/economy";
import { rngForWorld, rngFromSeed } from "../rng";
import { BardEngine } from "../narrative/BardEngine";
import { createImpactBuilder } from "../core/ImpactBuilder";
import type { StateImpact } from "../core/StateImpact";

/**
 * Reports a scandal and applies immediate score impacts and headlines.
 * Returns StateImpact describing scandal report instead of mutating state directly.
 */
export function reportScandal(
  world: WorldState,
  heyaId: string,
  severity: "minor" | "major" | "critical",
  reason: string
): StateImpact {
  const builder = createImpactBuilder("reportScandal");
  const heya = world.heyas.get(heyaId);
  if (!heya) return builder.build();

  const impactMap = { minor: 5, major: 15, critical: 30 };
  const scoreBump = impactMap[severity] || 5;
  const newScandalScore = (heya.scandalScore ?? 0) + scoreBump;

  builder.updateHeya(heyaId, { scandalScore: newScandalScore });

  // Record deterministic ruling
  const rng = rngForWorld(world, "governance", `ruling_${world.dayIndexGlobal}_${heyaId}`);
  const ruling: GovernanceRuling = {
    id: rng.uuid("GR"),
    date: `Year ${world.year}, Day ${world.dayIndexGlobal}`,
    heyaId,
    type: "warning",
    severity: severity === "critical" ? "high" : severity === "major" ? "medium" : "low",
    reason,
    effects: {
      scandalScoreDelta: scoreBump,
    },
  };

  // Append ruling to governanceLog via ImpactBuilder
  builder.appendToWorldArray("governanceLog", [ruling]);

  builder.logEvent(
    "GOVERNANCE_RULING",
    "discipline",
    {
      status: severity,
      reason,
      score: scoreBump,
      delta: newScandalScore,
      incident: "scandal_reported",
    },
    { heyaId }
  );

  const headlineImpact = generateGovernanceHeadline({
    world,
    heyaId,
    templatePath: "institutional.governance.scandal",
    severity: severity === "critical" ? "national" : severity === "major" ? "national" : "local",
  });

  // Merge headline impact
  if (headlineImpact.entities?.heyaUpdates) {
    for (const [id, update] of headlineImpact.entities.heyaUpdates) {
      builder.updateHeya(id, update);
    }
  }
  if (headlineImpact.worldFields) {
    for (const [field, value] of Object.entries(headlineImpact.worldFields)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic field update from MediaService
      (builder as any).updateWorldField(field, value);
    }
  }

  return builder.build();
}

/**
 * Weekly governance tick: decay scandal scores, check compliance alerts.
 * Returns StateImpact describing governance updates instead of mutating state directly.
 */
export function tickWeekGovernance(world: WorldState): StateImpact {
  const builder = createImpactBuilder("tickWeekGovernance");

  for (const heya of world.heyas.values()) {
    // Natural scandal score decay — 1 point per week
    const newScandalScore =
      heya.scandalScore && heya.scandalScore > 0
        ? Math.max(0, heya.scandalScore - 1)
        : heya.scandalScore;

    // Sync governanceStatus from scandalScore thresholds
    const score = newScandalScore ?? 0;
    const newStatus: GovernanceStatus =
      score >= 60
        ? "sanctioned"
        : score >= 30
          ? "probation"
          : score >= 15
            ? "warning"
            : "good_standing";

    const updates: Partial<{
      scandalScore: number;
      governanceStatus: GovernanceStatus;
    }> = {};
    if (heya.scandalScore !== newScandalScore) {
      updates.scandalScore = newScandalScore;
    }
    if (heya.governanceStatus !== newStatus) {
      updates.governanceStatus = newStatus;
    }

    if (Object.keys(updates).length > 0) {
      builder.updateHeya(heya.id, updates);
    }

    // Alert if crossing critical threshold (player only)
    if (newScandalScore && newScandalScore >= 30 && heya.id === world.playerHeyaId) {
      builder.logEvent(
        "GOVERNANCE_RULING",
        "discipline",
        {
          score: newScandalScore,
          incident: "governance_warning",
          reason: "Scandal threshold exceeded",
        },
        { heyaId: heya.id }
      );
    }

    // Log status change event
    if (heya.governanceStatus !== newStatus) {
      const prevStatus = heya.governanceStatus;
      builder.logEvent(
        "GOVERNANCE_RULING",
        "discipline",
        {
          incident: "status_changed",
          status: newStatus,
          reason: prevStatus,
          score: Math.floor(score),
        },
        { heyaId: heya.id }
      );

      if (newStatus === "sanctioned" || newStatus === "probation") {
        const headlineImpact = generateGovernanceHeadline({
          world,
          heyaId: heya.id,
          templatePath: "institutional.governance.status_escalation",
          severity: "national",
        });

        // Merge headline impact
        if (headlineImpact.entities?.heyaUpdates) {
          for (const [id, update] of headlineImpact.entities.heyaUpdates) {
            builder.updateHeya(id, update);
          }
        }
        if (headlineImpact.worldFields) {
          for (const [field, value] of Object.entries(headlineImpact.worldFields)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic field update from MediaService
            (builder as any).updateWorldField(field, value);
          }
        }
      }
    }
  }

  return builder.build();
}

/**
 * Bi-annual JSA Board Elections.
 * Rotates ichimon political capital and emits election narrative events.
 * Returns StateImpact describing election changes instead of mutating state.
 */
/**
 * Bi-annual JSA Board Elections.
 * Calculates institutional power based on political capital, reputation, and faction influence.
 * Candidates with highest 'Political Influence' score are elected to the Board of Elders.
 */
export function runElections(world: WorldState): StateImpact {
  const builder = createImpactBuilder("elections");
  const candidates: Array<{ heyaId: string; score: number; name: string }> = [];

  for (const heya of world.heyas.values()) {
    const influence = (heya.politicalCapital ?? 50) + (heya.reputation ?? 50) / 2;
    candidates.push({
      heyaId: heya.id,
      score: influence,
      name: heya.name,
    });
  }

  // Sort by score descending to find winners
  candidates.sort((a, b) => b.score - a.score);
  const elected = candidates.slice(0, 5); // Top 5 form the Board

  for (const candidate of elected) {
    builder.updateHeya(candidate.heyaId, {
      governanceStatus: "good_standing", // Board members are elevated to good standing
      politicalCapital: Math.min(
        100,
        (world.heyas.get(candidate.heyaId)?.politicalCapital ?? 0) + 20
      ),
    });

    builder.logEvent(
      "GOVERNANCE_RULING",
      "discipline",
      {
        incident: "election_victory",
        status: "board_member",
        reason: "JSA Elder Election",
        score: Math.floor(candidate.score),
      },
      { heyaId: candidate.heyaId, importance: "headline" }
    );
  }

  builder.logEvent("BASHO_STATUS", "basho", {
    status: "phase_transition",
    incident: `The JSA bi-annual board elections have concluded. ${elected[0].name} has been appointed as Chairman.`,
    shikona: elected[0].name,
  });

  return builder.build();
}

/**
 * Returns a CSS color class for a governance status band.
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case "clean":
      return "text-green-400";
    case "warning":
      return "text-yellow-400";
    case "probation":
      return "text-orange-400";
    case "critical":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
}

/**
 * Returns a display label for a governance status band.
 */
export function getStatusLabel(_world: WorldState, status: string): string {
  const rng = rngFromSeed(`gov-label-${status}`, "narrative", "metadata");
  let path = status;
  if (status === "good_standing") path = "clean";
  if (status === "warning") path = "whispers";
  if (status === "probation") path = "notable";
  if (status === "sanctioned") path = "severe";

  return BardEngine.resolve(rng, `system.descriptors.bands.scandal.${path}`).text;
}

/**
 * Spends political capital from a heya's governance account.
 * Returns StateImpact describing capital spend, or empty impact if insufficient capital.
 */
export function spendPoliticalCapital(
  world: WorldState,
  heyaId: string,
  amount: number
): StateImpact {
  const builder = createImpactBuilder("spendPoliticalCapital");
  const heya = world.heyas.get(heyaId);
  if (!heya) return builder.build();
  const current = heya.politicalCapital ?? 50;
  if (current < amount) return builder.build();

  builder.updateHeya(heyaId, { politicalCapital: current - amount });

  return builder.build();
}

/**
 * Issues a governance ruling based on player choice.
 * Returns StateImpact describing ruling issuance instead of mutating state directly.
 */
export function issueGovernanceRuling(
  world: WorldState,
  rulingId: string,
  severity: "lenient" | "standard" | "harsh"
): StateImpact {
  const builder = createImpactBuilder("issueGovernanceRuling");
  const rulingIndex = world.governanceLog?.findIndex((r) => r.id === rulingId);

  if (rulingIndex !== undefined && rulingIndex >= 0 && world.governanceLog) {
    const ruling = world.governanceLog[rulingIndex] as GovernanceRuling;
    const heya = world.heyas.get(ruling.heyaId);

    if (heya) {
      const severityMultiplier = severity === "lenient" ? 0.5 : severity === "harsh" ? 1.5 : 1.0;
      const originalDelta = ruling.effects.scandalScoreDelta || 0;
      const adjustedDelta = Math.round(originalDelta * severityMultiplier);

      const newScandalScore = Math.max(
        0,
        (heya.scandalScore || 0) - (originalDelta - adjustedDelta)
      );
      const updates: Partial<{
        scandalScore: number;
        politicalCapital: number;
      }> = { scandalScore: newScandalScore };

      // Update ruling with player choice via ImpactBuilder
      const updatedRuling: GovernanceRuling = {
        ...ruling,
        playerSeverity: severity,
        playerResponse: `Player issued ${severity} ruling`,
        effects: {
          ...ruling.effects,
          scandalScoreDelta: adjustedDelta,
        },
      };

      // Replace the ruling in governanceLog by updating the entire array
      const updatedGovernanceLog = [...world.governanceLog];
      updatedGovernanceLog[rulingIndex] = updatedRuling;
      builder.updateWorldField("governanceLog", updatedGovernanceLog);

      if (severity === "lenient") {
        updates.politicalCapital = Math.max(0, (heya.politicalCapital || 50) - 10);
      } else if (severity === "harsh") {
        updates.politicalCapital = Math.min(100, (heya.politicalCapital || 50) + 5);
      }

      builder.updateHeya(heya.id, updates);
    }
  }

  return builder.build();
}
