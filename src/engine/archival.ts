import type { WorldState } from "./types/world";

/**
 * Prunes historical data based on world settings to preserve save-file health.
 * 
 * Logic:
 * - Aggressive: Keep only Makuuchi/Juryo logs for 2 years. Purge others.
 * - Standard: Keep all logs for 5 years. Purge lower division logs older than 5 years.
 * - Preserve Player: Never purge logs for player-owned Rikishi.
 */
export function runArchivalPruning(world: WorldState) {
  const mode = world.settings?.archiveMode || "standard";
  if (mode === "keep_all") return;

  const currentYear = world.year;
  const yearHorizon = mode === "aggressive" ? 2 : 5;
  const cutOffYear = currentYear - yearHorizon;

  for (const rikishi of world.rikishi.values()) {
    // Skip player-owned if setting allows
    if (mode === "preserve_player" && rikishi.heyaId === world.playerHeyaId) continue;

    // 1. Prune match logs (history)
    if (rikishi.history) {
      rikishi.history = rikishi.history.filter(log => {
        if (log.year && log.year > cutOffYear) return true;
        // Otherwise, if they are low-rank, prune it
        if (rikishi.division !== "makuuchi" && rikishi.division !== "juryo") return false;
        return (log.year || 0) > cutOffYear - 5; // Keep sekitori logs longer
      });
    }

    // 2. Prune CareerSnapshots
    if (rikishi.careerHistory) {
      rikishi.careerHistory = rikishi.careerHistory.filter(snap => {
        if (snap.isYusho) return true;
        if (snap.year > cutOffYear) return true;
        if (rikishi.division !== "makuuchi" && rikishi.division !== "juryo") return false;
        return snap.year > cutOffYear - 10; // Keep sekitori snapshots for 10 years
      });
    }
  }
}
