import { SeededRNG } from "../rng";
import type { ShikonaGenerationConfig } from "./types";
import { getHouseStyle } from "./helpers";
import { getRankRule } from "./rankRules";
import { generateLegacyShikona } from "./legacy";
import { generateShikonaCandidate } from "./generation";
import { HEYA_PREFIX_PROBABILITY } from "./heyaPrefixes";
import { pickSuffixByCategoryBias } from "./helpers";
import { seededRandom } from "./seededRandom";
import type { Rank } from "../types/banzuke";

/**
 * Public API: Generates a high-fidelity Shikona.
 */
export function generateShikona(
  seed: string = "default",
  config: ShikonaGenerationConfig = {}
): string {
  const rng = config.rng
    ? (() => {
        const rngInstance = config.rng;
        if (!rngInstance) return () => 0;
        return () => rngInstance.next();
      })()
    : seededRandom(seed + (config.heyaId || "") + (config.nationality || ""));

  const house = getHouseStyle(config.heyaId);
  const rankRule = getRankRule(config.rank);

  // Heya signature prefix — rank-tiered probability. Junior wrestlers almost
  // always inherit the stable's prefix; top-rank wrestlers are more likely to
  // have evolved unique names.
  if (config.heyaPrefix) {
    const rankKey = (config.rank as Rank | undefined) ?? "jonokuchi";
    const baseProb = HEYA_PREFIX_PROBABILITY[rankKey] ?? 0.4;
    const prob = Math.min(0.9, baseProb + (config.heyaPrefixBoost ?? 0));
    if (rng() < prob) {
      const suffix = pickSuffixByCategoryBias(rng, house.suffixCategoryBias);
      const name = config.heyaPrefix + suffix;
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  }

  // If legacy shikona is provided, use legacy generation with appropriate probability
  if (config.legacyShikona) {
    // Use legacy pattern with 60% probability for sekitori, 30% for lower ranks
    const isSekitori =
      config.rank &&
      (config.rank.toLowerCase().includes("makuuchi") ||
        config.rank.toLowerCase().includes("juryo"));
    const legacyProbability = isSekitori ? 0.6 : 0.3;

    if (rng() < legacyProbability) {
      let name = generateLegacyShikona(config.legacyShikona, rng, house);

      // Validation check
      if (name.length > rankRule.maxLen + 4) {
        name = generateShikonaCandidate(rng, config, 0, house, rankRule);
      }

      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  }

  // Basic generation
  let name = generateShikonaCandidate(rng, config, 0, house, rankRule);

  // Basic validation check (simplified compared to full collision detection)
  if (name.length > rankRule.maxLen + 4) {
    // Retry once if too long
    name = generateShikonaCandidate(rng, config, 1, house, rankRule);
  }

  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Generates a basic Shikona (wrestler name) for a rikishi using a seed.
 * Provided for backwards compatibility with legacy generation paths.
 *
 * @param seed - The base world or wrestler seed.
 * @param rng - Optional injected SeededRNG instance for deterministic testing.
 * @returns The generated Shikona string.
 */
export function generateRikishiName(seed: string, rng?: SeededRNG): string {
  return generateShikona(seed, { rng });
}
