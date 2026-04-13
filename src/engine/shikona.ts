import { clamp, pick, weightedPick, simpleHashToIndex } from "./utils";
import { assertNever } from "./utils/types";
import { SeededRNG } from "./rng";
/**
 * File Name: src/engine/shikona.ts
 * Notes:
 * - COMPLETE OVERHAUL: Replaced basic random generator with high-fidelity "Basho Constitution" compliant system.
 * - Implements House Styles (Heya-specific naming conventions).
 * - Implements Rank Tiers (Names evolve in complexity/prestige).
 * - Uses deterministic seeded RNG (local implementation to avoid deps).
 * - Handles validation and soft length caps.
 */

// ----------------------------
// Types
// ----------------------------

interface ShikonaGenerationConfig {
  nationality?: string;
  heyaId?: string;
  rank?: string; // e.g. "Jonokuchi", "Yokozuna"
  preferPrestigious?: boolean;
  rng?: SeededRNG;
  legacyShikona?: string; // Optional oyakata's former shikona for legacy naming patterns
}

/** Type representing rank tier. */
type RankTier = "rookie" | "developing" | "upper" | "salaried" | "top" | "legend";

/** Type representing pattern id. */
type PatternId =
  | "nat+terrain"
  | "power+any"
  | "nature+noble"
  | "tradition+flora"
  | "regional+ending"
  | "cat+cat"
  | "triple";

/** Type representing pattern weights. */
type PatternWeights = Record<PatternId, number>;

/** Type representing house style id. */
type HouseStyleId =
  | "power_mountain"
  | "sea_wind"
  | "tradition_flora"
  | "regional_endings"
  | "balanced_classic"
  | "dragon_noble";

/** Type representing connector. */
type Connector = "no" | "ga" | "shi" | "kuni" | "iwa" | "yori";

/** Defines the structure for house style. */
interface HouseStyle {
  id: HouseStyleId;
  name: string;
  patternBias: Partial<PatternWeights>;
  prefixCategoryBias: Partial<Record<keyof typeof SHIKONA_PREFIXES, number>>;
  suffixCategoryBias: Partial<Record<keyof typeof SHIKONA_SUFFIXES, number>>;
  connectorBias?: Partial<Record<Connector, number>>;
}

// ----------------------------
// Data: Components
// ----------------------------

const SHIKONA_PREFIXES = {
  power: [
    "Taka",
    "Waka",
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
  ],
  nature: [
    "Asa",
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
  ],
  tradition: [
    "Tochi",
    "Haku",
    "Kai",
    "Koto",
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
  ],
  regional: [
    "Endo",
    "Ono",
    "Namba",
    "Chiya",
    "Tobi",
    "Sho",
    "Masa",
    "Tomo",
    "Hide",
    "Kise",
    "Ama",
    "Kak",
    "Hiro",
  ],
} as const;

const SHIKONA_SUFFIXES = {
  mountain: ["yama", "zan", "take", "mine", "iwa", "shima", "ishi"],
  water: ["umi", "nami", "kawa", "ryu", "taki", "mizu"],
  sky: ["kaze", "arashi", "sora", "kumo", "tora"],
  flora: ["fuji", "sakura", "hana", "take", "matsu", "ume"],
  noble: ["sho", "nishiki", "ho", "omi", "sei", "ryu"],
  endings: ["noshin", "maru", "shu", "ho", "waka"],
} as const;

const PRESTIGIOUS_FULL_NAMES = [
  "Hakuryu",
  "Kaio",
  "Takanofuji",
  "Wakatora",
  "Asashoryu",
  "Kotoshogiku",
  "Tochishima",
  "Terunofuji",
  "Mitakeumi",
  "Ichinojo",
  "Aoiyama",
  "Kirishima",
  "Tamanoshima",
] as const;

const NATIONALITY_PREFIXES: Record<string, string[]> = {
  Mongolia: ["Teru", "Haku", "Ichi", "Ao", "Ryu", "Dai"],
  Georgia: ["Tochi", "Gaga", "Koto", "Koko"],
  Bulgaria: ["Ao", "Koto", "Bara"],
  USA: ["Musa", "Aka", "Taka", "Dai"],
  Brazil: ["Kai", "Asa", "Sho"],
  Egypt: ["Oo", "Sada", "Osa"],
  default: ["Taka", "Waka", "Asa", "Koto", "Tochi", "Haku", "Kai"],
};

