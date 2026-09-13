/**
 * OpponentModel.ts
 * ================
 * Builds a learned, deterministic model of an opponent's preferred tactics
 * from their recent match history and combat profile.
 *
 * The model is intentionally banded: it counts observed tactical families rather
 * than exposing hidden physics state.
 */

import type { Rikishi } from "../types/rikishi";
import type { Id } from "../types/common";
import type { OpponentTacticModel } from "../ai/types";
import type { TacticalFamily } from "../types/combat";

export type { OpponentTacticModel } from "../ai/types";

const FAMILY_BY_KIMARITE: Record<string, TacticalFamily> = {
  // Push / thrust family
  oshidashi: "push",
  oshitaoshi: "push",
  tsukidashi: "push",
  tsukitaoshi: "push",
  tsuppari: "push",
  hatakikomi: "push",
  // Belt / grapple family
  yorikiri: "belt",
  yoritaoshi: "belt",
  uwatenage: "belt",
  shitatenage: "belt",
  sukuinage: "belt",
  // Trick / defensive family
  henka: "trick",
  tottari: "trick",
  sotogake: "trick",
  ketaguri: "trick",
  izori: "trick",
  // Speed / movement family
  okuridashi: "speed",
  okuritaoshi: "speed",
  tsuridashi: "speed",
  tsuritaoshi: "speed",
  kimedashi: "speed",
};

function familyFromKimarite(kimarite?: string): TacticalFamily {
  if (!kimarite) return "push";
  return FAMILY_BY_KIMARITE[kimarite.toLowerCase()] ?? "push";
}

export function familyFromStyle(style?: string): TacticalFamily {
  if (style === "oshi") return "push";
  if (style === "yotsu") return "belt";
  return "push";
}

/** Deterministic argmax over tactic counts (count desc, label asc on ties). */
function dominantTactic(counts: Record<string, number>): string | undefined {
  let best: string | undefined;
  let bestCount = -1;
  for (const label of Object.keys(counts).sort()) {
    if (counts[label] > bestCount) {
      best = label;
      bestCount = counts[label];
    }
  }
  return bestCount > 0 ? best : undefined;
}

function dominantFamily(counts: OpponentTacticModel["familyCounts"]): TacticalFamily {
  const entries = Object.entries(counts) as [TacticalFamily, number][];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? "push";
}

/**
 * Build a fresh opponent model for a rikishi using recent match history.
 * If the rikishi has no history, falls back to style / combat profile.
 */
export function buildOpponentModel(rikishi: Rikishi, currentWeek = 0): OpponentTacticModel {
  const counts = { push: 0, belt: 0, trick: 0, speed: 0 };
  let sampleSize = 0;
  let mostUsedKimarite = "";
  let maxKimariteCount = 0;
  const kimariteCounts: Record<string, number> = {};

  const recentHistory = (rikishi.history ?? []).slice(-20);
  for (const entry of recentHistory) {
    const family = familyFromKimarite(entry.kimarite);
    counts[family]++;
    sampleSize++;

    const key = entry.kimarite ?? "unknown";
    kimariteCounts[key] = (kimariteCounts[key] ?? 0) + 1;
    if (kimariteCounts[key] > maxKimariteCount) {
      maxKimariteCount = kimariteCounts[key];
      mostUsedKimarite = key;
    }
  }

  // If no history exists, seed the model from the rikishi's style.
  if (sampleSize === 0) {
    const styleFamily = familyFromStyle(rikishi.style);
    counts[styleFamily] += 3;
    sampleSize += 3;
  }

  return {
    rikishiId: rikishi.id,
    sampleSize,
    familyCounts: counts,
    tacticCounts: kimariteCounts,
    mostUsedTactic: mostUsedKimarite || undefined,
    lastUpdated: currentWeek,
  };
}

function observe(
  model: OpponentTacticModel,
  opponentId: Id,
  family: TacticalFamily,
  tacticLabel: string | undefined,
  currentWeek: number
): OpponentTacticModel {
  const tacticCounts = { ...(model.tacticCounts ?? {}) };
  if (tacticLabel) {
    tacticCounts[tacticLabel] = (tacticCounts[tacticLabel] ?? 0) + 1;
  }
  return {
    ...model,
    rikishiId: opponentId,
    sampleSize: model.sampleSize + 1,
    familyCounts: {
      ...model.familyCounts,
      [family]: (model.familyCounts[family] ?? 0) + 1,
    },
    tacticCounts,
    mostUsedTactic: dominantTactic(tacticCounts) ?? model.mostUsedTactic,
    lastUpdated: currentWeek,
  };
}

/**
 * Update an existing model with a new bout result.
 */
export function observeBoutResult(
  model: OpponentTacticModel,
  opponentId: Id,
  kimarite: string,
  currentWeek: number,
  tacticLabel?: string
): OpponentTacticModel {
  return observe(model, opponentId, familyFromKimarite(kimarite), tacticLabel ?? kimarite, currentWeek);
}

/**
 * Update an existing model with a tactical-family observation (e.g., the
 * tactic a losing rikishi was resolved with, which produced no kimarite).
 */
export function observeOpponentFamily(
  model: OpponentTacticModel,
  opponentId: Id,
  family: TacticalFamily,
  currentWeek: number,
  tacticLabel?: string
): OpponentTacticModel {
  return observe(model, opponentId, family, tacticLabel, currentWeek);
}

/** Return the inferred dominant tactical family of an opponent. */
export function getOpponentDominantFamily(model: OpponentTacticModel): TacticalFamily {
  return dominantFamily(model.familyCounts);
}

/** Return the recommended counter tactic based on the opponent model. */
export function suggestCounterTactic(model: OpponentTacticModel): TacticalFamily {
  const family = dominantFamily(model.familyCounts);
  switch (family) {
    case "push":
      return "belt";
    case "belt":
      return "trick";
    case "trick":
      return "push";
    case "speed":
      return "push";
    default:
      return "push";
  }
}
