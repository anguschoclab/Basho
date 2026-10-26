/**
 * governanceProjections.ts
 *
 * Governance page data projection.
 * Consolidates world.governanceLog, scandal, political capital, welfare warnings.
 */

import type { WorldState } from "../../engine/types/world";
import type { Heya } from "../../engine/types/heya";
import type { GovernanceRuling, Faction } from "../../engine/types/economy";
import { POLITICAL_FAVORS } from "../../engine/systems/governance/PoliticalFavorsService";

// Re-export for UI access (engine imports are restricted in pages)
export { POLITICAL_FAVORS };
import type { StatItem } from "@/components/layout/page-shell";
import { selectHeyasWithCriticalWelfare, selectMergerCandidates } from "../selectors";
import { scanRecentEvents } from "../../engine/events";
import { toScandalBand } from "@/engine/descriptorBands";
import type { ScandalBand } from "@/engine/systems/narrative/NarrativeBands";

export type { ScandalBand };

export interface GovernanceDerived {
  status: string;
  politicalCapital: number;
  scandal: number;
  scandalBand: ScandalBand;
  scandalTone: StatItem["tone"];
  welfareRisk: number;
  welfareLabel: string;
  welfareTone: StatItem["tone"];
  compState: string;
  compTone: StatItem["tone"];
  statusTone: StatItem["tone"];
  statusSub: string;
  unresolvedRulings: GovernanceRuling[];
  pendingRulings: GovernanceRuling[];
  criticalHeyas: ReturnType<typeof selectHeyasWithCriticalWelfare>;
  mergerCandidates: ReturnType<typeof selectMergerCandidates>;
  completedMergerEvents: Array<{
    id: string;
    year: number;
    week: number;
    data?: { heyaname?: string; heya?: string; reason?: string; incident?: string };
  }>;
  factionList: Faction[];
}

export function projectGovernanceDerived(world: WorldState, heya: Heya): GovernanceDerived {
  const status = heya.governanceStatus ?? "good_standing";
  const politicalCapital = heya.politicalCapital ?? 0;
  const scandal = heya.scandalScore ?? 0;

  const scandalBand = toScandalBand(scandal) as ScandalBand;
  const scandalTone: StatItem["tone"] =
    scandalBand === "clean"
      ? "success"
      : scandalBand === "whispers"
        ? "default"
        : scandalBand === "scrutiny"
          ? "warning"
          : "destructive";

  const welfare = heya.welfareState;
  const welfareRisk = Math.max(0, Math.min(100, Number(welfare?.welfareRisk ?? 10)));
  const compState = String(welfare?.complianceState ?? "compliant");
  const welfareLabel =
    welfareRisk <= 20
      ? "Safe"
      : welfareRisk <= 44
        ? "Cautious"
        : welfareRisk <= 69
          ? "Elevated"
          : "Critical";
  const welfareTone: StatItem["tone"] =
    welfareRisk <= 20
      ? "success"
      : welfareRisk <= 44
        ? "default"
        : welfareRisk <= 69
          ? "warning"
          : "destructive";
  const compTone: StatItem["tone"] =
    compState === "compliant" ? "success" : compState === "watch" ? "warning" : "destructive";

  const statusTone: StatItem["tone"] =
    status === "good_standing" ? "success" : status === "warning" ? "warning" : "destructive";
  const statusSub =
    status === "good_standing"
      ? "No active concerns"
      : status === "warning"
        ? "Council has noted concerns"
        : status === "probation"
          ? "Formal probation in effect"
          : "Serious sanctions applied";

  const governanceLog = world.governanceLog ?? [];

  const unresolvedRulings = governanceLog.filter(
    (r) => r.heyaId === world.playerHeyaId && !r.playerChoice
  );

  const pendingRulings = governanceLog.filter((r) => r.heyaId === heya.id && !r.playerSeverity);

  const criticalHeyas = selectHeyasWithCriticalWelfare(world);
  const mergerCandidates = selectMergerCandidates(world);

  const eventLog = world.events?.log ?? [];
  const completedMergerEvents = scanRecentEvents(eventLog, {
    types: ["GOVERNANCE_RULING"],
    limit: 10,
    predicate: (e) => e.data?.incident === "stable_merger",
  }) as Array<{
    id: string;
    year: number;
    week: number;
    data?: { heyaname?: string; heya?: string; reason?: string; incident?: string };
  }>;

  const factionList = Object.values(world.factions ?? {}).sort((a, b) => b.influence - a.influence);

  return {
    status,
    politicalCapital,
    scandal,
    scandalBand,
    scandalTone,
    welfareRisk,
    welfareLabel,
    welfareTone,
    compState,
    compTone,
    statusTone,
    statusSub,
    unresolvedRulings,
    pendingRulings,
    criticalHeyas,
    mergerCandidates,
    completedMergerEvents,
    factionList,
  };
}

// ── Gomenfuda (withdrawal apology) projection ──────────────────────────────

export interface GomenfudaProjection {
  /** Current year's gomenfuda count for the heya */
  count: number;
  /** Sanction threshold (3 per year) */
  threshold: number;
  /** Whether the heya has a sanction warning */
  hasSanctionWarning: boolean;
  /** Sanction risk percentage (0-100) based on count/threshold */
  sanctionRiskPercent: number;
  /** Recent gomenfuda events for this heya */
  recentEvents: Array<{
    rikishiId: string;
    bashoName: string;
    reason: string;
    reputationPenalty: number;
    year: number;
  }>;
}

/**
 * Project gomenfuda state for a heya. Reads the real event log and
 * countGomenfudaForHeya from GomenfudaService.
 */
export function projectGomenfuda(world: WorldState, heyaId: string): GomenfudaProjection {
  const year = world.year;
  const log = world.events?.log ?? [];
  const SANCTION_THRESHOLD = 3;

  const gomenfudaEvents = scanRecentEvents(log, {
    types: ["BASHO_STATUS"],
    category: "discipline",
    predicate: (e) => e.data?.status === "gomenfuda_posted" && e.data?.heyaId === heyaId,
  });

  const count = gomenfudaEvents.filter((e) => e.data?.year === year).length;
  const hasSanctionWarning = count >= SANCTION_THRESHOLD;
  const sanctionRiskPercent = Math.min(100, Math.round((count / SANCTION_THRESHOLD) * 100));

  const recentEvents = gomenfudaEvents.slice(0, 5).map((e) => ({
    rikishiId: String(e.data?.rikishiId ?? ""),
    bashoName: String(e.data?.bashoName ?? ""),
    reason: String(e.data?.reason ?? ""),
    reputationPenalty: Number(e.data?.reputationPenalty ?? 0),
    year: Number(e.data?.year ?? 0),
  }));

  return {
    count,
    threshold: SANCTION_THRESHOLD,
    hasSanctionWarning,
    sanctionRiskPercent,
    recentEvents,
  };
}
