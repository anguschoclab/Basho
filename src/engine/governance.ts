// @ts-nocheck
// governance.ts
// The "Law" Engine
// Manages Scandal Accumulation, Status Degradation, and Institutional Sanctions.
// Aligned with Governance V1.3 Spec.

import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { GovernanceStatus, GovernanceRuling } from "./types/economy";
import { logEngineEvent } from "./events";
import { generateScandalHeadline } from "./media";

// === CONSTANTS ===

/** s c a n d a l_ d e c a y_ r a t e. */
export const SCANDAL_DECAY_RATE = 0.5; // Points per week
/** s c a n d a l_ w a r n i n g_ t h r e s h o l d. */
export const SCANDAL_WARNING_THRESHOLD = 20;
/** s c a n d a l_ p r o b a t i o n_ t h r e s h o l d. */
export const SCANDAL_PROBATION_THRESHOLD = 50;
/** s c a n d a l_ s a n c t i o n_ t h r e s h o l d. */
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

/**
 * Process heya governance.
 *  * @param heya - The Heya.
 *  * @param world - The World.
 */
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

    // Generate media headline for governance status change
    try {
      generateScandalHeadline({
        world,
        heyaId: heya.id,
        type: "status_change",
        severity: newStatus === "sanctioned" ? "critical" : newStatus === "probation" ? "major" : "minor",
        reason: `${heya.name} placed ${getStatusLabel(newStatus).toLowerCase()} by JSA`,
        description: ruling.reason,
      });
    } catch (_) { /* media optional */ }
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
    id: `scandal-${world.year}-${world.week}-${heya.id}-${world.dayIndexGlobal}`,
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

  // Generate media headline for scandal
  try {
    generateScandalHeadline({
      world,
      heyaId: heya.id,
      type: "scandal",
      severity,
      reason,
      description: `Scandal reported (${severity}) — fine ¥${fine.toLocaleString()}.`,
      fineAmount: fine,
    });
  } catch (_) { /* media optional */ }
  
  // Force immediate re-evaluation of status
  processHeyaGovernance(heya, world);
}

/**
 * Log ruling.
 *  * @param heya - The Heya.
 *  * @param world - The World.
 *  * @param ruling - The Ruling.
 */
function logRuling(heya: Heya, world: WorldState, ruling: GovernanceRuling): void {
  if (!heya.governanceHistory) heya.governanceHistory = [];
  heya.governanceHistory.unshift(ruling);

  if (!world.governanceLog) world.governanceLog = [];
  world.governanceLog.unshift(ruling);
}

// === PUBLIC HELPERS ===

/**
 * Get status label.
 *  * @param status - The Status.
 *  * @returns The result.
 */
export function getStatusLabel(status: GovernanceStatus): string {
  switch (status) {
    case "good_standing": return "Good Standing";
    case "warning": return "Under Review";
    case "probation": return "Probation";
    case "sanctioned": return "Sanctioned";
  }
}

/**
 * Get status color.
 *  * @param status - The Status.
 *  * @returns The result.
 */
export function getStatusColor(status: GovernanceStatus): string {
  switch (status) {
    case "good_standing": return "text-green-600";
    case "warning": return "text-yellow-600";
    case "probation": return "text-orange-600";
    case "sanctioned": return "text-red-600";
  }
}


/**
 * runElections
 * Evaluates the 2-year JSA board election.
 * Updates influence and faction leaders based on heya political capital + prestige.
 * Determines the overall Chairman faction.
 * @param world - The WorldState.
 */
export function runElections(world: WorldState): void {
  if (!world.factions) return;

  // 1. Reset influence baseline
  const factionInfluence: Record<string, number> = {};
  const factionLeaders: Record<string, { oyakataId: string; score: number }> = {};

  for (const fac of Object.values(world.factions)) {
    factionInfluence[fac.id] = 50; // Base
    factionLeaders[fac.id] = { oyakataId: fac.oyakataLeaderId || "", score: -1 };
  }

  // 2. Tally scores from all heyas
  for (const heya of world.heyas.values()) {
    if (!heya.ichimon || !world.factions[heya.ichimon]) continue;

    // Prestige band logic (world_class/elite etc add to base)
    const baseScore = heya.prestigeBand === "world_class" ? 30 :
                      heya.prestigeBand === "elite" ? 20 :
                      heya.prestigeBand === "respected" ? 10 : 5;

    const politicalCapital = heya.politicalCapital || 0;
    const score = baseScore + politicalCapital / 10;

    factionInfluence[heya.ichimon] += score;

    // Check if this heya's oyakata is the new leader of their Ichimon
    if (score > factionLeaders[heya.ichimon].score) {
      factionLeaders[heya.ichimon] = { oyakataId: heya.oyakataId, score };
    }

    // Decay political capital after the election (cost of doing politics)
    heya.politicalCapital = Math.max(0, Math.floor(politicalCapital * 0.5));
  }

  // 3. Update world factions
  let maxInfluence = -1;
  let chairmanFaction = "";

  for (const fac of Object.values(world.factions)) {
    fac.influence = Math.round(factionInfluence[fac.id]);
    fac.oyakataLeaderId = factionLeaders[fac.id].oyakataId;

    if (fac.influence > maxInfluence) {
      maxInfluence = fac.influence;
      chairmanFaction = fac.name;
    }
  }

  logEngineEvent(world, {
    type: "GOVERNANCE_RULING",
    category: "discipline",
    importance: "headline",
    scope: "world",
    title: "JSA Board Elections Concluded",
    summary: `The ${chairmanFaction} has secured the Chairman seat for the next term.`,
    data: { chairmanFaction, maxInfluence }
  });
}

/**
 * spendPoliticalCapital
 * @param world - The WorldState.
 * @param heyaId - The Heya Id.
 * @param amount - amount of capital to spend.
 * @returns boolean - true if successful.
 */
export function spendPoliticalCapital(world: WorldState, heyaId: string, amount: number): boolean {
  const heya = world.heyas.get(heyaId);
  if (!heya || (heya.politicalCapital || 0) < amount || !heya.ichimon) return false;

  const faction = world.factions?.[heya.ichimon];
  if (!faction) return false;

  heya.politicalCapital = (heya.politicalCapital || 0) - amount;
  faction.influence += amount / 5; // Direct influence boost

  logEngineEvent(world, {
    type: "GOVERNANCE_RULING",
    category: "discipline",
    importance: "minor",
    scope: "heya",
    heyaId,
    title: "Political Maneuvering",
    summary: `${heya.name} spent ${amount} political capital to boost ${faction.name} influence.`,
    data: { amountSpent: amount, newInfluence: faction.influence }
  });

  return true;
}
