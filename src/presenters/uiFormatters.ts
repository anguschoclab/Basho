/**
 * uiFormatters.ts
 *
 * Formatting functions for UI data presentation.
 * Extracted from uiDigest.ts to separate concerns.
 */

import { SeededRNG } from "../engine/rng";
import { BardEngine } from "../engine/narrative/BardEngine";
import type { Rikishi } from "../engine/types/rikishi";
import type { WorldState } from "../engine/types/world";

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
      A: mapValue(rikishi.power || 50),
      fullMark: 5,
    },
    {
      subject: BardEngine.resolve(rng, "ui.labels.stats.speed").text,
      A: mapValue(rikishi.speed || 50),
      fullMark: 5,
    },
    {
      subject: BardEngine.resolve(rng, "ui.labels.stats.technique").text,
      A: mapValue(rikishi.technique || 50),
      fullMark: 5,
    },
    {
      subject: BardEngine.resolve(rng, "ui.labels.stats.spirit").text,
      A: mapValue(rikishi.momentum || 50),
      fullMark: 5,
    },
    {
      subject: BardEngine.resolve(rng, "ui.labels.stats.ring_sense").text,
      A: mapValue(rikishi.condition || 50),
      fullMark: 5,
    },
  ];
}

/**
 * FM v2.0: Formats Meta-State history for Streamgraph (Stacked Area Chart).
 */
export function formatMetaTrends(world: WorldState) {
  if (!world.history || world.history.length === 0) return [];

  return world.history.slice(-6).map((h) => {
    // Determine meta bias values based on actual historical data if available
    // Otherwise fallback to balanced defaults
    const bias = "metaBias" in h && typeof h.metaBias === "string" ? h.metaBias : "neutral";

    return {
      basho: `${h.bashoName.charAt(0).toUpperCase()}${h.year % 100}`,
      oshi: bias === "oshi" ? 50 : bias === "neutral" ? 33 : 25,
      yotsu: bias === "yotsu" ? 50 : bias === "neutral" ? 33 : 25,
      hybrid: bias === "hybrid" ? 50 : bias === "neutral" ? 34 : 25,
    };
  });
}