// ----------------------------
// House Styles
// ----------------------------

const HOUSE_STYLES: HouseStyle[] = [
  {
    id: "power_mountain",
    name: "Power & Mountain Lineage",
    patternBias: { "power+any": 8, "nat+terrain": 6, "cat+cat": 3, triple: -2 },
    prefixCategoryBias: { power: 8, tradition: 2 },
    suffixCategoryBias: { mountain: 8, noble: 2 },
  },
  {
    id: "sea_wind",
    name: "Sea & Wind Poets",
    patternBias: { "nat+terrain": 8, "cat+cat": 4, triple: 2 },
    prefixCategoryBias: { nature: 6, tradition: 1 },
    suffixCategoryBias: { water: 7, sky: 6, mountain: -2 },
    connectorBias: { no: 3, yori: 2 },
  },
  {
    id: "tradition_flora",
    name: "Temple & Blossom Tradition",
    patternBias: { "tradition+flora": 10, "nature+noble": 2, triple: 2, "regional+ending": -2 },
    prefixCategoryBias: { tradition: 8, nature: 2 },
    suffixCategoryBias: { flora: 9, noble: 2 },
    connectorBias: { shi: 2, ga: 1 },
  },
  {
    id: "regional_endings",
    name: "Regional Maru House",
    patternBias: { "regional+ending": 12, "cat+cat": 4, triple: -2 },
    prefixCategoryBias: { regional: 10 },
    suffixCategoryBias: { endings: 10, mountain: 1 },
  },
  {
    id: "dragon_noble",
    name: "Dragon & Noble Court",
    patternBias: { "power+any": 4, "nature+noble": 8, triple: 3 },
    prefixCategoryBias: { power: 4, tradition: 3 },
    suffixCategoryBias: { noble: 9, water: 2 },
    connectorBias: { kuni: 2, iwa: 1, ga: 1 },
  },
  {
    id: "balanced_classic",
    name: "Balanced Classic",
    patternBias: { "cat+cat": 4, "nat+terrain": 2 },
    prefixCategoryBias: { power: 2, nature: 2, tradition: 2, regional: 2 },
    suffixCategoryBias: { mountain: 2, water: 2, sky: 2, flora: 2, noble: 2, endings: 2 },
  },
];

// ----------------------------
// Rank Rules
// ----------------------------

/** Defines the structure for rank rule. */
interface RankRule {
  tier: RankTier;
  prestigeChance: number;
  tripleChance: number;
  maxLen: number;
  patternBias: Partial<PatternWeights>;
}

const RANK_RULES: RankRule[] = [
  {
    tier: "rookie",
    prestigeChance: 0.02,
    tripleChance: 0.05,
    maxLen: 14,
    patternBias: { triple: -3, "regional+ending": 1, "cat+cat": 2 },
  },
  {
    tier: "developing",
    prestigeChance: 0.04,
    tripleChance: 0.08,
    maxLen: 16,
    patternBias: { triple: -1, "cat+cat": 2 },
  },
  {
    tier: "upper",
    prestigeChance: 0.06,
    tripleChance: 0.12,
    maxLen: 18,
    patternBias: { triple: 1, "nature+noble": 1, "tradition+flora": 1 },
  },
  {
    tier: "salaried",
    prestigeChance: 0.08,
    tripleChance: 0.16,
    maxLen: 20,
    patternBias: { triple: 2, "nat+terrain": 1 },
  },
  {
    tier: "top",
    prestigeChance: 0.12,
    tripleChance: 0.2,
    maxLen: 22,
    patternBias: { triple: 3, "tradition+flora": 1, "power+any": 1 },
  },
  {
    tier: "legend",
    prestigeChance: 0.16,
    tripleChance: 0.24,
    maxLen: 24,
    patternBias: { triple: 4, "power+any": 1, "nature+noble": 1 },
  },
];

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

// ----------------------------
// Core Helpers
// ----------------------------

/**
 * Resolve rank tier.
 *  * @param rank - The Rank.
 *  * @returns The result.
 */
