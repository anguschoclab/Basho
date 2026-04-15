/**
 * medicalProjection.ts
 *
 * Medical and injury recovery related projection functions.
 * Extracted from uiDigest.ts to separate concerns.
 */

import type { WorldState } from "../../engine/types/world";
import { SeededRNG } from "../../engine/rng";
import { BardEngine } from "../../engine/narrative/BardEngine";
import { getHeyaRoster } from "../../engine/queries";

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
  const injured = roster.filter((r) => r.injured);
  const rng = world.rng || new SeededRNG(world.seed || "medical_digest");

  const recoveryFacility = heya.facilities?.recovery ?? 50;
  const facilityLabel = getFacilityLevelLabel(rng, recoveryFacility);

  return {
    heyaName: heya.name,
    facilityLevel: recoveryFacility,
    facilityLabel,
    injuredRikishi: injured.map((r) => {
      const injuryStatus = r.injuryStatus;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const weeksRemaining = r.injuryWeeksRemaining ?? (injuryStatus as any)?.weeksRemaining ?? 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const weeksTotal = (injuryStatus as any)?.weeksToHeal ?? weeksRemaining + 2;
      const recoveryProgress =
        weeksTotal > 0 ? Math.round(((weeksTotal - weeksRemaining) / weeksTotal) * 100) : 0;
      const facilityBonus = Math.round((recoveryFacility - 50) / 10);

      return {
        id: r.id,
        shikona: r.shikona,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        severity:
          typeof (injuryStatus as any)?.severity === "string"
            ? (injuryStatus as any).severity
            : "unknown",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        location: (injuryStatus as any)?.location || "unknown",
        weeksRemaining,
        weeksTotal,
        recoveryProgress: Math.min(100, Math.max(0, recoveryProgress)),
        facilityBonus,
      };
    }),
    welfare: {
      welfareRisk: heya.welfareState?.welfareRisk ?? 0,

      activeDiet: heya.welfareState?.activeDiet ?? "maintenance",

      complianceState: heya.welfareState?.complianceState ?? "compliant",

      weeksInState: heya.welfareState?.weeksInState ?? 0,
    },
  };
}
