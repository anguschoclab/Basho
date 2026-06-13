/**
 * stableProjections.ts
 *
 * Stable overview summary projection for the Control Center and Stable page.
 * Reads from PerceptionSnapshot + raw heya data.
 */

import type { WorldState } from "../../engine/types/world";
import { getCachedPerception } from "../uiDigest";
import type { WelfareRiskBand, MoraleBand } from "../../engine/perception";

export interface StableSummary {
  heyaName: string;
  rosterSize: number;
  sekitoriCount: number;
  injuredCount: number;
  activeStaffCount: number;
  welfareRisk: WelfareRiskBand;
  morale: MoraleBand;
  statureBand: string;
  prestigeBand: string;
  koenkaiBand: string;
  scandalScore: number;
  complianceState: string;
  runwayBand: string;
}

export function projectStableSummary(world: WorldState, heyaId: string): StableSummary | null {
  const heya = world.heyas.get(heyaId);
  if (!heya) return null;

  const perception = getCachedPerception(world, heyaId);

  let sekitoriCount = 0;
  let injuredCount = 0;
  for (const id of heya.rikishiIds ?? []) {
    const r = world.rikishi.get(id);
    if (!r) continue;
    if (r.division === "makuuchi" || r.division === "juryo") sekitoriCount++;
    if (r.injury != null) injuredCount++;
  }

  const activeStaffCount = heya.staffIds?.length ?? 0;
  const scandalScore = ((heya as unknown as Record<string, unknown>).scandalScore as number) ?? 0;
  const complianceState =
    ((heya as unknown as Record<string, unknown>).governanceStatus as string) ?? "good_standing";

  return {
    heyaName: heya.name,
    rosterSize: heya.rikishiIds?.length ?? 0,
    sekitoriCount,
    injuredCount,
    activeStaffCount,
    welfareRisk: perception?.welfareRiskBand ?? "safe",
    morale: perception?.moraleBand ?? "neutral",
    statureBand: perception?.statureBand ?? "minor",
    prestigeBand: perception?.prestigeBand ?? "respectable",
    koenkaiBand: heya.koenkaiBand ?? "none",
    scandalScore,
    complianceState,
    runwayBand: perception?.runwayBand ?? "comfortable",
  };
}
