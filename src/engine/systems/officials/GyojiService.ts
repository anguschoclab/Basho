/**
 * Gyoji Service — manages gyoji assignment, career tracking, and shimpan panels.
 */

import type { Gyoji, Shimpan, ShimpanPanel } from "../../types/gyoji";
import type { Id } from "../../types/common";
import { SeededRNG } from "../../rng";

/** Generate a gyoji with deterministic stats from a seed. */
export function generateGyoji(seed: string, rank: Gyoji["rank"], index: number): Gyoji {
  const rng = new SeededRNG(`${seed}-gyoji-${index}`);
  const accuracyBase = rank === "tate" ? 75 : rank === "fuku-tate" ? 70 : rank === "sanyaku" ? 65 : 55;
  const accuracy = Math.max(30, Math.min(95, accuracyBase + Math.floor(rng.next() * 20 - 10)));
  const surnames = ["Kimura", "Shikimori", "Inosuke", "Hideki", "Toshio", "Masaru"];
  const givenName = rank === "tate" ? "Shonosuke" : "Kazuki";
  const surname = surnames[Math.floor(rng.next() * surnames.length)];

  return {
    id: `gyoji-${rank}-${index}` as Id,
    name: `${surname} ${givenName}`,
    rank,
    accuracy,
    yearsActive: Math.floor(rng.next() * 15) + 1,
    boutsOfficiated: 0,
    callsReversed: 0,
  };
}

/** Generate a shimpan (judge) with deterministic stats from a seed. */
export function generateShimpan(seed: string, index: number): Shimpan {
  const rng = new SeededRNG(`${seed}-shimpan-${index}`);
  const accuracy = Math.max(40, Math.min(90, 60 + Math.floor(rng.next() * 30 - 15)));
  const surnames = ["Iwai", "Nakamura", "Tanaka", "Sato", "Suzuki"];
  const name = surnames[Math.floor(rng.next() * surnames.length)];

  return {
    id: `shimpan-${index}` as Id,
    name,
    accuracy,
    yearsActive: Math.floor(rng.next() * 20) + 1,
    consultations: 0,
  };
}

/**
 * Assign a gyoji to a bout deterministically based on bout seed.
 * Higher-rank gyoji are assigned to higher-profile bouts.
 */
export function assignGyojiToBout(
  gyojiPool: Gyoji[],
  boutSeed: string,
  boutImportance: number
): Gyoji | null {
  if (gyojiPool.length === 0) return null;
  const rng = new SeededRNG(`${boutSeed}-gyoji-assign`);

  // Sort by rank (tate first) and accuracy
  const sorted = [...gyojiPool].sort((a, b) => {
    const rankOrder: Record<string, number> = {
      tate: 0,
      "fuku-tate": 1,
      sanyaku: 2,
      makuuchi: 3,
      juryo: 4,
      makushita: 5,
    };
    const rankDiff = rankOrder[a.rank] - rankOrder[b.rank];
    if (rankDiff !== 0) return rankDiff;
    return b.accuracy - a.accuracy;
  });

  // High-importance bouts get top gyoji; lower bouts get random selection
  if (boutImportance >= 80) {
    return sorted[0];
  }

  // Weighted random selection favoring higher-ranked gyoji
  const idx = Math.floor(rng.next() * Math.min(sorted.length, 4));
  return sorted[idx];
}

/**
 * Assemble a shimpan panel for a bout's mono-ii.
 * 1 chief + 4 panelists = 5 judges total.
 */
export function assembleShimpanPanel(
  shimpanPool: Shimpan[],
  boutSeed: string
): ShimpanPanel | null {
  if (shimpanPool.length < 5) return null;
  const rng = new SeededRNG(`${boutSeed}-shimpan-panel`);
  const indices = [...Array(shimpanPool.length).keys()];
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const selected = indices.slice(0, 5).map((i) => shimpanPool[i]);
  return {
    chief: selected[0],
    panelists: selected.slice(1, 5),
  };
}

/**
 * Record a bout officiation in the gyoji's career history.
 */
export function recordGyojiBout(
  gyoji: Gyoji,
  bashoName: string,
  year: number,
  reversed: boolean
): Gyoji {
  return {
    ...gyoji,
    boutsOfficiated: gyoji.boutsOfficiated + 1,
    callsReversed: gyoji.callsReversed + (reversed ? 1 : 0),
    careerHistory: [
      ...(gyoji.careerHistory ?? []),
      {
        bashoName,
        year,
        boutsOfficiated: 1,
        reversals: reversed ? 1 : 0,
      },
    ],
  };
}
