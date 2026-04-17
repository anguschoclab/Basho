import { SeededRNG } from "./rng";
import type { ShikonaGenerationConfig } from "./shikona/types";
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { getHouseStyle } from "./shikona/helpers";
import { getRankRule } from "./shikona/rankRules";
import { generateLegacyShikona } from "./shikona/legacy";
import { generateCandidate } from "./shikona/generation";
import { HEYA_PREFIX_PROBABILITY } from "./shikona/heyaPrefixes";
import { pickSuffixByCategoryBias } from "./shikona/helpers";
import type { Rank } from "./types/banzuke";

// ----------------------------
// Helper: Seeded RNG (LCG)
// ----------------------------
// Replaces seedrandom to avoid external dependencies
/**
 * Seeded random.
 *  * @param seed - The Seed.
 *  * @returns The result.
 */
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const a = 1664525;
  const c = 1013904223;
  const m = 4294967296;
  let x = Math.abs(hash);

  return function () {
    x = (a * x + c) % m;
    return x / m;
  };
}

/**
 * Public API: Generates a high-fidelity Shikona.
 */
export function generateShikona(
  seed: string = "default",
  config: ShikonaGenerationConfig = {}
): string {
  const rng = config.rng
    ? () => config.rng!.next()
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
        name = generateCandidate(rng, config, 0, house, rankRule);
      }

      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  }

  // Basic generation
  let name = generateCandidate(rng, config, 0, house, rankRule);

  // Basic validation check (simplified compared to full collision detection)
  if (name.length > rankRule.maxLen + 4) {
    // Retry once if too long
    name = generateCandidate(rng, config, 1, house, rankRule);
  }

  return name.charAt(0).toUpperCase() + name.slice(1);
}

// Legacy compat export
/**
 * Generate rikishi name.
 *  * @param seed - The Seed.
 *  * @param rng - Optional injected RNG.
 *  * @returns The result.
 */
export function generateRikishiName(seed: string, rng?: SeededRNG): string {
  return generateShikona(seed, { rng });
}

/**
 * Generate oyakata name.
 *  * @param seed - The Seed.
 *  * @param rng - Optional injected RNG.
 *  * @returns The result.
 */
export function generateOyakataName(seed: string, rng?: SeededRNG): string {
  const names = [
    "Miyagino",
    "Isegahama",
    "Kokonoe",
    "Takasago",
    "Dewanoumi",
    "Hakkaku",
    "Futagoyama",
    "Shibatayama",
    "Arashio",
    "Tokitsukaze",
    "Kasugano",
    "Oguruma",
    "Kise",
    "Tamanoi",
    "Oshima",
  ];
  // Deterministic pick using injected RNG or local seeded core.
  const roll = rng ? () => rng.next() : seededRandom(seed + "::oyakataName");

  const idx = Math.floor(roll() * names.length);
  return names[Math.max(0, Math.min(names.length - 1, idx))];
}
