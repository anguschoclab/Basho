/**
 * src/engine/health/physioPurchase.ts
 * ===================================
 * BUY_PHYSIO (P6) — paid physiotherapy session that accelerates recovery.
 * Cost-gated variant of the free `treatInjury` path: one session reduces
 * `injuryWeeksRemaining` by 1 (min 0), costs PHYSIO_SESSION_COST, and is
 * only valid for an injured, non-retired rikishi of the player's heya.
 */

import type { WorldState } from "@/engine/types/world";
import type { StateImpact } from "@/engine/core/StateImpact";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { getHeya, getRikishi } from "@/engine/core/queries";

export const PHYSIO_SESSION_COST = 80_000;
/** Max weeks a single session can remove. */
export const PHYSIO_WEEKS_PER_SESSION = 1;

export function buyPhysioSession(world: WorldState, rikishiId: string): StateImpact {
  const builder = createImpactBuilder("buyPhysioSession");
  const r = getRikishi(world, rikishiId);
  if (!r || r.isRetired) return builder.build();
  const heya = r.heyaId ? getHeya(world, r.heyaId) : undefined;
  if (!heya) return builder.build();
  if (!r.injured || (r.injuryWeeksRemaining ?? 0) <= 0) return builder.build();
  if ((heya.funds ?? 0) < PHYSIO_SESSION_COST) return builder.build();

  const nextWeeks = Math.max(0, (r.injuryWeeksRemaining ?? 0) - PHYSIO_WEEKS_PER_SESSION);
  builder.updateHeya(heya.id, { funds: Math.round(heya.funds - PHYSIO_SESSION_COST) });
  builder.updateRikishi(rikishiId, {
    injuryWeeksRemaining: nextWeeks,
    injured: nextWeeks > 0,
    isKyujo: nextWeeks > 0 ? r.isKyujo : false,
    injuryStatus: r.injuryStatus
      ? { ...r.injuryStatus, weeksRemaining: nextWeeks, isInjured: nextWeeks > 0 }
      : r.injuryStatus,
  });
  builder.logEvent(
    "MEDICAL_REPORT",
    "injury",
    {
      title: `Physio session for ${r.shikona}`,
      summary: `${r.shikona} completes a physiotherapy session — ${nextWeeks} week(s) of recovery remaining.`,
      rikishiId,
      weeksRemaining: nextWeeks,
      cost: PHYSIO_SESSION_COST,
    },
    { heyaId: heya.id, rikishiId, importance: "minor" }
  );
  return builder.build();
}
