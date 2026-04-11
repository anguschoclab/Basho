/**
 * GovernanceService.ts — Core logic for reporting scandals and managing institutional status.
 */

import { WorldState } from "../types/world";
import { EventBus } from "../events";

import { generateGovernanceHeadline } from "../systems/media/MediaService";
import type { GovernanceStatus, GovernanceRuling } from "../types/economy";
import { rngForWorld, rngFromSeed } from "../rng";
import { BardEngine } from "../narrative/BardEngine";

/**
 * Reports a scandal and applies immediate score impacts and headlines.
 */
export function reportScandal(world: WorldState, heyaId: string, severity: "minor" | "major" | "critical", reason: string): void {
  const heya = world.heyas.get(heyaId);
  if (!heya) return;

  const impactMap = { minor: 5, major: 15, critical: 30 };
  const scoreBump = impactMap[severity] || 5;
  heya.scandalScore = (heya.scandalScore ?? 0) + scoreBump;

  // Record deterministic ruling
  if (!world.governanceLog) world.governanceLog = [];
  const rng = rngForWorld(world, "governance", `ruling_${world.dayIndexGlobal}_${heyaId}`);
  const ruling: GovernanceRuling = {
    id: rng.uuid('GR'),
    date: `Year ${world.year}, Day ${world.dayIndexGlobal}`,
    heyaId,
    type: "warning", 
    severity: severity === "critical" ? "high" : severity === "major" ? "medium" : "low",
    reason,
    effects: {
      scandalScoreDelta: scoreBump
    }
  };
  world.governanceLog.push(ruling);

  EventBus.governanceRuling(world, heyaId, {
    status: severity,
    reason,
    score: scoreBump,
    delta: heya.scandalScore,
    incident: "scandal_reported"
  }, severity === "minor" ? "notable" : "major");

  generateGovernanceHeadline({ world, heyaId, templatePath: 'institutional.governance.scandal', severity: severity === "critical" ? "major" : severity as "minor" | "major" });
}

/**
 * Weekly governance tick: decay scandal scores, check compliance alerts.
 */
export function tickWeekGovernance(world: WorldState): void {
  for (const heya of world.heyas.values()) {

    // Natural scandal score decay — 1 point per week
    if (heya.scandalScore && heya.scandalScore > 0) {
      heya.scandalScore = Math.max(0, heya.scandalScore - 1);
    }
    // Alert if crossing critical threshold (player only)
    if (heya.scandalScore && heya.scandalScore >= 30 && heya.id === world.playerHeyaId) {
      EventBus.governanceRuling(world, heya.id, {
        score: heya.scandalScore,
        incident: "governance_warning",
        reason: "Scandal threshold exceeded"
      }, "major");
    }

    // Sync governanceStatus from scandalScore thresholds
    const score = heya.scandalScore ?? 0;
    const newStatus: GovernanceStatus =
      score >= 60 ? "sanctioned" :
      score >= 30 ? "probation" :
      score >= 15 ? "warning" :
      "good_standing";

    if (heya.governanceStatus !== newStatus) {
      const prevStatus = heya.governanceStatus;
      heya.governanceStatus = newStatus;
      EventBus.governanceRuling(world, heya.id, {
        incident: "status_changed",
        status: newStatus,
        reason: prevStatus,
        score: Math.floor(score)
      }, newStatus === "sanctioned" ? "headline" : newStatus === "probation" ? "major" : "notable");
      if (newStatus === "sanctioned" || newStatus === "probation") {
        generateGovernanceHeadline({ world, heyaId: heya.id, templatePath: 'institutional.governance.status_escalation', severity: newStatus === "sanctioned" ? "major" : "major" });
      }
    }
  }
}

/**
 * Bi-annual JSA Board Elections.
 * Rotates ichimon political capital and emits election narrative events.
 */
export function runElections(world: WorldState): void {
  const ichimonGroups: Record<string, string[]> = {};
  for (const heya of world.heyas.values()) {
    if (!heya.ichimon) continue;
    if (!ichimonGroups[heya.ichimon]) ichimonGroups[heya.ichimon] = [];
    ichimonGroups[heya.ichimon].push(heya.id);
  }

  for (const [ichimon, heyaIds] of Object.entries(ichimonGroups)) {
    // Small political capital redistribution
    for (const heyaId of heyaIds) {
      const heya = world.heyas.get(heyaId);
      if (heya && heya.politicalCapital !== undefined) {
        heya.politicalCapital = Math.min(100, (heya.politicalCapital ?? 50) + 5);
      }
    }
    EventBus.bashoStatus(world, {
      status: "phase_transition",
      incident: `The ${ichimon} faction participated in the bi-annual JSA board elections.`,
      shikona: ichimon
    });
  }
}

/**
 * Returns a CSS color class for a governance status band.
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case "clean": return "text-green-400";
    case "warning": return "text-yellow-400";
    case "probation": return "text-orange-400";
    case "critical": return "text-red-400";
    default: return "text-gray-400";
  }
}

/**
 * Returns a display label for a governance status band.
 */
export function getStatusLabel(world: WorldState, status: string): string {
  const rng = rngFromSeed(`gov-label-${status}`, "narrative", "metadata");
  let path = status;
  if (status === "good_standing") path = "clean";
  if (status === "warning")       path = "whispers";
  if (status === "probation")     path = "notable";
  if (status === "sanctioned")    path = "severe";

  return BardEngine.resolve(rng, `system.descriptors.bands.scandal.${path}`).text;
}

/**
 * Spends political capital from a heya's governance account.
 * Returns false if insufficient capital.
 */
export function spendPoliticalCapital(world: WorldState, heyaId: string, amount: number): boolean {
  const heya = world.heyas.get(heyaId);
  if (!heya) return false;
  const current = heya.politicalCapital ?? 50;
  if (current < amount) return false;
  heya.politicalCapital = current - amount;
  return true;
}

/**
 * Issues a governance ruling based on player choice.
 */
export function issueGovernanceRuling(world: WorldState, rulingId: string, severity: "lenient" | "standard" | "harsh"): void {
  const rulingIndex = world.governanceLog?.findIndex(r => r.id === rulingId);
  if (rulingIndex !== undefined && rulingIndex >= 0 && world.governanceLog) {
    const ruling = world.governanceLog[rulingIndex] as GovernanceRuling;
    const heya = world.heyas.get(ruling.heyaId);

    if (heya) {
      const severityMultiplier = severity === "lenient" ? 0.5 : severity === "harsh" ? 1.5 : 1.0;
      const originalDelta = ruling.effects.scandalScoreDelta || 0;
      const adjustedDelta = Math.round(originalDelta * severityMultiplier);

      heya.scandalScore = Math.max(0, (heya.scandalScore || 0) - (originalDelta - adjustedDelta));

      ruling.playerSeverity = severity;
      ruling.playerResponse = `Player issued ${severity} ruling`;
      ruling.effects.scandalScoreDelta = adjustedDelta;

      if (severity === "lenient") {
        heya.politicalCapital = Math.max(0, (heya.politicalCapital || 50) - 10);
      } else if (severity === "harsh") {
        heya.politicalCapital = Math.min(100, (heya.politicalCapital || 50) + 5);
      }
    }
  }
}
