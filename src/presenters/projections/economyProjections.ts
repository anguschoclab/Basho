/**
 * economyProjections.ts
 *
 * Projections for loan status and merger warnings.
 * Extracted from uiDigest.ts to eliminate monolithic structure.
 */

import type { WorldState } from "@/engine/types/world";
import { EntityCollection } from "@/engine/core/EntityCollection";
import {
  CHRONIC_UNDERPERFORMANCE_BASHO,
  PRESTIGE_COLLAPSE_BAND,
  NON_FINANCIAL_MERGER_MAX_ROSTER,
} from "@/constants/engine/economic";

/**
 * Project a list of heyas at risk of merger based on debt + small roster
 * or chronic underperformance + prestige collapse.
 */
export function projectMergerWarnings(world: WorldState) {
  const warnings: Array<{
    heyaId: string;
    heyaName: string;
    funds: number;
    rosterSize: number;
    governanceStatus: string;
    warningType: "financial" | "non_financial";
  }> = [];

  for (const h of EntityCollection.getHeyas(world)) {
    const isInDebt = h.funds < 0;
    const rosterSize = new Set(h.rikishiIds ?? []).size;

    // Financial merger warning: debt + small roster
    if (isInDebt && rosterSize <= 3) {
      warnings.push({
        heyaId: h.id,
        heyaName: h.name,
        funds: h.funds,
        rosterSize,
        governanceStatus: h.governanceStatus,
        warningType: "financial",
      });
    }

    // Non-financial merger warning: chronic underperformance + prestige collapse
    if (
      (h.consecutiveUnderperformanceBasho ?? 0) >= CHRONIC_UNDERPERFORMANCE_BASHO &&
      h.prestigeBand === PRESTIGE_COLLAPSE_BAND &&
      rosterSize <= NON_FINANCIAL_MERGER_MAX_ROSTER &&
      !isInDebt
    ) {
      warnings.push({
        heyaId: h.id,
        heyaName: h.name,
        funds: h.funds,
        rosterSize,
        governanceStatus: h.governanceStatus,
        warningType: "non_financial",
      });
    }
  }

  return warnings.sort((a, b) => a.funds - b.funds);
}
