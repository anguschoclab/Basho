/**
 * Rivals Transformer
 * ==================
 * Transforms head-to-head and rival data.
 */

import type { Rikishi } from "../../../engine/types/rikishi";
import type { WorldState } from "../../../engine/types/world";
import type { UIRivalEntry } from "../types";

/**
 * Calculate top rivals for a rikishi.
 */
export function calculateTopRivals(r: Rikishi, world: WorldState): UIRivalEntry[] {
  const h2h = r.h2h ?? {};
  const rivalriesState = world.rivalriesState;

  // ⚡ Bolt Optimization: Use Object.keys() to avoid O(N) tuple allocations from Object.entries()
  return Object.keys(h2h)
    .map((oppId) => {
      const rec = h2h[oppId];
      const opp = world.rikishi.get(oppId);
      const hKey = r.id < oppId ? `${r.id}|${oppId}` : `${oppId}|${r.id}`;
      const rivalry = rivalriesState?.pairs?.[hKey];

      return {
        opponentId: oppId,
        opponentShikona: opp?.shikona ?? "Unknown",
        wins: (rec as { wins: number }).wins,
        losses: (rec as { losses: number }).losses,
        record: `${(rec as { wins: number }).wins}-${(rec as { losses: number }).losses}`,
        totalBouts: (rec as { wins: number }).wins + (rec as { losses: number }).losses,
        heat: rivalry?.heat ?? 0,
        tone: rivalry?.tone ?? "respect",
      };
    })
    .sort((a, b) => b.heat - a.heat || b.totalBouts - a.totalBouts)
    .slice(0, 5);
}
