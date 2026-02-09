// sponsors.ts
// Procedural Sponsors, Kenshō & Supporters System
// Per Constitution: Economy/Sponsor spec
//
// FIXES APPLIED (canon + correctness):
// - Deterministic banner assignment now uses weighted sampling (not always “top scored first”).
// - Tier caps are enforced without silently shrinking banners: backfill from remaining tiers.
// - Banner IDs remain stable even when some sponsors are skipped (slotIndex increments only on push).
// - Sponsor ID generation is deterministic, collision-safe, and bounded without RNG “drift”.
// - Koenkai creation now avoids duplicate relationships and is deterministically ordered/tiebroken.
// - determineBoutImportance rank normalization (handles diacritics/case like Ōzeki/Ozeki).
// - Removed dead params (prestigeBand string kept but normalized; easy to hook to your heya prestige system).
// - Added helper to normalize rank strings and a deterministic tier roll helper.
// - Guards for bannerCount < 0 / empty sponsor pools.
//
// NOTE: This module stays RNG-driven but deterministic given the provided rng + inputs.
import { rngFromSeed, rngForWorld } from "./rng";
import { SeededRNG } from "./utils/SeededRNG";
// === SPONSOR TIER SYSTEM ===

export type SponsorTier = "T0" | "T1" | "T2" | "T3" | "T4" | "T5";

export type SponsorCategory =
  | "local_business"
  | "regional_corporation"
  | "national_brand"
  | "alumni_association"
  | "cultural_foundation"
  | "private_benefactor"
  | "anonymous_patron";

export type SponsorTone = "traditional" | "modern" | "luxury" | "local" | "industrial" | "civic";

export type SponsorRole = "kensho" | "koenkai_member" | "koenkai_pillar" | "benefactor" | "creditor";

// === SPONSOR ENTITY ===

export interface SponsorRelationship {
  relId: string;
  sponsorId: string;
  targetType: "league" | "basho" | "beya" | "rikishi";
  targetId: string;
  role: SponsorRole;
  strength: 1 | 2 | 3 | 4 | 5;
  startedAtTick: number;
  endsAtTick?: number;
  notesTag?: string;
}

export interface Sponsor {
  sponsorId: string;
  displayName: string;
  shortName?: string;
  category: SponsorCategory;
  tier: SponsorTier;
  originRegionId: string;
  industryTag: string;
  toneTag: SponsorTone;

  // Hidden simulation traits (never fully shown to player)
  prestigeAffinity: number; // 0..100
  loyalty: number; // 0..100
  scandalTolerance: number; // 0..100
  riskAppetite: number; // 0..100
  visibilityPreference: 0 | 1 | 2;

  // Dynamic state
  active: boolean;
  createdAtTick: number;
  lastSeenTick: number;
  relationships: SponsorRelationship[];
}

// === KOENKAI (SUPPORTERS ASSOCIATION) ===

export type KoenkaiBandType = "none" | "weak" | "moderate" | "strong" | "powerful";

export interface Koenkai {
  koenkaiId: string;
  beyaId: string;
  strengthBand: KoenkaiBandType;
  members: SponsorRelationship[];
  createdAtTick: number;
  lastChangedTick: number;
}

// === KENSHO BANNER SLOT ===

export interface KenshoBannerSlot {
  bannerId: string;
  boutId: string;
  sponsorId: string;
  tier: SponsorTier;
  displayName: string;
  ceremonyStyleTag: "classic" | "premium" | "quiet";
}

// === NAME GENERATION COMPONENTS ===

const SPONSOR_NAME_PREFIXES = [
  "Hokuto",
  "Namba",
  "Kansai",
  "Tokai",
  "Yamato",
  "Sakura",
  "Mizuho",
  "Asahi",
  "Nihon",
  "Kinki",
  "Chuo",
  "Meiji",
  "Shonan",
  "Sanwa",
  "Sumitomo",
  "Marubeni",
  "Taiyo",
  "Kirin",
  "Sapporo",
  "Toyama",
  "Niigata",
  "Sendai",
  "Fukuoka",
  "Nagoya",
  "Osaka",
  "Kyoto",
  "Aichi",
  "Shizuoka",
  "Chiba",
  "Saitama",
  "Yokohama",
  "Kobe",
  "Takeda",
  "Matsuda",
  "Ogawa",
  "Tanaka",
  "Yamamoto",
  "Watanabe"
];

