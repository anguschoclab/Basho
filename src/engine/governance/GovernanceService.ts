/**
 * GovernanceService.ts — Core logic for reporting scandals and managing institutional status.
 */

import { WorldState } from "../types/world";
import { logEngineEvent } from "../events";
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

  const scandalRng = rngFromSeed(`scandal-${heyaId}-${world.year}-${world.week}`, "narrative", "event");
  const scandalSummary = BardEngine.resolve(scandalRng, "institutional.governance.scandal", { heya: heya.name, severity, reason }).text;
  logEngineEvent(world, {
    type: "GOVERNANCE_SCANDAL_REPORTED",
    category: "discipline",
    importance: severity === "minor" ? "notable" : "major",
    scope: "heya",
    heyaId,
    title: `Scandal reported: ${heya.name}`,
    summary: scandalSummary,
    data: { severity, reason, scoreBump, totalScore: heya.scandalScore, rulingId: ruling.id }
  });

  generateGovernanceHeadline(world, heyaId, severity, reason);
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
      const warnRng = rngFromSeed(`gov-warn-${heya.id}-${world.year}-${world.week}`, "narrative", "event");
      const warnSummary = BardEngine.resolve(warnRng, "institutional.governance.threats", { heya: heya.name, scandalScore: heya.scandalScore }).text;
      logEngineEvent(world, {
        type: "GOVERNANCE_WARNING",
        category: "discipline",
        importance: "major",
        scope: "heya",
        heyaId: heya.id,
        title: `JSA Warning: ${heya.name}`,
        summary: warnSummary,
        data: { scandalScore: heya.scandalScore },
        tags: ["governance", "warning"]
      });
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
      const statusRng = rngFromSeed(`gov-status-${heya.id}-${world.year}-${world.week}-${newStatus}`, "narrative", "event");
      const statusSummary = BardEngine.resolve(statusRng, "institutional.governance.sanction", { heya: heya.name, prevStatus, newStatus }).text;
      logEngineEvent(world, {
        type: "GOVERNANCE_STATUS_CHANGED",
        category: "discipline",
        importance: newStatus === "sanctioned" ? "headline" : newStatus === "probation" ? "major" : "notable",
        scope: "heya",
        heyaId: heya.id,
        title: `${heya.name}: governance status → ${newStatus}`,
        summary: statusSummary,
        data: { prevStatus, newStatus, scandalScore: Math.floor(score) }
      });
      if (newStatus === "sanctioned" || newStatus === "probation") {
        generateGovernanceHeadline(world, heya.id, newStatus === "sanctioned" ? "critical" : "major",
          `${heya.name} governance status has escalated to ${newStatus}.`);
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
    logEngineEvent(world, {
      type: "JSA_ELECTION",
      category: "discipline",
      importance: "notable",
      scope: "world",
      title: `JSA Board Election: ${ichimon} faction`,
      summary: `The ${ichimon} faction participated in the bi-annual JSA board elections.`,
      data: { ichimon, heyaCount: heyaIds.length },
      tags: ["governance", "elections"]
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
export function getStatusLabel(status: string): string {
  switch (status) {
    case "clean": return "Clean Record";
    case "warning": return "Under Review";
    case "probation": return "On Probation";
    case "critical": return "Critical Scrutiny";
    default: return status;
  }
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
