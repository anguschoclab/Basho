/**
 * shikona/generation.ts
 *
 * Shikona generation functions.
 */

import { pick } from "../utils";
import type { ShikonaGenerationConfig, HouseStyle, PatternId, RankRule } from "./types";
import {
  SHIKONA_PREFIXES,
  SHIKONA_SUFFIXES,
  PRESTIGIOUS_FULL_NAMES,
  BASE_PATTERN_WEIGHTS,
} from "./constants";
import {
  pickPrefixByCategoryBias,
  pickSuffixByCategoryBias,
  pickConnectorToken,
  mergePatternWeights,
  choosePattern,
  nationalityPool,
} from "./helpers";

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
export function generateShikonaCandidate(
  rng: () => number,
  config: ShikonaGenerationConfig,
  attempt: number,
  house: HouseStyle,
  rankRule: RankRule
): string {
  const nat = nationalityPool(config);

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

  const patternWeights = mergePatternWeights(
    BASE_PATTERN_WEIGHTS,
    rankRule.patternBias,
    house.patternBias
  );
  const pattern = choosePattern(rng, patternWeights);

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