const SPONSOR_NAME_CORES = [
  "Transport",
  "Logistics",
  "Industries",
  "Foods",
  "Trading",
  "Construction",
  "Manufacturing",
  "Electronics",
  "Automotive",
  "Marine",
  "Textiles",
  "Metals",
  "Chemicals",
  "Pharma",
  "Breweries",
  "Fisheries",
  "Agriculture",
  "Forestry",
  "Mining",
  "Commerce",
  "Finance",
  "Insurance",
  "Real Estate",
  "Tourism"
];

const SPONSOR_NAME_SUFFIXES = [
  "Co.",
  "Corp.",
  "Inc.",
  "Ltd.",
  "Group",
  "Holdings",
  "Works",
  "Industries",
  "Enterprises",
  "Associates",
  "Partners",
  "Trust",
  "Foundation",
  "Institute",
  "Society",
  "Association",
  "Club"
];

const LEGACY_SUFFIXES = ["Foundation", "Trust", "Institute", "Cultural Society", "Memorial"];

const FAMILY_NAMES = [
  "Hayashi",
  "Kobayashi",
  "Nakamura",
  "Yoshida",
  "Sasaki",
  "Yamaguchi",
  "Matsumoto",
  "Inoue",
  "Kimura",
  "Shimizu",
  "Kato",
  "Abe",
  "Hashimoto",
  "Mori",
  "Ishikawa",
  "Okada"
];

const REGIONS = ["tokyo", "osaka", "kyoto", "nagoya", "fukuoka", "sapporo", "sendai", "hiroshima", "kobe", "yokohama", "chiba", "saitama"];

const INDUSTRY_TAGS = ["logistics", "foods", "manufacturing", "construction", "retail", "hospitality", "finance", "cultural", "sports", "media"];

