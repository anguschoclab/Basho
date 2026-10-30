/**
 * src/engine/welfare/harmony.ts
 * =============================
 * Stable Harmony — the headline "stable mood" metric (P2). Derived, never
 * stored: computed from welfare state, staff morale, intra-heya rivalries,
 * and recent scandal pressure.
 */

import type { WorldState } from "@/engine/types/world";
import { getHeya } from "@/engine/core/queries";
import { clamp } from "@/engine/utils/math";

export type HarmonyBand = "hostile" | "uneasy" | "steady" | "harmonious";

export interface StableHarmony {
  /** 0–100 composite. */
  score: number;
  band: HarmonyBand;
  /** Component contributions for UI tooltips / debugging. */
  factors: {
    morale: number;
    welfare: number;
    staff: number;
    rivalries: number;
    scandal: number;
  };
}

export function harmonyBandFor(score: number): HarmonyBand {
  if (score < 25) return "hostile";
  if (score < 45) return "uneasy";
  if (score < 70) return "steady";
  return "harmonious";
}

/** Count intra-heya rivalry pairs (both members in `heyaId`). */
function intraHeyaRivalryPairs(world: WorldState, heyaId: string): number {
  const pairs = world.rivalriesState?.heyaRivalryPairs;
  if (!pairs) return 0;
  let count = 0;
  const seen = new Set<string>();
  const list = Array.isArray(pairs) ? pairs : Object.values(pairs as Record<string, unknown>);
  for (const entry of list as Array<{ a?: string; b?: string; rikishiAId?: string; rikishiBId?: string }>) {
    const a = entry.rikishiAId ?? entry.a;
    const b = entry.rikishiBId ?? entry.b;
    if (!a || !b) continue;
    const ra = world.rikishi.get(a);
    const rb = world.rikishi.get(b);
    if (ra?.heyaId === heyaId && rb?.heyaId === heyaId) {
      const key = [a, b].sort().join(":");
      if (!seen.has(key)) {
        seen.add(key);
        count++;
      }
    }
  }
  return count;
}

/** Derive the stable's harmony score. */
export function deriveStableHarmony(world: WorldState, heyaId: string): StableHarmony {
  const heya = getHeya(world, heyaId);
  if (!heya) {
    return { score: 50, band: "steady", factors: { morale: 0, welfare: 0, staff: 0, rivalries: 0, scandal: 0 } };
  }

  const morale = heya.welfareState?.morale ?? 50;
  const welfareRisk = heya.welfareState?.welfareRisk ?? 0;

  // Staff morale — mean of the heya's staff (default neutral when none).
  const staffMembers = (heya.staffIds ?? [])
    .map((id) => world.staff.get(id))
    .filter((s): s is NonNullable<typeof s> => !!s);
  const staffMorale =
    staffMembers.length > 0
      ? staffMembers.reduce((s, m) => s + (m.morale ?? 50), 0) / staffMembers.length
      : 55;

  const rivalryPairs = intraHeyaRivalryPairs(world, heyaId);
  const scandal = clamp(heya.scandalScore ?? 0, 0, 100);

  // Weighted composite: morale & welfare dominate; rivalries and scandal drag.
  const score = clamp(
    Math.round(
      morale * 0.45 +
        (100 - welfareRisk) * 0.25 +
        staffMorale * 0.15 +
        (100 - Math.min(100, rivalryPairs * 20)) * 0.05 +
        (100 - scandal) * 0.1 -
        10 // bias so 50-avg inputs land mid-band
    ),
    0,
    100
  );

  return {
    score,
    band: harmonyBandFor(score),
    factors: {
      morale,
      welfare: welfareRisk,
      staff: Math.round(staffMorale),
      rivalries: rivalryPairs,
      scandal,
    },
  };
}
