/**
 * Rivals Transformer
 * ==================
 * Transforms head-to-head and rival data.
 */

import type { Rikishi } from "@/engine/types/rikishi";
import type { WorldState } from "@/engine/types/world";
import type { UIRivalEntry } from "@/presenters/rikishi/types";

/**
 * Calculate top rivals for a rikishi.
 */
export function calculateTopRivals(r: Rikishi, world: WorldState): UIRivalEntry[] {
  const h2h = r.h2h ?? {};
  const rivalriesState = world.rivalriesState;

  return Object.keys(h2h)
    .map((oppId) => {
      const rec = h2h[oppId];
      const opp = world.rikishi.get(oppId);
      const hKey = r.id < oppId ? `${r.id}|${oppId}` : `${oppId}|${r.id}`;
      const rivalry = rivalriesState?.pairs?.[hKey];

      return {
        opponentId: oppId,
        opponentShikona: opp?.shikona ?? "Unknown",
        wins: rec.wins,
        losses: rec.losses,
        record: `${rec.wins}-${rec.losses}`,
        totalBouts: rec.wins + rec.losses,
        heat: rivalry?.heat ?? 0,
        tone: rivalry?.tone ?? "respect",
        streak: rec.streak ?? 0,
      };
    })
    .sort((a, b) => b.heat - a.heat || b.totalBouts - a.totalBouts)
    .slice(0, 5);
}
