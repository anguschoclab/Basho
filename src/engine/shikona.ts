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

export interface ShikonaGenerationConfig {
  nationality?: string;
  heyaId?: string;
  rank?: string; // e.g. "Jonokuchi", "Yokozuna"
  preferPrestigious?: boolean;
}

type RankTier =
  | "rookie" 
  | "developing" 
  | "upper" 
  | "salaried" 
  | "top" 
  | "legend";

type PatternId =
  | "nat+terrain"
  | "power+any"
  | "nature+noble"
  | "tradition+flora"
  | "regional+ending"
  | "cat+cat"
  | "triple";

type PatternWeights = Record<PatternId, number>;

type HouseStyleId =
  | "power_mountain"
  | "sea_wind"
  | "tradition_flora"
  | "regional_endings"
  | "balanced_classic"
  | "dragon_noble";

type Connector = "no" | "ga" | "shi" | "kuni" | "iwa" | "yori";

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
  power: ["Taka", "Waka", "Dai", "Oo", "Ko", "Sei", "Ryu", "Rai", "Tetsu", "Go", "Yu", "Shin", "Ken", "Kyo", "So"],
  nature: ["Asa", "Nishi", "Higa", "Aki", "Fuyu", "Haru", "Natsu", "Kaze", "Yama", "Umi", "Tani", "Mori", "Hana", "Tsuki"],
  tradition: ["Tochi", "Haku", "Kai", "Koto", "Miya", "Mitake", "Kiyo", "Sada", "Teru", "Ichi", "Ao", "Kiri", "Tama", "Ura"],
  regional: ["Endo", "Ono", "Namba", "Chiya", "Tobi", "Sho", "Masa", "Tomo", "Hide", "Kise", "Ama", "Kak", "Hiro"]
} as const;

const SHIKONA_SUFFIXES = {
  mountain: ["yama", "zan", "take", "mine", "iwa", "shima", "ishi"],
  water: ["umi", "nami", "kawa", "ryu", "taki", "mizu"],
  sky: ["kaze", "arashi", "sora", "kumo", "tora"],
  flora: ["fuji", "sakura", "hana", "take", "matsu", "ume"],
  noble: ["sho", "nishiki", "ho", "omi", "sei", "ryu"],
  endings: ["noshin", "maru", "shu", "ho", "waka"]
} as const;

const PRESTIGIOUS_FULL_NAMES = [
  "Hakuryu", "Kaio", "Takanofuji", "Wakatora", "Asashoryu", 
  "Kotoshogiku", "Tochishima", "Terunofuji", "Mitakeumi", 
  "Ichinojo", "Aoiyama", "Kirishima", "Tamanoshima"
] as const;

const NATIONALITY_PREFIXES: Record<string, string[]> = {
  Mongolia: ["Teru", "Haku", "Ichi", "Ao", "Ryu", "Dai"],
  Georgia: ["Tochi", "Gaga", "Koto", "Koko"],
  Bulgaria: ["Ao", "Koto", "Bara"],
  USA: ["Musa", "Aka", "Taka", "Dai"],
  Brazil: ["Kai", "Asa", "Sho"],
  Egypt: ["Oo", "Sada", "Osa"],
  default: ["Taka", "Waka", "Asa", "Koto", "Tochi", "Haku", "Kai"]
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
    suffixCategoryBias: { mountain: 8, noble: 2 }
  },
  {
    id: "sea_wind",
    name: "Sea & Wind Poets",
    patternBias: { "nat+terrain": 8, "cat+cat": 4, triple: 2 },
    prefixCategoryBias: { nature: 6, tradition: 1 },
    suffixCategoryBias: { water: 7, sky: 6, mountain: -2 },
    connectorBias: { no: 3, yori: 2 }
  },
  {
    id: "tradition_flora",
    name: "Temple & Blossom Tradition",
    patternBias: { "tradition+flora": 10, "nature+noble": 2, triple: 2, "regional+ending": -2 },
    prefixCategoryBias: { tradition: 8, nature: 2 },
    suffixCategoryBias: { flora: 9, noble: 2 },
    connectorBias: { shi: 2, ga: 1 }
  },
  {
    id: "regional_endings",
    name: "Regional Maru House",
    patternBias: { "regional+ending": 12, "cat+cat": 4, triple: -2 },
    prefixCategoryBias: { regional: 10 },
    suffixCategoryBias: { endings: 10, mountain: 1 }
  },
  {
    id: "dragon_noble",
    name: "Dragon & Noble Court",
    patternBias: { "power+any": 4, "nature+noble": 8, triple: 3 },
    prefixCategoryBias: { power: 4, tradition: 3 },
    suffixCategoryBias: { noble: 9, water: 2 },
    connectorBias: { kuni: 2, iwa: 1, ga: 1 }
  },
  {
    id: "balanced_classic",
    name: "Balanced Classic",
    patternBias: { "cat+cat": 4, "nat+terrain": 2 },
    prefixCategoryBias: { power: 2, nature: 2, tradition: 2, regional: 2 },
    suffixCategoryBias: { mountain: 2, water: 2, sky: 2, flora: 2, noble: 2, endings: 2 }
  }
];

