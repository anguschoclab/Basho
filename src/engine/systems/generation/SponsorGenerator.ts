import { rngFromSeed, SeededRNG } from "../../rng";
import { 
  Sponsor, 
  SponsorTier, 
  SponsorCategory, 
  SponsorTone 
} from "../../types/sponsors";

// v2 Procedural Components
const PREFIXES = {
  regional: ["Kyoto", "Osaka", "Nagoya", "Kanto", "Kansai", "Hokkaido", "Kyushu"],
  prestige: ["Imperial", "Diamond", "Golden", "Royal", "Platinum", "Zenith", "Apex"]
};

const IDENTITIES = {
  family: ["Sato", "Tanaka", "Watanabe", "Ito", "Nakamura", "Kobayashi", "Kato"],
  abstract: ["Harmony", "Unity", "Zenith", "Rising Sun", "Horizon", "Eternal", "Aether"]
};

const INDUSTRIES = {
  heavy: ["Heavy Industries", "Steel", "Energy", "Shipbuilding"],
  logistics: ["Logistics", "Forwarding", "Shipping", "Warehousing"],
  fmcg: ["Sake Brewery", "Textiles", "Foods", "Beverages"],
  tech: ["Electronics", "Semiconductors", "Software", "Photonics"],
  construction: ["Construction", "Infrastructure", "Development", "Land"]
};

const FINISHING_SUFFIXES = ["Corp", "Ltd", "Group", "Holdings", "Global", "Enterprises"];

const SPONSOR_NAME_PREFIXES = [
  "Hokuto", "Namba", "Kansai", "Tokai", "Yamato", "Sakura", "Mizuho", "Asahi", "Nihon", "Kinki",
  "Chuo", "Meiji", "Shonan", "Sanwa", "Sumitomo", "Marubeni", "Taiyo", "Kirin", "Sapporo", "Toyama",
  "Niigata", "Sendai", "Fukuoka", "Nagoya", "Osaka", "Kyoto", "Aichi", "Shizuoka", "Chiba", "Saitama",
  "Yokohama", "Kobe", "Takeda", "Matsuda", "Ogawa", "Tanaka", "Yamamoto", "Watanabe"
];

const SPONSOR_NAME_CORES = [
  "Transport", "Logistics", "Industries", "Foods", "Trading", "Construction", "Manufacturing",
  "Electronics", "Automotive", "Marine", "Textiles", "Metals", "Chemicals", "Pharma", "Breweries",
  "Fisheries", "Agriculture", "Forestry", "Mining", "Commerce", "Finance", "Insurance", "Real Estate", "Tourism"
];

const SPONSOR_NAME_SUFFIXES = [
  "Co.", "Corp.", "Inc.", "Ltd.", "Group", "Holdings", "Works", "Industries", "Enterprises",
  "Associates", "Partners", "Trust", "Foundation", "Institute", "Society", "Association", "Club"
];

const LEGACY_SUFFIXES = ["Foundation", "Trust", "Institute", "Cultural Society", "Memorial"];

const FAMILY_NAMES = [
  "Hayashi", "Kobayashi", "Nakamura", "Yoshida", "Sasaki", "Yamaguchi", "Matsumoto", "Inoue",
  "Kimura", "Shimizu", "Kato", "Abe", "Hashimoto", "Mori", "Ishikawa", "Okada"
];

const REGIONS = ["tokyo", "osaka", "kyoto", "nagoya", "fukuoka", "sapporo", "sendai", "hiroshima", "kobe", "yokohama", "chiba", "saitama"];

const INDUSTRY_TAGS = ["logistics", "foods", "manufacturing", "construction", "retail", "hospitality", "finance", "cultural", "sports", "media"];

/**
 * Procedural Sponsor Name Generator V2
 */
export function generateSponsorNameV2(rng: SeededRNG, tier: SponsorTier): { displayName: string; shortName: string } {
  const rollIndex = (arr: string[]) => Math.floor(rng.next() * arr.length);
  
  if (tier === "T0" || tier === "T1") {
    const family = IDENTITIES.family[rollIndex(IDENTITIES.family)];
    const industry = INDUSTRIES.fmcg[rollIndex(INDUSTRIES.fmcg)];
    return { displayName: `${family} ${industry}`, shortName: family };
  }
  
  if (tier === "T2") {
    const region = PREFIXES.regional[rollIndex(PREFIXES.regional)];
    const industryList = [...INDUSTRIES.heavy, ...INDUSTRIES.construction, ...INDUSTRIES.logistics];
    const industry = industryList[rollIndex(industryList)];
    const suffix = FINISHING_SUFFIXES[rollIndex(FINISHING_SUFFIXES.slice(0, 4))];
    return { displayName: `${region} ${industry} ${suffix}`, shortName: region };
  }
  
  if (tier === "T3" || tier === "T4") {
    const prestige = PREFIXES.prestige[rollIndex(PREFIXES.prestige)];
    const identity = IDENTITIES.family[rollIndex(IDENTITIES.family)];
    const suffix = "Holdings";
    return { displayName: `${prestige} ${identity} ${suffix}`, shortName: identity };
  }
  
  if (tier === "T5") {
    const abstract = IDENTITIES.abstract[rollIndex(IDENTITIES.abstract)];
    const suffix = "Global";
    return { displayName: `${abstract} ${suffix}`, shortName: abstract };
  }

  return { displayName: "Standard Sponsor", shortName: "Standard" };
}


/**
 * Get tier trait ranges for generation
 */
