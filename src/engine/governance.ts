// governance.ts
// The "Law" Engine
// Manages Scandal Accumulation, Status Degradation, and Institutional Sanctions.
// Aligned with Governance V1.3 Spec.

import type { WorldState, Heya, GovernanceStatus, GovernanceRuling } from "./types";
import { logEngineEvent } from "./events";

// === CONSTANTS ===

export const SCANDAL_DECAY_RATE = 0.5; // Points per week
export const SCANDAL_WARNING_THRESHOLD = 20;
export const SCANDAL_PROBATION_THRESHOLD = 50;
export const SCANDAL_SANCTION_THRESHOLD = 80;

// === CORE LOGIC ===

/**
 * Processes weekly governance checks for all Heyas.
 * - Decays scandal score
 * - Updates status (Good -> Warning -> etc)
 * - Checks for automatic sanctions
 */
export function tickWeek(world: WorldState): void {
  for (const heya of world.heyas.values()) {
    processHeyaGovernance(heya, world);
  }
}

function processHeyaGovernance(heya: Heya, world: WorldState): void {
  // 1. Decay Scandal Score
  // Scandal is sticky, but time heals (slowly)
  if (heya.scandalScore > 0) {
    heya.scandalScore = Math.max(0, heya.scandalScore - SCANDAL_DECAY_RATE);
  }

  // 2. Evaluate Status
  const oldStatus = heya.governanceStatus;
  let newStatus: GovernanceStatus = "good_standing";

  if (heya.scandalScore >= SCANDAL_SANCTION_THRESHOLD) {
    newStatus = "sanctioned";
  } else if (heya.scandalScore >= SCANDAL_PROBATION_THRESHOLD) {
    newStatus = "probation";
  } else if (heya.scandalScore >= SCANDAL_WARNING_THRESHOLD) {
    newStatus = "warning";
  }

  // 3. Handle Transitions
  if (newStatus !== oldStatus) {
    heya.governanceStatus = newStatus;
    
    // Log the status change as a ruling (simplified)
    const ruling: GovernanceRuling = {
      id: `gov-${world.year}-${world.week}-${heya.id}`,
      date: `${world.year}-W${world.week}`,
      heyaId: heya.id,
      type: newStatus === "good_standing" ? "warning" : "suspension", // Simplified mapping
      severity: newStatus === "sanctioned" ? "high" : "low",
      reason: `Automatic status change to ${newStatus} due to scandal score ${Math.floor(heya.scandalScore)}`,
      effects: {
        scandalScoreDelta: 0
      }
    };
    
    logRuling(heya, world, ruling);

    logEngineEvent(world, {
      type: "GOVERNANCE_STATUS_CHANGED",
      category: "discipline",
      importance: newStatus === "sanctioned" ? "headline" : newStatus === "probation" ? "major" : "notable",
      scope: "heya",
      heyaId: heya.id,
      title: `Governance status: ${getStatusLabel(newStatus)}`,
      summary: ruling.reason,
      data: { governanceStatus: newStatus, scandalScore: Math.floor(heya.scandalScore) }
    });
  }

  // 4. Update Risk Indicator
  heya.riskIndicators.governance = newStatus === "probation" || newStatus === "sanctioned";
}

/**
 * Trigger a scandal event against a stable.
 * This is called by the Event System or Economy (bankruptcy).
 */
export function reportScandal(
  world: WorldState,
  heyaId: string,
  severity: "minor" | "major" | "critical",
  reason: string
): void {
  const heya = world.heyas.get(heyaId);
  if (!heya) return;

  let points = 0;
  let fine = 0;

  switch (severity) {
    case "minor":
      points = 10;
      fine = 500_000;
      break;
    case "major":
      points = 35;
      fine = 2_000_000;
      break;
    case "critical":
      points = 60;
      fine = 10_000_000;
      break;
  }

  // Apply Effects
  heya.scandalScore = Math.min(100, (heya.scandalScore || 0) + points);
  heya.funds -= fine;

  // Log Ruling
  const ruling: GovernanceRuling = {
    id: `scandal-${world.year}-${world.week}-${heya.id}-${Date.now()}`,
    date: `${world.year}-W${world.week}`,
    heyaId: heya.id,
    type: "fine",
    severity: severity === "critical" ? "high" : severity === "major" ? "medium" : "low",
    reason: `Scandal: ${reason}`,
    effects: {
      fineAmount: fine,
      scandalScoreDelta: points
    }
  };

  logRuling(heya, world, ruling);

  logEngineEvent(world, {
    type: "SCANDAL_REPORTED",
    category: "media",
    importance: severity === "critical" ? "headline" : severity === "major" ? "major" : "notable",
    scope: "heya",
    heyaId: heya.id,
    title: `Scandal: ${reason}`,
    summary: `Scandal reported (${severity}) — fine ¥${fine.toLocaleString()}.`,
    data: { severity, fineAmount: fine, scandalScoreDelta: points }
  });
  
  // Force immediate re-evaluation of status
  processHeyaGovernance(heya, world);
}

function logRuling(heya: Heya, world: WorldState, ruling: GovernanceRuling): void {
  if (!heya.governanceHistory) heya.governanceHistory = [];
  heya.governanceHistory.unshift(ruling);

  if (!world.governanceLog) world.governanceLog = [];
  world.governanceLog.unshift(ruling);
}

// === PUBLIC HELPERS ===

export function getStatusLabel(status: GovernanceStatus): string {
  switch (status) {
    case "good_standing": return "Good Standing";
    case "warning": return "Under Review";
    case "probation": return "Probation";
    case "sanctioned": return "Sanctioned";
  }
}

export function getStatusColor(status: GovernanceStatus): string {
  switch (status) {
    case "good_standing": return "text-green-600";
    case "warning": return "text-yellow-600";
    case "probation": return "text-orange-600";
    case "sanctioned": return "text-red-600";
  }
}