// ----------------------------
// Rank Rules
// ----------------------------

interface RankRule {
  tier: RankTier;
  prestigeChance: number;
  tripleChance: number;
  maxLen: number;
  patternBias: Partial<PatternWeights>;
}

const RANK_RULES: RankRule[] = [
  { tier: "rookie", prestigeChance: 0.02, tripleChance: 0.05, maxLen: 14, patternBias: { triple: -3, "regional+ending": 1, "cat+cat": 2 } },
  { tier: "developing", prestigeChance: 0.04, tripleChance: 0.08, maxLen: 16, patternBias: { triple: -1, "cat+cat": 2 } },
  { tier: "upper", prestigeChance: 0.06, tripleChance: 0.12, maxLen: 18, patternBias: { triple: 1, "nature+noble": 1, "tradition+flora": 1 } },
  { tier: "salaried", prestigeChance: 0.08, tripleChance: 0.16, maxLen: 20, patternBias: { triple: 2, "nat+terrain": 1 } },
  { tier: "top", prestigeChance: 0.12, tripleChance: 0.2, maxLen: 22, patternBias: { triple: 3, "tradition+flora": 1, "power+any": 1 } },
  { tier: "legend", prestigeChance: 0.16, tripleChance: 0.24, maxLen: 24, patternBias: { triple: 4, "power+any": 1, "nature+noble": 1 } }
];

// ----------------------------
// Helper: Seeded RNG (LCG)
// ----------------------------
// Replaces seedrandom to avoid external dependencies
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const a = 1664525;
  const c = 1013904223;
  const m = 4294967296;
  let x = Math.abs(hash);
  
  return function() {
    x = (a * x + c) % m;
    return x / m;
  };
}

// ----------------------------
// Core Helpers
// ----------------------------

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng.next() * arr.length)];
}

function weightedPick<T>(items: Array<{ item: T; w: number }>, rng: () => number): T {
  const total = items.reduce((s, x) => s + Math.max(0, x.w), 0);
  if (total <= 0) return items[0].item;

  let r = rng.next() * total;
  for (const x of items) {
    r -= Math.max(0, x.w);
    if (r <= 0) return x.item;
  }
  return items[items.length - 1].item;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function clampInt(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.trunc(n)));
}

function simpleHashToIndex(s: string, mod: number): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % mod;
}

function resolveRankTier(rank?: string): RankTier {
  const r = (rank || "").toLowerCase();
  if (r.includes("yokozuna") || r.includes("ozeki")) return "legend";
  if (r.includes("makuuchi")) return "top";
  if (r.includes("juryo")) return "salaried";
  if (r.includes("makushita")) return "upper";
  if (r.includes("sandanme")) return "developing";
  return "rookie";
}

function getRankRule(rank?: string): RankRule {
  const tier = resolveRankTier(rank);
  return RANK_RULES.find((r) => r.tier === tier) || RANK_RULES[1];
}

function getHouseStyle(heyaId?: string): HouseStyle {
  if (!heyaId) return HOUSE_STYLES.find(s => s.id === "balanced_classic")!;
  const idx = simpleHashToIndex(heyaId, HOUSE_STYLES.length);
  return HOUSE_STYLES[idx];
}

function mergePatternWeights(base: PatternWeights, ...biases: Array<Partial<PatternWeights>>): PatternWeights {
  const out: PatternWeights = { ...base };
  for (const b of biases) {
    for (const k of Object.keys(b) as PatternId[]) {
      out[k] = (out[k] ?? 0) + (b[k] ?? 0);
    }
  }
  for (const k of Object.keys(out) as PatternId[]) {
    out[k] = clamp(out[k], 0.1, 100);
  }
  return out;
}

