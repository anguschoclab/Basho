/**
 * Kimarite Transformer
 * ====================
 * Transforms kimarite (winning technique) statistics.
 */

import type { Rikishi } from "../../../engine/types/rikishi";
import { SeededRNG } from "../../../engine/rng";
import { BardEngine } from "../../../engine/narrative/BardEngine";
import type { RikishiKimariteDTO } from "../types";

interface MatchHistoryEntry {
  win?: boolean;
  kimarite?: string;
}

/**
 * Calculate most frequent kimarite from history.
 */
export function calculateMostFrequentKimarite(
  history: MatchHistoryEntry[]
): { kimarite: string; percentage: number }[] {
  if (!history || history.length === 0) return [];
  const winCounts: Record<string, number> = {};
  let totalWins = 0;
  for (const match of history) {
    if (match.win && match.kimarite) {
      winCounts[match.kimarite] = (winCounts[match.kimarite] || 0) + 1;
      totalWins++;
    }
  }
  if (totalWins === 0) return [];
  // ⚡ Bolt Optimization: Use Object.keys() to avoid O(N) tuple allocations from Object.entries()
  return Object.keys(winCounts)
    .sort((a, b) => winCounts[b] - winCounts[a])
    .map((kimarite) => ({
      kimarite,
      percentage: Math.round((winCounts[kimarite] / totalWins) * 100),
    }));
}

/**
 * Build display string for favored kimarite.
 */
export function buildFavoredKimariteDisplay(
  rng: SeededRNG,
  entries: { kimarite: string; percentage: number }[]
): string {
  if (entries.length === 0) {
    return BardEngine.resolve(rng, "ui.labels.kimarite.rookie").text;
  }
  const top = entries[0];
  const name = top.kimarite.charAt(0).toUpperCase() + top.kimarite.slice(1);
  return BardEngine.resolve(rng, "ui.labels.kimarite.display_format", {
    NAME: name,
    PCT: top.percentage.toString(),
  }).text;
}

/**
 * Transform kimarite fields.
 */
export function toKimariteDTO(r: Rikishi, rng: SeededRNG): RikishiKimariteDTO {
  const favoredKimariteDetailed = calculateMostFrequentKimarite(r.history ?? []);

  return {
    favoredKimariteDetailed,
    favoredKimariteDisplay: buildFavoredKimariteDisplay(rng, favoredKimariteDetailed),
    favoredKimarite: favoredKimariteDetailed
      .slice(0, 1)
      .map((e) => `${e.kimarite} (${e.percentage}%)`),
  };
}
