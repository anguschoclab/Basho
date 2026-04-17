/**
 * shikona/helpers.ts
 *
 * Helper functions for shikona generation system.
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { clamp, pick, weightedPick, simpleHashToIndex } from "../utils";
import type { HouseStyle, PatternId, Connector, ShikonaGenerationConfig } from "./types";
import { SHIKONA_PREFIXES, SHIKONA_SUFFIXES, NATIONALITY_PREFIXES } from "./constants";
import { HOUSE_STYLES } from "./houseStyles";

export function getHouseStyle(heyaId?: string): HouseStyle {
  if (!heyaId) return HOUSE_STYLES.find((s) => s.id === "balanced_classic")!;
  const idx = simpleHashToIndex(heyaId, HOUSE_STYLES.length);
  return HOUSE_STYLES[idx];
}

export function mergePatternWeights(
  base: Record<PatternId, number>,
  ...biases: Array<Partial<Record<PatternId, number>>>
): Record<PatternId, number> {
  const out: Record<PatternId, number> = { ...base };
  for (const b of biases) {
    for (const k in b) {
      const key = k as PatternId;
      out[key] = (out[key] ?? 0) + (b[key] ?? 0);
    }
  }
  for (const k in out) {
    const key = k as PatternId;
    out[key] = clamp(out[key], 0.1, 100);
  }
  return out;
}

export function choosePattern(rng: () => number, weights: Record<PatternId, number>): PatternId {
  const items: { item: PatternId; w: number }[] = [];
  for (const p in weights) {
    items.push({ item: p as PatternId, w: weights[p as PatternId] });
  }
  return weightedPick(items, rng);
}

export function nationalityPool(config: ShikonaGenerationConfig): string[] {
  if (!config.nationality) return NATIONALITY_PREFIXES.default;
  return NATIONALITY_PREFIXES[config.nationality] || NATIONALITY_PREFIXES.default;
}

export function pickPrefixByCategoryBias(
  rng: () => number,
  bias: HouseStyle["prefixCategoryBias"]
): string {
  const items: { item: keyof typeof SHIKONA_PREFIXES; w: number }[] = [];
  for (const cat in SHIKONA_PREFIXES) {
    const category = cat as keyof typeof SHIKONA_PREFIXES;
    items.push({ item: category, w: clamp(10 + (bias[category] ?? 0), 1, 50) });
  }
  const chosen = weightedPick(items, rng);
  return pick(SHIKONA_PREFIXES[chosen], rng);
}

export function pickSuffixByCategoryBias(
  rng: () => number,
  bias: HouseStyle["suffixCategoryBias"]
): string {
  const items: { item: keyof typeof SHIKONA_SUFFIXES; w: number }[] = [];
  for (const cat in SHIKONA_SUFFIXES) {
    const category = cat as keyof typeof SHIKONA_SUFFIXES;
    items.push({ item: category, w: clamp(10 + (bias[category] ?? 0), 1, 50) });
  }
  const chosen = weightedPick(items, rng);
  return pick(SHIKONA_SUFFIXES[chosen], rng);
}

export function pickConnectorToken(rng: () => number, house: HouseStyle): string {
  const base: Record<Connector, number> = { no: 10, ga: 7, shi: 5, kuni: 3, iwa: 3, yori: 2 };
  const b = house.connectorBias || {};
  const items: { item: Connector; w: number }[] = [];
  for (const c in base) {
    const connector = c as Connector;
    items.push({ item: connector, w: clamp(base[connector] + (b[connector] ?? 0), 0.1, 50) });
  }
  const chosen = weightedPick(items, rng);
  return chosen === "no" ? "" : chosen;
}