export function getTierTraitRanges(tier: SponsorTier): { prestigeMin: number; prestigeMax: number; loyaltyMin: number; loyaltyMax: number } {
  switch (tier) {
    case "T0":
      return { prestigeMin: 10, prestigeMax: 35, loyaltyMin: 10, loyaltyMax: 40 };
    case "T1":
      return { prestigeMin: 15, prestigeMax: 45, loyaltyMin: 20, loyaltyMax: 55 };
    case "T2":
      return { prestigeMin: 25, prestigeMax: 60, loyaltyMin: 30, loyaltyMax: 70 };
    case "T3":
      return { prestigeMin: 40, prestigeMax: 75, loyaltyMin: 40, loyaltyMax: 80 };
    case "T4":
      return { prestigeMin: 50, prestigeMax: 90, loyaltyMin: 50, loyaltyMax: 95 };
    case "T5":
      return { prestigeMin: 70, prestigeMax: 100, loyaltyMin: 60, loyaltyMax: 100 };
  }
}


/**
 * Legacy Sponsor Name Generator
 */
export function generateSponsorName(rng: SeededRNG, tier: SponsorTier): { displayName: string; shortName: string } {
  const rollIndex = (arr: string[]) => Math.floor(rng.next() * arr.length);
  const prefix = SPONSOR_NAME_PREFIXES[rollIndex(SPONSOR_NAME_PREFIXES)];
  const core = SPONSOR_NAME_CORES[rollIndex(SPONSOR_NAME_CORES)];

  if (tier === "T5") {
    const familyName = FAMILY_NAMES[rollIndex(FAMILY_NAMES)];
    const legacySuffix = LEGACY_SUFFIXES[rollIndex(LEGACY_SUFFIXES)];
    const pattern = Math.floor(rng.next() * 3);

    if (pattern === 0) return { displayName: `${familyName} ${legacySuffix}`, shortName: familyName };
    if (pattern === 1) return { displayName: `${prefix} ${core} Holdings`, shortName: prefix };
    return { displayName: `${core} ${legacySuffix}`, shortName: core };
  }

  if (tier === "T3" || tier === "T4") {
    const suffix = SPONSOR_NAME_SUFFIXES[rollIndex(SPONSOR_NAME_SUFFIXES)];
    const pattern = Math.floor(rng.next() * 3);

    if (pattern === 0) return { displayName: `${prefix} ${core} ${suffix}`, shortName: prefix };
    if (pattern === 1) return { displayName: `${prefix}-${core} ${suffix}`, shortName: prefix };

    const divisionTag = ["Sports", "Cultural", "Trading"][Math.floor(rng.next() * 3)];
    return { displayName: `${core} ${suffix} ${divisionTag}`, shortName: core };
  }

  const suffix = SPONSOR_NAME_SUFFIXES[rollIndex(SPONSOR_NAME_SUFFIXES)];
  const pattern = Math.floor(rng.next() * 3);

  if (pattern === 0) return { displayName: `${prefix} ${core}`, shortName: prefix };
  if (pattern === 1) return { displayName: `${core} ${suffix}`, shortName: core };
  return { displayName: `${prefix} ${core} ${suffix}`, shortName: prefix };
}

/**
 * Generate a new Sponsor entity
 */
export function generateSponsor(
  rng: SeededRNG, 
  tier: SponsorTier, 
  createdAtTick: number, 
  existingIds: Set<string>
): Sponsor {
  const { displayName, shortName } = generateSponsorNameV2(rng, tier);

  const base = displayName.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  let sponsorId = `sponsor_${base}`;
  
  if (existingIds.has(sponsorId)) {
    let attempt = 0;
    while (existingIds.has(sponsorId) && attempt < 10) {
      sponsorId = `sponsor_${base}_${Math.floor(rng.next() * 10_000)}`;
      attempt++;
    }
  }

  const categoryMap: Record<SponsorTier, SponsorCategory> = {
    T0: "local_business",
    T1: "local_business",
    T2: "regional_corporation",
    T3: "national_brand",
    T4: "national_brand",
    T5: "national_brand" // Global
  };

  const toneTags: SponsorTone[] = ["traditional", "modern", "luxury", "local", "industrial", "civic"];

  return {
    sponsorId,
    displayName,
    shortName,
    tier,
    category: categoryMap[tier],
    originRegionId: REGIONS[Math.floor(rng.next() * REGIONS.length)],
    industryTag: INDUSTRY_TAGS[Math.floor(rng.next() * INDUSTRY_TAGS.length)],
    toneTag: toneTags[Math.floor(rng.next() * toneTags.length)],
    prestigeAffinity: 20 + Math.floor(rng.next() * 80),
    loyalty: 40 + Math.floor(rng.next() * 60),
    scandalTolerance: 10 + Math.floor(rng.next() * 90),
    riskAppetite: Math.floor(rng.next() * 100),
    visibilityPreference: Math.floor(rng.next() * 3) as 0 | 1 | 2,
    active: true,
    createdAtTick,
    lastSeenTick: createdAtTick,
    relationships: []
  };
}

/**
 * Helper to roll a tier based on distribution
 */
export function rollTier(rng: SeededRNG, dist: Record<SponsorTier, number>): SponsorTier {
  const r = rng.next();
  let cumulative = 0;

  const tiers: SponsorTier[] = ["T0", "T1", "T2", "T3", "T4", "T5"];
  for (const t of tiers) {
    cumulative += dist[t] ?? 0;
    if (r < cumulative) return t;
  }
  return "T0";
}
