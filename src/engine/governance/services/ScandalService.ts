/**
 * GovernanceService.ts — Core logic for reporting scandals and managing institutional status.
 */

import { WorldState } from "@/engine/types/world";
import { generateGovernanceHeadline } from "@/engine/media/MediaService";
import type { GovernanceRuling } from "@/engine/types/economy";
import { rngForWorld, rngFromSeed } from "@/engine/core/rng";
import { BardEngine } from "@/engine/bard/BardEngine";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { bumpTenure } from "@/engine/legacy/tenure";
import type { StateImpact } from "@/engine/core/StateImpact";
import { getHeya } from "@/engine/core/queries";
import { findMergerTarget } from "@/engine/economy/mergers";
import {
  SCANDAL_SEVERITY_MULT_LENIENT,
  SCANDAL_SEVERITY_MULT_STANDARD,
  SCANDAL_SEVERITY_MULT_HARSH,
} from "@/constants/engine/governance";

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

  // Record deterministic ruling — SeededRNG.uuid counters are per-instance, so
  // the label needs the reason (which embeds the subject) to stay unique when a
  // heya logs several scandals on the same day.
  const rng = rngForWorld(
    world,
    "governance",
    `ruling_${world.dayIndexGlobal}_${heyaId}_${reason}_${world.governanceLog?.length ?? 0}`
  );
  // WS-5 — a critical scandal that pushes a heya into the danger band
  // (~70) triggers a board-imposed CLOSURE process, not another warning.
  // The stable is suspended into custody (azukari) under a supervising
  // heya — same-ichimon first via findMergerTarget — and permanent
  // dissolution follows only after the custody window + master exit.
  const isDisciplinaryClosure = severity === "critical" && newScandalScore >= 70;

  const ruling: GovernanceRuling = {
    id: rng.uuid("GR"),
    date: `Year ${world.year}, Day ${world.dayIndexGlobal}`,
    heyaId,
    type: isDisciplinaryClosure ? "closure" : "warning",
    severity: isDisciplinaryClosure
      ? "terminal"
      : severity === "critical"
        ? "high"
        : severity === "major"
          ? "medium"
          : "low",
    reason,
    effects: {
      scandalScoreDelta: scoreBump,
    },
  };

  // Append ruling to governanceLog via ImpactBuilder
  builder.appendToWorldArray("governanceLog", [ruling]);

  if (isDisciplinaryClosure) {
    const hostId = findMergerTarget(world, heyaId);
    if (hostId) {
      builder.updateHeya(heyaId, {
        custodyStatus: { hostHeyaId: hostId, sinceYear: world.year },
        governanceStatus: "suspended",
      });
      for (const rId of heya.rikishiIds ?? []) {
        builder.updateRikishi(rId, { inCustodyOf: hostId });
      }
    }
  }

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
    salt: reason,
  });

  // Merge headline impact safely via standard API
  builder.merge(headlineImpact);

  return builder.build();
}

/**
 * Bi-annual JSA Board Elections — clan-quota model lives in
 * `../elections.ts`; re-exported here so SimulationRunner, phase06 and the
 * governance-surface contract keep their import path.
 */
export { runElections } from "../elections";

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

/**
 * Maps a heya's governance status to its display color token.
 */
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

/** Cost of a heya-funded PR campaign to blunt an active scandal (yen). */
export const SCANDAL_PR_COST = 5_000_000;

/** Scandal-score points removed by one PR campaign. */
export const SCANDAL_PR_REDUCTION = 8;

/**
 * NPC/player-shared governance action — pays for a PR campaign that reduces
 * the heya's scandal score, clamped at zero. Callers gate on funds/cooldown;
 * this only writes the cost + score reduction.
 */
export function applyScandalPRSpend(world: WorldState, heyaId: string): StateImpact {
  const builder = createImpactBuilder("applyScandalPRSpend");
  const heya = getHeya(world, heyaId);
  if (!heya || heya.funds < SCANDAL_PR_COST) return builder.build();
  builder.updateHeya(heyaId, {
    scandalScore: Math.max(0, (heya.scandalScore ?? 0) - SCANDAL_PR_REDUCTION),
    funds: heya.funds - SCANDAL_PR_COST,
  });
  return builder.build();
}
