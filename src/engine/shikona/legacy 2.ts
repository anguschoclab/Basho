/**
 * shikona/legacy.ts
 *
 * Legacy shikona generation functions.
 */

import type { HouseStyle } from "./types";
import { pickPrefixByCategoryBias, pickSuffixByCategoryBias } from "./helpers";

export function extractLegacyPrefix(legacyShikona: string): string {
  // Common prefixes to look for
  const commonPrefixes = [
    "Taka",
    "Waka",
    "Koto",
    "Tochi",
    "Chiyo",
    "Hoku",
    "Asa",
    "Tera",
    "Dai",
    "Oo",
    "Ko",
    "Sei",
    "Ryu",
    "Rai",
    "Tetsu",
    "Go",
    "Yu",
    "Shin",
    "Ken",
    "Kyo",
    "So",
    "Nishi",
    "Higa",
    "Aki",
    "Fuyu",
    "Haru",
    "Natsu",
    "Kaze",
    "Yama",
    "Umi",
    "Tani",
    "Mori",
    "Hana",
    "Tsuki",
    "Haku",
    "Kai",
    "Miya",
    "Mitake",
    "Kiyo",
    "Sada",
    "Teru",
    "Ichi",
    "Ao",
    "Kiri",
    "Tama",
    "Ura",
  ];

  for (const prefix of commonPrefixes) {
    if (legacyShikona.startsWith(prefix)) {
      return prefix;
    }
  }

  // If no common prefix found, take first 2-3 characters
  if (legacyShikona.length >= 3) {
    return legacyShikona.substring(0, 3);
  }
  return legacyShikona.substring(0, 2);
}

export function extractLegacySuffix(legacyShikona: string): string {
  // Common suffixes to look for
  const commonSuffixes = [
    "yama",
    "zan",
    "take",
    "mine",
    "iwa",
    "shima",
    "ishi",
    "umi",
    "nami",
    "kawa",
    "ryu",
    "taki",
    "mizu",
    "kaze",
    "arashi",
    "sora",
    "kumo",
    "tora",
    "fuji",
    "sakura",
    "hana",
    "matsu",
    "ume",
    "sho",
    "nishiki",
    "ho",
    "omi",
    "sei",
    "noshin",
    "maru",
    "shu",
    "waka",
  ];

  for (const suffix of commonSuffixes) {
    if (legacyShikona.endsWith(suffix)) {
      return suffix;
    }
  }

  // If no common suffix found, take last 2-3 characters
  if (legacyShikona.length >= 3) {
    return legacyShikona.substring(legacyShikona.length - 3);
  }
  return legacyShikona.substring(legacyShikona.length - 2);
}

export function generateLegacyShikona(
  legacyShikona: string,
  rng: () => number,
  house: HouseStyle
): string {
  const legacyPrefix = extractLegacyPrefix(legacyShikona);
  const legacySuffix = extractLegacySuffix(legacyShikona);

  // Weighted probability for legacy pattern:
  // 40% use legacy prefix + new suffix
  // 30% use new prefix + legacy suffix
  // 20% use legacy prefix + legacy suffix (full legacy)
  // 10% use legacy-inspired pattern (mix of both)
  const roll = rng();

  if (roll < 0.4) {
    // Legacy prefix + new suffix
    const newSuffix = pickSuffixByCategoryBias(rng, house.suffixCategoryBias);
    return legacyPrefix + newSuffix;
  } else if (roll < 0.7) {
    // New prefix + legacy suffix
    const newPrefix = pickPrefixByCategoryBias(rng, house.prefixCategoryBias);
    return newPrefix + legacySuffix;
  } else if (roll < 0.9) {
    // Full legacy (rare, reserved for special cases)
    return legacyShikona;
  } else {
    // Legacy-inspired: mix elements
    if (rng() < 0.5) {
      const newPrefix = pickPrefixByCategoryBias(rng, house.prefixCategoryBias);
      return newPrefix + legacySuffix;
    } else {
      const newSuffix = pickSuffixByCategoryBias(rng, house.suffixCategoryBias);
      return legacyPrefix + newSuffix;
    }
  }
}
