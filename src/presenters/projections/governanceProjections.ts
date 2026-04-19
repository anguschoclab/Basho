/**
 * governanceProjections.ts
 *
 * Governance page data projection.
 * Consolidates world.governanceLog, scandal, political capital, welfare warnings.
 */

import type { WorldState } from "../../engine/types/world";
import { selectHeyasWithCriticalWelfare, selectMergerCandidates } from "../selectors";

export type ScandalBand = "clean" | "whispers" | "scrutiny" | "scandal" | "crisis";

export interface GovernanceSummary {
  status: string;
  scandalScore: number;
  scandalBand: ScandalBand;
  politicalCapital: number;
  politicalCapitalMax: number;
  isSanctioned: boolean;
  welfareWarnings: Array<{ heyaId: string; heyaName: string; riskBand: string }>;
  mergerCandidates: Array<{ heyaId: string; heyaName: string; funds: number }>;
  governanceLog: unknown[];
}

function toScandalBand(score: number): ScandalBand {
  if (score < 10) return "clean";
  if (score < 30) return "whispers";
  if (score < 55) return "scrutiny";
  if (score < 80) return "scandal";
  return "crisis";
}

export function projectGovernancePage(world: WorldState, heyaId: string): GovernanceSummary | null {
  const heya = world.heyas.get(heyaId);
  if (!heya) return null;

  const h = heya as unknown as Record<string, unknown>;
  const scandalScore = (h.scandalScore as number) ?? 0;
  const status = (h.governanceStatus as string) ?? "good_standing";
  const politicalCapital = (h.politicalCapital as number) ?? 0;

  const welfareWarnings = selectHeyasWithCriticalWelfare(world).map((w) => ({
    heyaId: w.id,
    heyaName: w.name,
    riskBand: "critical",
  }));

  const mergerCandidates = selectMergerCandidates(world).map((m) => ({
    heyaId: m.id,
    heyaName: m.name,
    funds: m.funds ?? 0,
  }));

  return {
    status,
    scandalScore,
    scandalBand: toScandalBand(scandalScore),
    politicalCapital,
    politicalCapitalMax: 100,
    isSanctioned: status === "sanctioned",
    welfareWarnings,
    mergerCandidates,
    governanceLog: world.governanceLog ?? [],
  };
}
