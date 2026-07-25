/**
 * medicalProjection.ts
 *
 * Medical and injury recovery related projection functions.
 * Extracted from uiDigest.ts to separate concerns.
 */

import type { WorldState } from "../../engine/types/world";
import { SeededRNG } from "../../engine/rng";
import { BardEngine } from "../../engine/bard/BardEngine";
import { getHeyaRoster } from "../../engine/queries";
import { isSekitoriDivision } from "@/constants/engine/rankDisplay";

function getFacilityLevelLabel(rng: SeededRNG, level: number): string {
  let band = "limited";
  if (level >= 85) band = "exceptional";
  else if (level >= 65) band = "outstanding";
  else if (level >= 45) band = "strong";
  else if (level >= 25) band = "capable";

  // Note: re-using rikishi stats bands for facility quality labels
  return BardEngine.resolve(rng, `rikishi.stats.power.${band}`).text.split(" — ")[0].split(".")[0];
}

/**
 * Project medical and injury recovery data.
 */
export function projectMedicalUIDigest(world: WorldState) {
  const playerHeyaId = world.playerHeyaId;
  if (!playerHeyaId) return null;
  const heya = world.heyas.get(playerHeyaId);
  if (!heya) return null;

  const roster = getHeyaRoster(world, playerHeyaId);
  const rng = world.rng || new SeededRNG(world.seed || "medical_digest");

  const recoveryFacility = heya.facilities?.recovery ?? 50;
  const facilityLabel = getFacilityLevelLabel(rng, recoveryFacility);

  // Build a perception summary used by WelfarePanel. Bands derived from raw
  // welfare/morale numbers using simple thresholds.
  const welfareRisk = heya.welfareState?.welfareRisk ?? 0;
  const welfareRiskBand: "safe" | "cautious" | "elevated" | "critical" =
    welfareRisk >= 75
      ? "critical"
      : welfareRisk >= 50
        ? "elevated"
        : welfareRisk >= 25
          ? "cautious"
          : "safe";

  const morale = (heya.welfareState as unknown as { morale?: number })?.morale ?? 50;
  const moraleBand: "inspired" | "content" | "neutral" | "disgruntled" | "mutinous" =
    morale >= 80
      ? "inspired"
      : morale >= 60
        ? "content"
        : morale >= 40
          ? "neutral"
          : morale >= 20
            ? "disgruntled"
            : "mutinous";

  const rosterSize = roster.length;
  const sekitoriCount = roster.filter(
    (r) => isSekitoriDivision(r.division)
  ).length;
  const rosterStrengthBand: "dominant" | "strong" | "competitive" | "developing" | "weak" =
    sekitoriCount >= 6
      ? "dominant"
      : sekitoriCount >= 4
        ? "strong"
        : sekitoriCount >= 2
          ? "competitive"
          : rosterSize >= 5
            ? "developing"
            : "weak";

  const rikishiHealthPerceptions: Array<{
    rikishiId: string;
    shikona: string;
    rank: string;
    healthBand: string;
    momentum: "rising" | "stable" | "declining";
  }> = roster.map((r) => {
    const condition = (r as unknown as { condition?: number }).condition ?? 100;
    const band =
      condition >= 90
        ? "peak"
        : condition >= 70
          ? "good"
          : condition >= 50
            ? "fair"
            : condition >= 30
              ? "worn"
              : "fragile";
    return {
      rikishiId: r.id,
      shikona: r.shikona,
      rank: r.rank ?? "—",
      healthBand: band,
      momentum: "stable" as const,
    };
  });

  return {
    heyaName: heya.name,
    facilityLevel: recoveryFacility,
    facilityLabel,
    injuredRikishi: (() => {
      const result: Array<{
        id: string;
        shikona: string;
        severity: string;
        location: string;
        weeksRemaining: number;
        weeksTotal: number;
        recoveryProgress: number;
        facilityBonus: number;
        isKyujo: boolean;
      }> = [];
      for (const r of roster) {
        if (!r.injured) continue;
        const injuryStatus = r.injuryStatus;
        const weeksRemaining = r.injuryWeeksRemaining ?? injuryStatus?.weeksRemaining ?? 0;
        const weeksTotal = injuryStatus?.weeksToHeal ?? weeksRemaining + 2;
        const recoveryProgress =
          weeksTotal > 0 ? Math.round(((weeksTotal - weeksRemaining) / weeksTotal) * 100) : 0;
        const facilityBonus = Math.round((recoveryFacility - 50) / 10);

        result.push({
          id: r.id,
          shikona: r.shikona,
          severity:
            typeof (injuryStatus as unknown as Record<string, unknown>)?.severity === "string"
              ? ((injuryStatus as unknown as Record<string, unknown>).severity as string)
              : "unknown",
          location:
            ((injuryStatus as unknown as Record<string, unknown>)?.location as string) || "unknown",
          weeksRemaining,
          weeksTotal,
          recoveryProgress: Math.min(100, Math.max(0, recoveryProgress)),
          facilityBonus,
          isKyujo: r.isKyujo ?? false,
        });
      }
      return result;
    })(),
    welfare: {
      welfareRisk: heya.welfareState?.welfareRisk ?? 0,

      activeDiet: heya.welfareState?.activeDiet ?? "maintenance",

      complianceState: heya.welfareState?.complianceState ?? "compliant",

      weeksInState: heya.welfareState?.weeksInState ?? 0,
    },
    perception: {
      welfareRiskBand,
      moraleBand,
      rosterStrengthBand,
      stableMediaHeatBand: "neutral" as string,
      rivalryPressureBand: "neutral" as string,
      rikishiHealthPerceptions,
    },
  };
}
