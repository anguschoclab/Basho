/**
 * uiFormatters.ts
 *
 * Formatting functions for UI data presentation.
 * Extracted from uiDigest.ts to separate concerns.
 */

import { SeededRNG } from "../engine/rng";
import { BardEngine } from "../engine/bard/BardEngine";
import { getKimarite } from "../engine/kimarite";
import type { Rikishi } from "../engine/types/rikishi";
import type { WorldState } from "../engine/types/world";
import type { EraTone } from "../engine/systems/meta/EraDriftService";

/**
 * FM v2.0: Formats Rikishi attribute data for Radar Charts (C5 compliant).
 * Maps 0-100 internal truths into 5 banded tiers (1-5) for visual shape only.
 */
export function formatRadarData(rikishi: Rikishi) {
  const mapValue = (val: number) => {
    if (val >= 85) return 5;
    if (val >= 65) return 4;
    if (val >= 45) return 3;
    if (val >= 25) return 2;
    return 1;
  };

  const rng = new SeededRNG(rikishi.id + "_radar");
  return [
    {
      subject: BardEngine.resolve(rng, "ui.labels.stats.power").text,
      A: mapValue(rikishi.stats?.power ?? 50),
      fullMark: 5,
    },
    {
      subject: BardEngine.resolve(rng, "ui.labels.stats.speed").text,
      A: mapValue(rikishi.stats?.speed ?? 50),
      fullMark: 5,
    },
    {
      subject: BardEngine.resolve(rng, "ui.labels.stats.technique").text,
      A: mapValue(rikishi.stats?.technique ?? 50),
      fullMark: 5,
    },
    {
      subject: BardEngine.resolve(rng, "ui.labels.stats.spirit").text,
      A: mapValue(rikishi.momentum ?? 50),
      fullMark: 5,
    },
    {
      subject: BardEngine.resolve(rng, "ui.labels.stats.ring_sense").text,
      A: mapValue(rikishi.condition ?? 50),
      fullMark: 5,
    },
  ];
}

/**
 * Maps an EraTone to the tactical family it favours.
 * Mirrors EraDriftService.ts tone→family mapping (push→explosive, belt→classic,
 * speed→technical, trick→defensive).
 */
const TONE_TO_FAMILY: Record<EraTone, "push" | "belt" | "speed" | "trick"> = {
  explosive: "push",
  classic: "belt",
  technical: "speed",
  defensive: "trick",
};

/**
 * Maps a tactical family to the chart band it contributes to.
 * - push   → oshi  (thrusting sumo)
 * - belt   → yotsu (grappling sumo)
 * - speed  → hybrid (technical/varied)
 * - trick  → hybrid (technical/varied)
 */
const FAMILY_TO_BAND: Record<string, "oshi" | "yotsu" | "hybrid"> = {
  push: "oshi",
  belt: "yotsu",
  speed: "hybrid",
  trick: "hybrid",
};

export interface MetaTrendPoint {
  basho: string;
  tone: EraTone;
  oshi: number;
  yotsu: number;
  hybrid: number;
  topDrift: Array<{ id: string; value: number }>;
}

/**
 * FM v2.0: Formats Meta-State history for Streamgraph (Stacked Area Chart).
 *
 * Reads the REAL era tone and per-kimarite drift from `world.meta` plus the
 * REAL technique-usage counts from `world.globalKimariteStats`. Replaces the
 * previous fabricated chart that ignored `world.meta` and rendered fixed
 * 25/33/50 values derived from a single `metaBias` string.
 */
export function formatMetaTrends(world: WorldState): MetaTrendPoint[] {
  if (!world.history || world.history.length === 0) return [];

  const tone: EraTone = (world.meta?.tone as EraTone) ?? "classic";
  const drift = world.meta?.drift ?? {};
  const stats = world.globalKimariteStats ?? {};

  // Aggregate technique counts by chart band using real kimarite families
  const bandTotals: Record<"oshi" | "yotsu" | "hybrid", number> = {
    oshi: 0,
    yotsu: 0,
    hybrid: 0,
  };
  for (const [id, count] of Object.entries(stats)) {
    const def = getKimarite(id);
    const family = def?.tacticalFamily;
    const band = family ? FAMILY_TO_BAND[family] : "hybrid";
    bandTotals[band] += count;
  }

  const totalMoves = bandTotals.oshi + bandTotals.yotsu + bandTotals.hybrid;

  // Compute percentages from real data. When no data is available yet, fall
  // back to a tone-derived profile (NOT fabricated constants) so the chart
  // still reflects the real era.
  let oshi: number;
  let yotsu: number;
  let hybrid: number;
  if (totalMoves > 0) {
    oshi = Math.round((bandTotals.oshi / totalMoves) * 100);
    yotsu = Math.round((bandTotals.yotsu / totalMoves) * 100);
    hybrid = Math.max(0, 100 - oshi - yotsu);
  } else {
    const dominant = TONE_TO_FAMILY[tone] ?? "belt";
    const dominantBand = FAMILY_TO_BAND[dominant];
    oshi = dominantBand === "oshi" ? 50 : 25;
    yotsu = dominantBand === "yotsu" ? 50 : 25;
    hybrid = Math.max(0, 100 - oshi - yotsu);
  }

  // Top-5 drifted kimarite (real drift values, descending)
  const topDrift = Object.entries(drift)
    .map(([id, value]) => ({ id, value: value as number }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return world.history.slice(-6).map((h) => ({
    basho: `${h.bashoName.charAt(0).toUpperCase()}${h.year % 100}`,
    tone,
    oshi,
    yotsu,
    hybrid,
    topDrift,
  }));
}