function resolveRankTier(rank?: string): RankTier {
  const r = (rank || "").toLowerCase();
  if (r.includes("yokozuna") || r.includes("ozeki")) return "legend";
  if (r.includes("makuuchi")) return "top";
  if (r.includes("juryo")) return "salaried";
  if (r.includes("makushita")) return "upper";
  if (r.includes("sandanme")) return "developing";
  return "rookie";
}

/**
 * Get rank rule.
 *  * @param rank - The Rank.
 *  * @returns The result.
 */
function getRankRule(rank?: string): RankRule {
  const tier = resolveRankTier(rank);
  return RANK_RULES.find((r) => r.tier === tier) || RANK_RULES[1];
}

/**
 * Get house style.
 *  * @param heyaId - The Heya id.
 *  * @returns The result.
 */
function getHouseStyle(heyaId?: string): HouseStyle {
  if (!heyaId) return HOUSE_STYLES.find((s) => s.id === "balanced_classic")!;
  const idx = simpleHashToIndex(heyaId, HOUSE_STYLES.length);
  return HOUSE_STYLES[idx];
}

/**
 * Merge pattern weights.
 *  * @param base - The Base.
 *  * @param biases - The Biases.
 *  * @returns The result.
 */
function mergePatternWeights(
  base: PatternWeights,
  ...biases: Array<Partial<PatternWeights>>
): PatternWeights {
  const out: PatternWeights = { ...base };
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

/**
 * Choose pattern.
 *  * @param rng - The Rng.
 *  * @param weights - The Weights.
 *  * @returns The result.
 */
function choosePattern(rng: () => number, weights: PatternWeights): PatternId {
  const items: { item: PatternId; w: number }[] = [];
  for (const p in weights) {
    items.push({ item: p as PatternId, w: weights[p as PatternId] });
  }
  return weightedPick(items, rng);
}

/**
 * Nationality pool.
 *  * @param config - The Config.
 *  * @returns The result.
 */
function nationalityPool(config: ShikonaGenerationConfig): string[] {
  if (!config.nationality) return NATIONALITY_PREFIXES.default;
  return NATIONALITY_PREFIXES[config.nationality] || NATIONALITY_PREFIXES.default;
}

/**
 * Pick prefix by category bias.
 *  * @param rng - The Rng.
 *  * @param bias - The Bias.
 *  * @returns The result.
 */
function pickPrefixByCategoryBias(
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

/**
 * Pick suffix by category bias.
 *  * @param rng - The Rng.
 *  * @param bias - The Bias.
 *  * @returns The result.
 */
function pickSuffixByCategoryBias(
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

/**
 * Pick connector token.
 *  * @param rng - The Rng.
 *  * @param house - The House.
 *  * @returns The result.
 */
function pickConnectorToken(rng: () => number, house: HouseStyle): string {
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

// ----------------------------
// Generation Main
// ----------------------------

const BASE_PATTERN_WEIGHTS: PatternWeights = {
  "nat+terrain": 18,
  "power+any": 18,
  "nature+noble": 16,
  "tradition+flora": 14,
  "regional+ending": 10,
  "cat+cat": 18,
  triple: 6,
};

/**
 * Extract prefix pattern from legacy shikona.
 *  * @param legacyShikona - The legacy shikona.
 *  * @returns The prefix or empty string.
 */
function extractLegacyPrefix(legacyShikona: string): string {
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

/**
 * Extract suffix pattern from legacy shikona.
 *  * @param legacyShikona - The legacy shikona.
 *  * @returns The suffix or empty string.
 */
function extractLegacySuffix(legacyShikona: string): string {
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

/**
 * Generate legacy shikona based on oyakata's former shikona.
 *  * @param legacyShikona - The oyakata's former shikona.
 *  * @param rng - The rng function.
 *  * @param house - The house style.
 *  * @returns A shikona incorporating legacy patterns.
 */
function generateLegacyShikona(
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

/**
 * Generate candidate.
 *  * @param rng - The Rng.
 *  * @param config - The Config.
 *  * @param attempt - The Attempt.
 *  * @param house - The House.
 *  * @param rankRule - The Rank rule.
 *  * @returns The result.
 */
function generateCandidate(
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

const _IdentityService = {
  generateShikona,
  generateOyakataName,
};
