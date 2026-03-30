/**
 * GovernanceService.ts — Core logic for reporting scandals and managing institutional status.
 */

import { WorldState } from "../types/world";
import { logEngineEvent } from "../events";
import { generateGovernanceHeadline } from "../systems/media/MediaService";

/**
 * Reports a scandal and applies immediate score impacts and headlines.
 */
export function reportScandal(world: WorldState, heyaId: string, severity: "minor" | "major" | "critical", reason: string): void {
  const heya = world.heyas.get(heyaId);
  if (!heya) return;

  const impactMap = { minor: 5, major: 15, critical: 30 };
  const scoreBump = impactMap[severity] || 5;
  heya.scandalScore = (heya.scandalScore ?? 0) + scoreBump;

  logEngineEvent(world, {
    type: "GOVERNANCE_SCANDAL_REPORTED",
    category: "discipline",
    importance: severity === "minor" ? "notable" : "major",
    scope: "heya",
    heyaId,
    title: `Scandal reported: ${heya.name}`,
    summary: `Institutionally reported ${severity} conduct issue: ${reason}.`,
    data: { severity, reason, scoreBump, totalScore: heya.scandalScore }
  });

  generateGovernanceHeadline(world, heyaId, severity, reason);
}
