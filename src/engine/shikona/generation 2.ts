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

export function generateCandidate(
  rng: () => number,
  config: ShikonaGenerationConfig,
  attempt: number,
  house: HouseStyle,
  rankRule: RankRule
): string {
  const nat = config.nationality
    ? [
        config.nationality === "Mongolia"
          ? ["Teru", "Haku", "Ichi", "Ao", "Ryu", "Dai"]
          : config.nationality === "Georgia"
            ? ["Tochi", "Gaga", "Koto", "Koko"]
            : config.nationality === "Bulgaria"
              ? ["Ao", "Koto", "Bara"]
              : config.nationality === "USA"
                ? ["Musa", "Aka", "Taka", "Dai"]
                : config.nationality === "Brazil"
                  ? ["Kai", "Asa", "Sho"]
                  : config.nationality === "Egypt"
                    ? ["Oo", "Sada", "Osa"]
                    : ["Taka", "Waka", "Asa", "Koto", "Tochi", "Haku", "Kai"],
      ][0]
    : ["Taka", "Waka", "Asa", "Koto", "Tochi", "Haku", "Kai"];

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

  switch (pattern) {
    case "nat+terrain": {
      const prefix = pick(nat, rng);
      const suffix =
        rng() < 0.5 ? pick(SHIKONA_SUFFIXES.mountain, rng) : pick(SHIKONA_SUFFIXES.water, rng);
      return prefix + suffix;
    }
    case "power+any": {
      const prefix = pick(SHIKONA_PREFIXES.power, rng);
      const suffix = pickSuffixByCategoryBias(rng, house.suffixCategoryBias);
      return prefix + suffix;
    }
    case "nature+noble": {
      const prefix = pick(SHIKONA_PREFIXES.nature, rng);
      const suffix = pick(SHIKONA_SUFFIXES.noble, rng);
      return prefix + suffix;
    }
    case "tradition+flora": {
      const prefix = pick(SHIKONA_PREFIXES.tradition, rng);
      const suffix = pick(SHIKONA_SUFFIXES.flora, rng);
      return prefix + suffix;
    }
    case "regional+ending": {
      const prefix = pick(SHIKONA_PREFIXES.regional, rng);
      const suffix = pick(SHIKONA_SUFFIXES.endings, rng);
      return prefix + suffix;
    }
    case "cat+cat": {
      const prefix = pickPrefixByCategoryBias(rng, house.prefixCategoryBias);
      const suffix = pickSuffixByCategoryBias(rng, house.suffixCategoryBias);
      return prefix + suffix;
    }
    case "triple": {
      if (rng() > rankRule.tripleChance) {
        const prefix = pickPrefixByCategoryBias(rng, house.prefixCategoryBias);
        const suffix = pickSuffixByCategoryBias(rng, house.suffixCategoryBias);
        return prefix + suffix;
      }
      const prefix = pickPrefixByCategoryBias(rng, house.prefixCategoryBias);
      const connector = pickConnectorToken(rng, house);
      const suffix = pickSuffixByCategoryBias(rng, house.suffixCategoryBias);
      return prefix + connector + suffix;
    }
    default:
      assertNever(pattern);
  }
}