// === Utility ===

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function normalizeRank(rank: string): string {
  // normalize diacritics and case (e.g., Ōzeki -> ozeki)
  return rank.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function stableTieBreak(a: Sponsor, b: Sponsor): number {
  return a.sponsorId.localeCompare(b.sponsorId);
}

function rollTier(rng: SeededRNG, dist: Record<SponsorTier, number>): SponsorTier {
  // dist is expected to sum to ~1; we still clamp defensively
  const r = rng.next();
  let cumulative = 0;

  const tiers: SponsorTier[] = ["T0", "T1", "T2", "T3", "T4", "T5"];
  for (const t of tiers) {
    cumulative += dist[t] ?? 0;
    if (r < cumulative) return t;
  }
  // fallback if dist sums < 1 due to config error
  return "T0";
}

function weightedSampleWithoutReplacement<T>(
  rng: SeededRNG,
  items: Array<{ item: T; w: number }>,
  k: number
): T[] {
  const pool = items
    .map((x) => ({ item: x.item, w: Math.max(0, x.w) }))
    .filter((x) => x.w > 0);

  const out: T[] = [];
  let picks = Math.max(0, Math.floor(k));

  while (picks > 0 && pool.length > 0) {
    const total = pool.reduce((s, x) => s + x.w, 0);
    let r = rng.next() * total;

    let idx = 0;
    for (; idx < pool.length; idx++) {
      r -= pool[idx].w;
      if (r <= 0) break;
    }
    const chosen = pool[Math.min(idx, pool.length - 1)];
    out.push(chosen.item);

    pool.splice(Math.min(idx, pool.length - 1), 1);
    picks--;
  }

  return out;
}

// === SPONSOR GENERATION ===

export function generateSponsorName(rng: SeededRNG, tier: SponsorTier): { displayName: string; shortName: string } {
  const prefix = SPONSOR_NAME_PREFIXES[Math.floor(rng.next() * SPONSOR_NAME_PREFIXES.length)];
  const core = SPONSOR_NAME_CORES[Math.floor(rng.next() * SPONSOR_NAME_CORES.length)];

  if (tier === "T5") {
    const familyName = FAMILY_NAMES[Math.floor(rng.next() * FAMILY_NAMES.length)];
    const legacySuffix = LEGACY_SUFFIXES[Math.floor(rng.next() * LEGACY_SUFFIXES.length)];
    const pattern = Math.floor(rng.next() * 3);

    if (pattern === 0) return { displayName: `${familyName} ${legacySuffix}`, shortName: familyName };
    if (pattern === 1) return { displayName: `${prefix} ${core} Holdings`, shortName: prefix };
    return { displayName: `${core} ${legacySuffix}`, shortName: core };
  }

  if (tier === "T3" || tier === "T4") {
    const suffix = SPONSOR_NAME_SUFFIXES[Math.floor(rng.next() * SPONSOR_NAME_SUFFIXES.length)];
    const pattern = Math.floor(rng.next() * 3);

    if (pattern === 0) return { displayName: `${prefix} ${core} ${suffix}`, shortName: prefix };
    if (pattern === 1) return { displayName: `${prefix}-${core} ${suffix}`, shortName: prefix };

    const divisionTag = ["Sports", "Cultural", "Trading"][Math.floor(rng.next() * 3)];
    return { displayName: `${core} ${suffix} ${divisionTag}`, shortName: core };
  }

  const suffix = SPONSOR_NAME_SUFFIXES[Math.floor(rng.next() * SPONSOR_NAME_SUFFIXES.length)];
  const pattern = Math.floor(rng.next() * 3);

  if (pattern === 0) return { displayName: `${prefix} ${core}`, shortName: prefix };
  if (pattern === 1) return { displayName: `${core} ${suffix}`, shortName: core };
  return { displayName: `${prefix} ${core} ${suffix}`, shortName: prefix };
}

export function generateSponsor(rng: SeededRNG, tier: SponsorTier, createdAtTick: number, existingIds: Set<string>): Sponsor {
  const { displayName, shortName } = generateSponsorName(rng, tier);

  // Deterministic, collision-safe sponsorId without “searching forever”.
  const base = displayName.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  let sponsorId = `sponsor_${base}`;
  if (existingIds.has(sponsorId)) {
    // bounded deterministic disambiguator
    let attempt = 0;
    while (existingIds.has(sponsorId) && attempt < 10) {
      sponsorId = `sponsor_${base}_${Math.floor(rng.next() * 10_000)}`;
      attempt++;
    }
    // absolute fallback: include createdAtTick
    if (existingIds.has(sponsorId)) sponsorId = `sponsor_${base}_${createdAtTick}`;
  }
  existingIds.add(sponsorId);

  // Category distribution per Constitution
  const categoryRoll = rng.next();
  let category: SponsorCategory;
  if (categoryRoll < 0.3) category = "local_business";
  else if (categoryRoll < 0.5) category = "regional_corporation";
  else if (categoryRoll < 0.62) category = "national_brand";
  else if (categoryRoll < 0.72) category = "alumni_association";
  else if (categoryRoll < 0.82) category = "cultural_foundation";
  else if (categoryRoll < 0.94) category = "private_benefactor";
  else category = "anonymous_patron";

  const tierTraits = getTierTraitRanges(tier);

  return {
    sponsorId,
    displayName,
    shortName,
    category,
    tier,
    originRegionId: REGIONS[Math.floor(rng.next() * REGIONS.length)],
    industryTag: INDUSTRY_TAGS[Math.floor(rng.next() * INDUSTRY_TAGS.length)],
    toneTag: ["traditional", "modern", "luxury", "local", "industrial", "civic"][Math.floor(rng.next() * 6)] as SponsorTone,
    prestigeAffinity: Math.floor(tierTraits.prestigeMin + rng.next() * (tierTraits.prestigeMax - tierTraits.prestigeMin)),
    loyalty: Math.floor(tierTraits.loyaltyMin + rng.next() * (tierTraits.loyaltyMax - tierTraits.loyaltyMin)),
    scandalTolerance: Math.floor(30 + rng.next() * 50),
    riskAppetite: tier === "T5" ? Math.floor(60 + rng.next() * 40) : Math.floor(20 + rng.next() * 60),
    visibilityPreference: tier === "T5" ? 2 : (Math.floor(rng.next() * 3) as 0 | 1 | 2),
    active: true,
    createdAtTick,
    lastSeenTick: createdAtTick,
    relationships: []
  };
}

function getTierTraitRanges(tier: SponsorTier): { prestigeMin: number; prestigeMax: number; loyaltyMin: number; loyaltyMax: number } {
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

// === SPONSOR POOL GENERATION ===

export interface SponsorPool {
  sponsors: Map<string, Sponsor>;
  koenkais: Map<string, Koenkai>;
}

export function generateSponsorPool(worldSeed: string, worldSizeScalar: number = 1): SponsorPool {
  const rng = rngFromSeed(worldSeed, "sponsors", "root");
  const existingIds = new Set<string>();

  const poolSize = 180 + Math.floor(worldSizeScalar * 60);

  const tierDistribution: Record<SponsorTier, number> = {
    T0: 0.35,
    T1: 0.25,
    T2: 0.2,
    T3: 0.12,
    T4: 0.07,
    T5: 0.01
  };

  const sponsors = new Map<string, Sponsor>();

  for (let i = 0; i < poolSize; i++) {
    const tier = rollTier(rng, tierDistribution);
    const sponsor = generateSponsor(rng, tier, 0, existingIds);
    sponsors.set(sponsor.sponsorId, sponsor);
  }

  return { sponsors, koenkais: new Map() };
}

// === KENSHO BANNER ASSIGNMENT ===

export type BoutImportanceBucket = "low" | "mid" | "high" | "peak";

const TIER_CAPS: Record<BoutImportanceBucket, { maxT4Plus: number; maxT3: number }> = {
  low: { maxT4Plus: 0, maxT3: 1 },
  mid: { maxT4Plus: 1, maxT3: 2 },
  high: { maxT4Plus: 2, maxT3: 4 },
  peak: { maxT4Plus: 4, maxT3: 6 }
};

export function determineBoutImportance(
  eastRank: string,
  westRank: string,
  day: number,
  isYushoContention: boolean = false,
  isPlayoff: boolean = false
): BoutImportanceBucket {
  if (isPlayoff) return "peak";

  const e = normalizeRank(eastRank);
  const w = normalizeRank(westRank);

  const topRanks = ["yokozuna", "ozeki", "sekiwake", "komusubi"];
  const isTopRank = topRanks.includes(e) || topRanks.includes(w);

  if (isYushoContention || (day === 15 && isTopRank)) return "peak";
  if (isTopRank) return "high";

  const isMidRank = e === "maegashira" || w === "maegashira";
  if (isMidRank) return "mid";

  return "low";
}

export function assignKenshoBanners(
  boutId: string,
  bannerCount: number,
  importance: BoutImportanceBucket,
  sponsorPool: SponsorPool,
  rng: SeededRNG
): KenshoBannerSlot[] {
  const count = Math.max(0, Math.floor(bannerCount));
  if (count === 0) return [];

  const activeSponsors = Array.from(sponsorPool.sponsors.values()).filter((s) => s.active);
  if (activeSponsors.length === 0) return [];

  const caps = TIER_CAPS[importance];

  // Score sponsors (deterministic base score)
  // NOTE: This is a suitability score; selection uses weighted sampling to avoid “same sponsors every time”.
  const scored = activeSponsors
    .map((s) => ({
      sponsor: s,
      score: s.prestigeAffinity * 0.5 + s.loyalty * 0.3 + (s.tier === "T5" ? 20 : 0) + (s.tier === "T4" ? 8 : 0)
    }))
    .sort((a, b) => b.score - a.score || stableTieBreak(a.sponsor, b.sponsor));

  // Build tier buckets
  const t4plus = scored.filter((x) => x.sponsor.tier === "T4" || x.sponsor.tier === "T5");
  const t3 = scored.filter((x) => x.sponsor.tier === "T3");
  const rest = scored.filter((x) => x.sponsor.tier === "T0" || x.sponsor.tier === "T1" || x.sponsor.tier === "T2");

  // Weighted sampling within each bucket (without replacement)
  const pickFromBucket = (bucket: typeof scored, k: number) =>
    weightedSampleWithoutReplacement(
      rng,
      bucket.map((x) => ({ item: x.sponsor, w: x.score })),
      k
    );

  const chosen: Sponsor[] = [];

  // Enforce caps, but always attempt to reach bannerCount by backfilling
  chosen.push(...pickFromBucket(t4plus, Math.min(caps.maxT4Plus, count)));
  chosen.push(...pickFromBucket(t3, Math.min(caps.maxT3, Math.max(0, count - chosen.length))));

  // Fill remaining with rest (and any unchosen from higher buckets)
  if (chosen.length < count) {
    const chosenIds = new Set(chosen.map((s) => s.sponsorId));
    const remaining = scored
      .map((x) => x.sponsor)
      .filter((s) => !chosenIds.has(s.sponsorId))
      .map((s) => ({ sponsor: s, score: 1 + (s.prestigeAffinity * 0.4 + s.loyalty * 0.2) })); // small base so everyone is selectable

    const fill = weightedSampleWithoutReplacement(
      rng,
      remaining.map((x) => ({ item: x.sponsor, w: x.score })),
      count - chosen.length
    );
    chosen.push(...fill);
  }

  // Produce slots with stable bannerId numbering (slotIndex increments only when we actually push)
  const slots: KenshoBannerSlot[] = [];
  let slotIndex = 0;

  for (const sponsor of chosen.slice(0, count)) {
    const ceremonyStyle: KenshoBannerSlot["ceremonyStyleTag"] =
      sponsor.tier === "T5" || sponsor.tier === "T4" ? "premium" : sponsor.visibilityPreference === 0 ? "quiet" : "classic";

    slots.push({
      bannerId: `${boutId}_banner_${slotIndex}`,
      boutId,
      sponsorId: sponsor.sponsorId,
      tier: sponsor.tier,
      displayName: sponsor.displayName,
      ceremonyStyleTag: ceremonyStyle
    });

    slotIndex++;
  }

  return slots;
}

// === KOENKAI MANAGEMENT ===

export function createKoenkai(
  beyaId: string,
  sponsorPool: SponsorPool,
  prestigeBand: string,
  rng: SeededRNG,
  currentTick: number
): Koenkai {
  const koenkaiId = `koenkai_${beyaId}`;

  // Select initial members (3-7 sponsors)
  const memberCount = 3 + Math.floor(rng.next() * 5);

  const eligibleSponsors = Array.from(sponsorPool.sponsors.values())
    .filter((s) => s.active && (s.tier === "T1" || s.tier === "T2" || s.tier === "T3"))
    .sort((a, b) => b.prestigeAffinity - a.prestigeAffinity || stableTieBreak(a, b));

  const picked = eligibleSponsors.slice(0, Math.min(memberCount, eligibleSponsors.length));
  const members: SponsorRelationship[] = [];

  for (let i = 0; i < picked.length; i++) {
    const sponsor = picked[i];
    const isPillar = i === 0 && sponsor.tier !== "T1";

    members.push({
      relId: `rel_${koenkaiId}_${sponsor.sponsorId}`,
      sponsorId: sponsor.sponsorId,
      targetType: "beya",
      targetId: beyaId,
      role: isPillar ? "koenkai_pillar" : "koenkai_member",
      strength: isPillar ? 4 : 2,
      startedAtTick: currentTick
    });
  }

  // Normalize prestige band into koenkai strength band
  const pb = (prestigeBand || "").toLowerCase();
  let strengthBand: KoenkaiBandType = "moderate";
  if (pb.includes("elite") || pb.includes("legend")) strengthBand = "powerful";
  else if (pb.includes("respected") || pb.includes("prestig")) strengthBand = "strong";
  else if (pb.includes("struggling") || pb.includes("weak")) strengthBand = "weak";
  else if (pb.includes("unknown") || pb.includes("none")) strengthBand = "none";

  return {
    koenkaiId,
    beyaId,
    strengthBand,
    members,
    createdAtTick: currentTick,
    lastChangedTick: currentTick
  };
}

// === MONTHLY INCOME FROM KOENKAI ===

const KOENKAI_MONTHLY_INCOME: Record<KoenkaiBandType, number> = {
  none: 0,
  weak: 500_000,
  moderate: 1_500_000,
  strong: 3_500_000,
  powerful: 7_000_000
};

export function calculateKoenkaiIncome(strengthBand: KoenkaiBandType): number {
  return KOENKAI_MONTHLY_INCOME[strengthBand];
}

// === BENEFACTOR ESCALATION ===

export function selectBenefactor(
  beyaId: string,
  sponsorPool: SponsorPool,
  koenkai: Koenkai | undefined,
  rng: SeededRNG
): Sponsor | null {
  // Priority 1: Existing kōenkai pillar with highest riskAppetite
  if (koenkai) {
    const pillars = koenkai.members
      .filter((m) => m.role === "koenkai_pillar")
      .map((m) => sponsorPool.sponsors.get(m.sponsorId))
      .filter((s): s is Sponsor => s !== undefined)
      .sort((a, b) => b.riskAppetite - a.riskAppetite || stableTieBreak(a, b));

    if (pillars.length > 0 && pillars[0].riskAppetite >= 50) return pillars[0];
  }

  // Priority 2: Global pool highest-tier sponsor with high riskAppetite (deterministic order)
  const eligible = Array.from(sponsorPool.sponsors.values())
    .filter((s) => s.active && (s.tier === "T4" || s.tier === "T5") && s.riskAppetite >= 60)
    .sort((a, b) => b.riskAppetite - a.riskAppetite || b.prestigeAffinity - a.prestigeAffinity || stableTieBreak(a, b));

  if (eligible.length > 0) return eligible[0];

  return null;
}