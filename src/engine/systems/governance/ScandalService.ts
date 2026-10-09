/**
 * GovernanceService.ts — Core logic for reporting scandals and managing institutional status.
 */

import { WorldState } from "../../types/world";
import { generateGovernanceHeadline } from "../media/MediaService";
import type { GovernanceRuling } from "../../types/economy";
import { rngForWorld, rngFromSeed } from "../../rng";
import { BardEngine } from "../../bard/BardEngine";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { bumpTenure } from "../legacy/tenure";
import type { StateImpact } from "../../core/StateImpact";
import { getHeya } from "../../queries";
import {
  SCANDAL_SEVERITY_MULT_LENIENT,
  SCANDAL_SEVERITY_MULT_STANDARD,
  SCANDAL_SEVERITY_MULT_HARSH,
} from "../../../constants/engine/governance";

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
  const heya = getHeya(world, heyaId);
  if (!heya) return builder.build();

  const impactMap = { minor: 5, major: 15, critical: 30 };
  const scoreBump = impactMap[severity] || 5;
  const newScandalScore = (heya.scandalScore ?? 0) + scoreBump;

  builder.updateHeya(heyaId, { scandalScore: newScandalScore });

  // WS5 — major/critical scandals count against the sitting oyakata (§16.1).
  if (severity !== "minor") {
    bumpTenure(world, builder, heyaId, { majorScandals: 1 });
  }

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

  // Merge headline impact safely via standard API
  builder.merge(headlineImpact);

  return builder.build();
}


/**
 * Bi-annual JSA Board Elections.
 * Calculates institutional power based on political capital, reputation, and faction influence.
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
        (getHeya(world, candidate.heyaId)?.politicalCapital ?? 0) + 20
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

  if (elected.length > 0) {
    builder.logEvent("BASHO_STATUS", "basho", {
      status: "phase_transition",
      incident: `The JSA bi-annual board elections have concluded. ${elected[0].name} has been appointed as Chairman.`,
      shikona: elected[0].name,
    });
  }

  return builder.build();
}

/**
 * Returns a CSS color class for a governance status band.
 */
const STATUS_COLOR_MAP: Record<string, string> = {
  clean: "text-success",
  good_standing: "text-success",
  warning: "text-gold",
  probation: "text-warning",
  sanctioned: "text-destructive",
  critical: "text-destructive",
};

export function getStatusColor(status: string): string {
  return STATUS_COLOR_MAP[status] || "text-muted-foreground";
}

/**
 * Returns a display label for a governance status band.
 */
export function getStatusLabel(_world: WorldState, status: string): string {
  const rng = rngFromSeed(`gov-label-${status}`, "narrative", "metadata");
  let path = status;
  if (status === "good_standing") path = "none";
  if (status === "warning") path = "whispers";
  if (status === "probation") path = "notable";
  if (status === "sanctioned") path = "severe";

  return BardEngine.resolve(rng, `system.descriptors.bands.scandal.${path}`).text;
}

/**
 * Spends political capital from a heya's governance account.
 */
export function spendPoliticalCapital(
  world: WorldState,
  heyaId: string,
  amount: number
): StateImpact {
  const builder = createImpactBuilder("spendPoliticalCapital");
  const heya = getHeya(world, heyaId);
  if (!heya) return builder.build();
  const current = heya.politicalCapital ?? 50;
  if (current < amount) return builder.build();

  builder.updateHeya(heyaId, { politicalCapital: current - amount });

  return builder.build();
}

/**
 * Issues a governance ruling based on player choice.
 */
export function issueGovernanceRuling(
  world: WorldState,
  rulingId: string,
  severity: "lenient" | "standard" | "harsh"
): StateImpact {
  const builder = createImpactBuilder("issueGovernanceRuling");
  const rulingIndex = world.governanceLog?.findIndex((r) => r.id === rulingId);

  if (rulingIndex !== undefined && rulingIndex >= 0 && world.governanceLog) {
    const ruling = world.governanceLog[rulingIndex];
    if (!ruling) return builder.build();

    const heya = getHeya(world, ruling.heyaId);

    if (heya) {
      const severityMultiplier =
        severity === "lenient"
          ? SCANDAL_SEVERITY_MULT_LENIENT
          : severity === "harsh"
            ? SCANDAL_SEVERITY_MULT_HARSH
            : SCANDAL_SEVERITY_MULT_STANDARD;
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

      // Update ruling with player choice
      const updatedRuling: GovernanceRuling = {
        ...ruling,
        // `playerChoice` is the canonical "resolved" marker used by the UI's
        // unresolved-ruling filter (`!r.playerChoice`) and by tests; keep
        // playerSeverity/playerResponse for richer display.
        playerChoice: severity,
        playerSeverity: severity,
        playerResponse: `Player issued ${severity} ruling`,
        effects: {
          ...ruling.effects,
          scandalScoreDelta: adjustedDelta,
        },
      };

      // Replace the ruling in governanceLog
      const updatedGovernanceLog = [...world.governanceLog];
      updatedGovernanceLog[rulingIndex] = updatedRuling;
      builder.updateWorldField("governanceLog", updatedGovernanceLog);

      if (severity === "lenient") {
        updates.politicalCapital = Math.max(0, (heya.politicalCapital ?? 50) - 10);
      } else if (severity === "harsh") {
        updates.politicalCapital = Math.min(100, (heya.politicalCapital ?? 50) + 5);
      }

      builder.updateHeya(heya.id, updates);
    }
  }

  return builder.build();
}
