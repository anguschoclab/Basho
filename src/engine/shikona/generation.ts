/**
 * shikona/generation.ts
 *
 * Shikona generation functions.
 */

import { pick } from "../utils";
import { assertNever } from "../utils/types";
import type { ShikonaGenerationConfig, HouseStyle, PatternId, RankRule } from "./types";
import { SHIKONA_PREFIXES, SHIKONA_SUFFIXES, PRESTIGIOUS_FULL_NAMES } from "./constants";
import { pickPrefixByCategoryBias, pickSuffixByCategoryBias, pickConnectorToken } from "./helpers";

/**
 * Generates a candidate shikona (wrestler name) based on nationality, house style, and rank rules.
 * Uses a weighted pattern-based approach to ensure variety and authenticity.
 *
 * @param {() => number} rng - A random number generator function.
 * @param {ShikonaGenerationConfig} config - Configuration for the generation (e.g., nationality, preferences).
 * @param {number} attempt - The current attempt number (used to add extra suffixes for prestigious names).
 * @param {HouseStyle} house - The house style bias for prefixes and suffixes.
 * @param {RankRule} rankRule - The rank-specific rules for prestige and pattern bias.
 * @returns {string} The generated shikona candidate.
 */
export function generateCandidate(
  rng: () => number,
  config: ShikonaGenerationConfig,
  attempt: number,
  house: HouseStyle,
  rankRule: RankRule
): string {
  const NATIONALITY_PREFIXES: Record<string, string[]> = {
    Mongolia: ["Teru", "Haku", "Ichi", "Ao", "Ryu", "Dai"],
    Georgia: ["Tochi", "Gaga", "Koto", "Koko"],
    Bulgaria: ["Ao", "Koto", "Bara"],
    USA: ["Musa", "Aka", "Taka", "Dai"],
    Brazil: ["Kai", "Asa", "Sho"],
    Egypt: ["Oo", "Sada", "Osa"],
    Default: ["Taka", "Waka", "Asa", "Koto", "Tochi", "Haku", "Kai"],
  };

  const nat =
    (config.nationality && NATIONALITY_PREFIXES[config.nationality]) ||
    NATIONALITY_PREFIXES.Default;

  if (config.preferPrestigious) {
    if (rng() < rankRule.prestigeChance) {
      const base = pick(PRESTIGIOUS_FULL_NAMES, rng);
      if (attempt > 0) {
        const extra = pickSuffixByCategoryBias(rng, house.suffixCategoryBias);
        return base + extra;
      }
      return base;
    }
  }

  const baseWeights: Record<PatternId, number> = {
    "nat+terrain": 18,
    "power+any": 18,
    "nature+noble": 16,
    "tradition+flora": 14,
    "regional+ending": 10,
    "cat+cat": 18,
    triple: 6,
  };

  const patternWeights: Record<PatternId, number> = { ...baseWeights };
  for (const key in rankRule.patternBias) {
    const k = key as PatternId;
    patternWeights[k] = (patternWeights[k] ?? 0) + (rankRule.patternBias[k] ?? 0);
  }
  for (const key in house.patternBias) {
    const k = key as PatternId;
    patternWeights[k] = (patternWeights[k] ?? 0) + (house.patternBias[k] ?? 0);
  }

  const items: { item: PatternId; w: number }[] = [];
  for (const p in patternWeights) {
    items.push({ item: p as PatternId, w: patternWeights[p as PatternId] });
  }
  const pattern = items[Math.floor(rng() * items.length)]?.item || "cat+cat";

  const PATTERN_HANDLERS: Record<PatternId, () => string> = {
    "nat+terrain": () => {
      const prefix = pick(nat, rng);
      const suffix =
        rng() < 0.5 ? pick(SHIKONA_SUFFIXES.mountain, rng) : pick(SHIKONA_SUFFIXES.water, rng);
      return prefix + suffix;
    },
    "power+any": () => {
      const prefix = pick(SHIKONA_PREFIXES.power, rng);
      const suffix = pickSuffixByCategoryBias(rng, house.suffixCategoryBias);
      return prefix + suffix;
    },
    "nature+noble": () => {
      const prefix = pick(SHIKONA_PREFIXES.nature, rng);
      const suffix = pick(SHIKONA_SUFFIXES.noble, rng);
      return prefix + suffix;
    },
    "tradition+flora": () => {
      const prefix = pick(SHIKONA_PREFIXES.tradition, rng);
      const suffix = pick(SHIKONA_SUFFIXES.flora, rng);
      return prefix + suffix;
    },
    "regional+ending": () => {
      const prefix = pick(SHIKONA_PREFIXES.regional, rng);
      const suffix = pick(SHIKONA_SUFFIXES.endings, rng);
      return prefix + suffix;
    },
    "cat+cat": () => {
      const prefix = pickPrefixByCategoryBias(rng, house.prefixCategoryBias);
      const suffix = pickSuffixByCategoryBias(rng, house.suffixCategoryBias);
      return prefix + suffix;
    },
    triple: () => {
      if (rng() > rankRule.tripleChance) {
        const prefix = pickPrefixByCategoryBias(rng, house.prefixCategoryBias);
        const suffix = pickSuffixByCategoryBias(rng, house.suffixCategoryBias);
        return prefix + suffix;
      }
      const prefix = pickPrefixByCategoryBias(rng, house.prefixCategoryBias);
      const connector = pickConnectorToken(rng, house);
      const suffix = pickSuffixByCategoryBias(rng, house.suffixCategoryBias);
      return prefix + connector + suffix;
    },
  };

  const handler = PATTERN_HANDLERS[pattern];
  return handler ? handler() : "";
}