function choosePattern(rng: () => number, weights: PatternWeights): PatternId {
  return weightedPick(
    (Object.keys(weights) as PatternId[]).map((p) => ({ item: p, w: weights[p] })),
    rng
  );
}

function nationalityPool(config: ShikonaGenerationConfig): string[] {
  if (!config.nationality) return NATIONALITY_PREFIXES.default;
  return NATIONALITY_PREFIXES[config.nationality] || NATIONALITY_PREFIXES.default;
}

function pickPrefixByCategoryBias(rng: () => number, bias: HouseStyle["prefixCategoryBias"]): string {
  const categories = Object.keys(SHIKONA_PREFIXES) as Array<keyof typeof SHIKONA_PREFIXES>;
  const items = categories.map((cat) => ({ item: cat, w: clamp(10 + (bias[cat] ?? 0), 1, 50) }));
  const chosen = weightedPick(items, rng);
  return pick(SHIKONA_PREFIXES[chosen], rng);
}

function pickSuffixByCategoryBias(rng: () => number, bias: HouseStyle["suffixCategoryBias"]): string {
  const categories = Object.keys(SHIKONA_SUFFIXES) as Array<keyof typeof SHIKONA_SUFFIXES>;
  const items = categories.map((cat) => ({ item: cat, w: clamp(10 + (bias[cat] ?? 0), 1, 50) }));
  const chosen = weightedPick(items, rng);
  return pick(SHIKONA_SUFFIXES[chosen], rng);
}

function pickConnectorToken(rng: () => number, house: HouseStyle): string {
  const base: Record<Connector, number> = { no: 10, ga: 7, shi: 5, kuni: 3, iwa: 3, yori: 2 };
  const b = house.connectorBias || {};
  const items = (Object.keys(base) as Connector[]).map((c) => ({ item: c, w: clamp(base[c] + (b[c] ?? 0), 0.1, 50) }));
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
  triple: 6
};

function generateCandidate(
  rng: () => number,
  config: ShikonaGenerationConfig,
  attempt: number,
  house: HouseStyle,
  rankRule: RankRule
): string {
  const nat = nationalityPool(config);

  if (config.preferPrestigious) {
    if (rng.next() < rankRule.prestigeChance) {
      const base = pick(PRESTIGIOUS_FULL_NAMES, rng);
      if (attempt > 0) {
        const extra = pickSuffixByCategoryBias(rng, house.suffixCategoryBias);
        return base + extra;
      }
      return base;
    }
  }

  const patternWeights = mergePatternWeights(BASE_PATTERN_WEIGHTS, rankRule.patternBias, house.patternBias);
  const pattern = choosePattern(rng, patternWeights);

  switch (pattern) {
    case "nat+terrain": {
      const prefix = pick(nat, rng);
      const suffix = rng.next() < 0.5 ? pick(SHIKONA_SUFFIXES.mountain, rng) : pick(SHIKONA_SUFFIXES.water, rng);
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
      if (rng.next() > rankRule.tripleChance) {
        const prefix = pickPrefixByCategoryBias(rng, house.prefixCategoryBias);
        const suffix = pickSuffixByCategoryBias(rng, house.suffixCategoryBias);
        return prefix + suffix;
      }
      const prefix = pickPrefixByCategoryBias(rng, house.prefixCategoryBias);
      const connector = pickConnectorToken(rng, house);
      const suffix = pickSuffixByCategoryBias(rng, house.suffixCategoryBias);
      return prefix + connector + suffix;
    }
  }
}

/**
 * Public API: Generates a high-fidelity Shikona.
 */
export function generateShikona(seed: string = "default", config: ShikonaGenerationConfig = {}): string {
  const rng = seededRandom(seed + (config.heyaId || "") + (config.nationality || ""));
  const house = getHouseStyle(config.heyaId);
  const rankRule = getRankRule(config.rank);
  
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
export function generateRikishiName(seed: string): string {
    return generateShikona(seed, {});
}

export function generateOyakataName(seed: string): string {
    const names = [
        "Miyagino", "Isegahama", "Kokonoe", "Takasago", "Dewanoumi",
        "Hakkaku", "Futagoyama", "Shibatayama", "Arashio", "Tokitsukaze",
        "Kasugano", "Oguruma", "Kise", "Tamanoi", "Oshima"
    ];
    // Deterministic pick using the same internal seeded RNG core as shikona generation.
    const rng = createSeededRNG(seed + "::oyakataName");
    const idx = Math.floor(rng.nextFloat() * names.length);
    return names[Math.max(0, Math.min(names.length - 1, idx))];
}
