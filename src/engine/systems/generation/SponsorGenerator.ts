import { SeededRNG, rngFromSeed } from "../../rng";
import { assertNever } from "../../utils/types";
import type { 
  Sponsor, 
  SponsorTier, 
  SponsorCategory, 
  SponsorTone, 
  SponsorPool 
} from "../../types/sponsors";

// === CONSTANTS & COMPONENTS ===

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

export const REGIONS = ["tokyo", "osaka", "kyoto", "nagoya", "fukuoka", "sapporo", "sendai", "hiroshima", "kobe", "yokohama", "chiba", "saitama"];
export const INDUSTRY_TAGS = ["logistics", "foods", "manufacturing", "construction", "retail", "hospitality", "finance", "cultural", "sports", "media"];

/**
 * Procedural Sponsor Name Generator V2 (Authoritative)
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
    return { displayName: `${prestige} ${identity} Holdings`, shortName: identity };
  }
  
  if (tier === "T5") {
    const abstract = IDENTITIES.abstract[rollIndex(IDENTITIES.abstract)];
    return { displayName: `${abstract} Global`, shortName: abstract };
  }

  return { displayName: "Standard Sponsor", shortName: "Standard" };
}


export function generateSponsorId(rng: SeededRNG): string {
  return rng.uuid('SP');
}


export function rollSponsorCategory(rng: SeededRNG): SponsorCategory {
  const categoryRoll = rng.next();
  if (categoryRoll < 0.3) return "local_business";
  if (categoryRoll < 0.5) return "regional_corporation";
  if (categoryRoll < 0.62) return "national_brand";
  if (categoryRoll < 0.72) return "alumni_association";
  if (categoryRoll < 0.82) return "cultural_foundation";
  if (categoryRoll < 0.94) return "private_benefactor";
  return "anonymous_patron";
}

/**
 * Generate a single sponsor.
 */
export function generateSponsor(rng: SeededRNG, tier: SponsorTier, createdAtTick: number, existingIds: Set<string>): Sponsor {
  const { displayName, shortName } = generateSponsorNameV2(rng, tier);

  const sponsorId = generateSponsorId(rng);

  const category = rollSponsorCategory(rng);

  const traits = getTierTraitRanges(tier);

  return {
    sponsorId,
    displayName,
    shortName,
    category,
    tier,
    originRegionId: REGIONS[Math.floor(rng.next() * REGIONS.length)],
    industryTag: INDUSTRY_TAGS[Math.floor(rng.next() * INDUSTRY_TAGS.length)],
    toneTag: ["traditional", "modern", "luxury", "local", "industrial", "civic"][Math.floor(rng.next() * 6)] as SponsorTone,
    prestigeAffinity: Math.floor(traits.prestigeMin + rng.next() * (traits.prestigeMax - traits.prestigeMin)),
    loyalty: Math.floor(traits.loyaltyMin + rng.next() * (traits.loyaltyMax - traits.loyaltyMin)),
    scandalTolerance: Math.floor(30 + rng.next() * 50),
    riskAppetite: tier === "T5" ? Math.floor(60 + rng.next() * 40) : Math.floor(20 + rng.next() * 60),
    visibilityPreference: tier === "T5" ? 2 : (Math.floor(rng.next() * 3) as 0 | 1 | 2),
    active: true,
    satisfaction: 100,
    createdAtTick,
    lastSeenTick: createdAtTick,
    relationships: []
  };
}

export function getTierTraitRanges(tier: SponsorTier) {
  switch (tier) {
    case "T0": return { prestigeMin: 10, prestigeMax: 35, loyaltyMin: 10, loyaltyMax: 40 };
    case "T1": return { prestigeMin: 15, prestigeMax: 45, loyaltyMin: 20, loyaltyMax: 55 };
    case "T2": return { prestigeMin: 25, prestigeMax: 60, loyaltyMin: 30, loyaltyMax: 70 };
    case "T3": return { prestigeMin: 40, prestigeMax: 75, loyaltyMin: 40, loyaltyMax: 80 };
    case "T4": return { prestigeMin: 50, prestigeMax: 90, loyaltyMin: 50, loyaltyMax: 95 };
    case "T5": return { prestigeMin: 70, prestigeMax: 100, loyaltyMin: 60, loyaltyMax: 100 };
      default: assertNever(tier);

  }
}

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

export const INITIAL_SPONSOR_TIER_DISTRIBUTION: Record<SponsorTier, number> = {
  T0: 0.35, T1: 0.25, T2: 0.2, T3: 0.12, T4: 0.07, T5: 0.01
};

/**
 * Generate procedural sponsor pool.
 */
export function generateInitialSponsorPool(worldSeed: string, worldSizeScalar: number = 1): SponsorPool {
  const rng = rngFromSeed(worldSeed, "sponsors", "root");
  const existingIds = new Set<string>();
  const poolSize = 180 + Math.floor(worldSizeScalar * 60);

  const sponsors = new Map<string, Sponsor>();
  for (let i = 0; i < poolSize; i++) {
    const tier = rollTier(rng, INITIAL_SPONSOR_TIER_DISTRIBUTION);
    const sponsor = generateSponsor(rng, tier, 0, existingIds);
    sponsors.set(sponsor.sponsorId, sponsor);
  }

  return { sponsors, koenkais: new Map() };
}
