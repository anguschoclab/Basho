/**
 * medicalProjection.ts
 *
 * Medical and injury recovery related projection functions.
 * Extracted from uiDigest.ts to separate concerns.
 */

import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { AvatarRenderData } from "@/engine/types/avatar";
import { getHeyaRoster } from "@/engine/queries";
import { getCachedPerception } from "@/engine/perception";
import { resolveAvatar, rikishiStageInput } from "@/engine/avatarGenerator";
import { getFacilityLevelLabel } from "@/presenters/projections/facilityProjections";

/**
 * Project medical and injury recovery data.
 */
export function projectMedicalUIDigest(world: WorldState) {
  const playerHeyaId = world.playerHeyaId;
  if (!playerHeyaId) return null;
  const heya = world.heyas.get(playerHeyaId);
  if (!heya) return null;

  const roster = getHeyaRoster(world, playerHeyaId);
  const recoveryFacility = heya.facilities?.recovery ?? 50;
  const facilityLabel = getFacilityLevelLabel(recoveryFacility);

  // Bands come from the canonical perception snapshot (perception.ts /
  // constants/engine/perception) — the same source WelfarePanel and the NPC
  // AI use — so this panel can never disagree with the rest of the UI.
  const snapshot = getCachedPerception(world, playerHeyaId);
  const perceptionByRikishi = new Map(
    snapshot.rikishiPerceptions.map((p) => [p.rikishiId, p])
  );

  const rikishiHealthPerceptions: Array<{
    rikishiId: string;
    shikona: string;
    rank: string;
    healthBand: string;
    momentum: "rising" | "steady" | "declining";
    avatar?: AvatarRenderData;
  }> = roster.map((r) => {
    const perception = perceptionByRikishi.get(r.id);
    return {
      rikishiId: r.id,
      shikona: r.shikona,
      rank: r.rank ?? "—",
      healthBand: perception?.healthBand ?? "fair",
      momentum: perception?.momentum ?? "steady",
      avatar: resolveAvatar({
        id: r.id,
        stored: r.avatarConfig,
        nationality: r.nationality,
        ...rikishiStageInput(r, world.year),
      }),
    };
  });

  return {
    heyaName: heya.name,
    facilityLevel: recoveryFacility,
    facilityLabel,
    injuredRikishi: buildInjuredRikishi(roster, recoveryFacility, world.year),
    welfare: {
      welfareRisk: heya.welfareState?.welfareRisk ?? 0,

      activeDiet: heya.welfareState?.activeDiet ?? "maintenance",

      complianceState: heya.welfareState?.complianceState ?? "compliant",

      weeksInState: heya.welfareState?.weeksInState ?? 0,
    },
    perception: {
      welfareRiskBand: snapshot.welfareRiskBand,
      moraleBand: snapshot.moraleBand,
      rosterStrengthBand: snapshot.rosterStrengthBand,
      stableMediaHeatBand: snapshot.stableMediaHeatBand,
      rivalryPressureBand: snapshot.rivalryPressureBand,
      rikishiHealthPerceptions,
    },
  };
}

/** Build the injured-rikishi projection rows for the medical digest. */
function buildInjuredRikishi(roster: Rikishi[], recoveryFacility: number, year: number) {
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
    avatar?: AvatarRenderData;
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
      severity: typeof injuryStatus?.severity === "string" ? injuryStatus.severity : "unknown",
      location: injuryStatus?.location ?? "unknown",
      weeksRemaining,
      weeksTotal,
      recoveryProgress: Math.min(100, Math.max(0, recoveryProgress)),
      facilityBonus,
      isKyujo: r.isKyujo ?? false,
      avatar: resolveAvatar({
        id: r.id,
        stored: r.avatarConfig,
        nationality: r.nationality,
        ...rikishiStageInput(r, year),
      }),
    });
  }
  return result;
}
