/**
 * src/engine/rikishi/signatureKimarite.ts
 * =======================================
 * Signature kimarite (P6) — derived from `rikishi.history: MatchResultLog[]`
 * (each entry records the winning `kimarite`). Cached tallies may be stored
 * on `rikishi.kimariteWins` but are always re-derivable.
 */

import type { Rikishi } from "@/engine/types/rikishi";

export interface SignatureKimarite {
  /** Most-used winning technique (kimarite id), or null when no wins. */
  kimariteId: string | null;
  wins: number;
  /** Full tally for display ("signature move" runners-up). */
  tally: Record<string, number>;
}

/** Tally a rikishi's wins by kimarite. */
export function tallyKimariteWins(rikishi: Pick<Rikishi, "history">): Record<string, number> {
  const tally: Record<string, number> = {};
  for (const m of rikishi.history ?? []) {
    if (!m.win || !m.kimarite) continue;
    tally[m.kimarite] = (tally[m.kimarite] ?? 0) + 1;
  }
  return tally;
}

/**
 * Derive the signature kimarite — most frequent winning technique.
 * Ties break deterministically by kimarite id (lexicographic).
 */
export function deriveSignatureKimarite(
  rikishi: Pick<Rikishi, "history" | "kimariteWins">
): SignatureKimarite {
  const tally = rikishi.kimariteWins ?? tallyKimariteWins(rikishi);
  let best: string | null = null;
  let bestWins = 0;
  for (const [id, wins] of Object.entries(tally)) {
    if (wins > bestWins || (wins === bestWins && best !== null && id < best)) {
      best = id;
      bestWins = wins;
    }
  }
  return { kimariteId: best, wins: bestWins, tally };
}
