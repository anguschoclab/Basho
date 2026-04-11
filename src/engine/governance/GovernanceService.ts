/**
 * GovernanceService.ts — Core logic for reporting scandals and managing institutional status.
 */

import { WorldState } from "../types/world";
import { EventBus } from "../events";

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
export function reportScandal(world: WorldState, heyaId: string, severity: "minor" | "major" | "critical", reason: string): StateImpact {
  const builder = createImpactBuilder('reportScandal');
  const heya = world.heyas.get(heyaId);
  if (!heya) return builder.build();

  const impactMap = { minor: 5, major: 15, critical: 30 };
  const scoreBump = impactMap[severity] || 5;
  const newScandalScore = (heya.scandalScore ?? 0) + scoreBump;

  builder.updateHeya(heyaId, { scandalScore: newScandalScore });

  // Record deterministic ruling
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

  // Note: governanceLog is not a supported world field in ImpactBuilder, so we update it directly
  // This will be migrated in a future update when ImpactBuilder is extended
  if (!world.governanceLog) world.governanceLog = [];
  world.governanceLog.push(ruling);

  builder.logEvent(
    'GOVERNANCE_RULING',
    'discipline',
    {
      status: severity,
      reason,
      score: scoreBump,
      delta: newScandalScore,
      incident: "scandal_reported"
    },
    { heyaId }
  );

  const headlineImpact = generateGovernanceHeadline({ world, heyaId, templatePath: 'institutional.governance.scandal', severity: severity === "critical" ? "national" : severity === "major" ? "national" : "local" });
  
  // Merge headline impact
  if (headlineImpact.entities?.heyaUpdates) {
    for (const [id, update] of headlineImpact.entities.heyaUpdates) {
      builder.updateHeya(id, update);
    }
  }
  if (headlineImpact.worldFields) {
    for (const [field, value] of Object.entries(headlineImpact.worldFields)) {
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
  const builder = createImpactBuilder('tickWeekGovernance');

  for (const heya of world.heyas.values()) {
    // Natural scandal score decay — 1 point per week
    const newScandalScore = heya.scandalScore && heya.scandalScore > 0 ? Math.max(0, heya.scandalScore - 1) : heya.scandalScore;

    // Sync governanceStatus from scandalScore thresholds
    const score = newScandalScore ?? 0;
    const newStatus: GovernanceStatus =
      score >= 60 ? "sanctioned" :
      score >= 30 ? "probation" :
      score >= 15 ? "warning" :
      "good_standing";

    const updates: any = {};
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
        'GOVERNANCE_RULING',
        'discipline',
        {
          score: newScandalScore,
          incident: "governance_warning",
          reason: "Scandal threshold exceeded"
        },
        { heyaId: heya.id }
      );
    }

    // Log status change event
    if (heya.governanceStatus !== newStatus) {
      const prevStatus = heya.governanceStatus;
      builder.logEvent(
        'GOVERNANCE_RULING',
        'discipline',
        {
          incident: "status_changed",
          status: newStatus,
          reason: prevStatus,
          score: Math.floor(score)
        },
        { heyaId: heya.id }
      );

      if (newStatus === "sanctioned" || newStatus === "probation") {
        const headlineImpact = generateGovernanceHeadline({ world, heyaId: heya.id, templatePath: 'institutional.governance.status_escalation', severity: "national" });
        
        // Merge headline impact
        if (headlineImpact.entities?.heyaUpdates) {
          for (const [id, update] of headlineImpact.entities.heyaUpdates) {
            builder.updateHeya(id, update);
          }
        }
        if (headlineImpact.worldFields) {
          for (const [field, value] of Object.entries(headlineImpact.worldFields)) {
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
export function runElections(world: WorldState): StateImpact {
  const builder = createImpactBuilder('elections');
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
        const newCapital = Math.min(100, (heya.politicalCapital ?? 50) + 5);
        builder.updateHeya(heyaId, { politicalCapital: newCapital });
      }
    }
    builder.logEvent(
      'BASHO_STATUS',
      'basho',
      {
        status: "phase_transition",
        incident: `The ${ichimon} faction participated in the bi-annual JSA board elections.`,
        shikona: ichimon
      }
    );
  }

  return builder.build();
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
 * Returns StateImpact describing capital spend, or empty impact if insufficient capital.
 */
export function spendPoliticalCapital(world: WorldState, heyaId: string, amount: number): StateImpact {
  const builder = createImpactBuilder('spendPoliticalCapital');
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
export function issueGovernanceRuling(world: WorldState, rulingId: string, severity: "lenient" | "standard" | "harsh"): StateImpact {
  const builder = createImpactBuilder('issueGovernanceRuling');
  const rulingIndex = world.governanceLog?.findIndex(r => r.id === rulingId);
  
  if (rulingIndex !== undefined && rulingIndex >= 0 && world.governanceLog) {
    const ruling = world.governanceLog[rulingIndex] as GovernanceRuling;
    const heya = world.heyas.get(ruling.heyaId);

    if (heya) {
      const severityMultiplier = severity === "lenient" ? 0.5 : severity === "harsh" ? 1.5 : 1.0;
      const originalDelta = ruling.effects.scandalScoreDelta || 0;
      const adjustedDelta = Math.round(originalDelta * severityMultiplier);

      const newScandalScore = Math.max(0, (heya.scandalScore || 0) - (originalDelta - adjustedDelta));
      const updates: any = { scandalScore: newScandalScore };

      // Note: governanceLog is not a supported world field in ImpactBuilder, so we update it directly
      ruling.playerSeverity = severity;
      ruling.playerResponse = `Player issued ${severity} ruling`;
      ruling.effects.scandalScoreDelta = adjustedDelta;

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
