import { SeededRNG, rngFromSeed } from "../rng";
import { Rikishi } from "../types/rikishi";
import { WorldState } from "../types/world";
import { 
  Sponsor, 
  SponsorTier, 
  SponsorPool, 
  Koenkai, 
  KoenkaiBandType, 
  SponsorRelationship,
  SponsorRole
} from "../types/sponsors";
import { 
  generateSponsor, 
  rollTier 
} from "./generation/SponsorGenerator";

/** Type representing kensho banner slot. */
export interface KenshoBannerSlot {
  bannerId: string;
  boutId: string;
  sponsorId: string;
  tier: SponsorTier;
  displayName: string;
  ceremonyStyleTag: "classic" | "premium" | "quiet";
}

/** Type representing bout importance bucket. */
export type BoutImportanceBucket = "low" | "mid" | "high" | "peak";

const TIER_CAPS: Record<BoutImportanceBucket, { maxT4Plus: number; maxT3: number }> = {
  low: { maxT4Plus: 0, maxT3: 1 },
  mid: { maxT4Plus: 1, maxT3: 2 },
  high: { maxT4Plus: 2, maxT3: 4 },
  peak: { maxT4Plus: 4, maxT3: 6 }
};

const KOENKAI_MONTHLY_INCOME: Record<KoenkaiBandType, number> = {
  none: 0,
  weak: 500_000,
  moderate: 1_500_000,
  strong: 3_500_000,
  powerful: 7_000_000
};

/**
 * Normalize rank strings for comparison
 */
function normalizeRank(rank: string): string {
  return rank.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Stable tie break for sponsor sorting
 */
function stableTieBreak(a: Sponsor, b: Sponsor): number {
  return a.sponsorId.localeCompare(b.sponsorId);
}

/**
 * Weighted sample without replacement helper
 */
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
    const chosenIdx = Math.min(idx, pool.length - 1);
    const chosen = pool[chosenIdx];
    out.push(chosen.item);

    pool.splice(chosenIdx, 1);
    picks--;
  }

  return out;
}

/**
 * Apply achievement impacts to popularity
 */
export function applyAchievementImpact(world: WorldState, rikishi: Rikishi, awardType: 'kinboshi' | 'ginboshi' | 'sansho'): void {
  const economics = (rikishi as any).economics;
  if (!economics) return;
  
  let popBoost = 0;
  if (awardType === 'kinboshi') popBoost = 20;
  else if (awardType === 'ginboshi') popBoost = 8;
  else if (awardType === 'sansho') popBoost = 12;
  
  economics.popularity = Math.min(100, (economics.popularity || 0) + popBoost);
}

/**
 * Calculates kensho envelopes based on importance and buzz.
 * Ref: Phase 3.2 implementation plan.
 */
export function calculateKenshoEnvelopes(
  world: WorldState,
  rikishi: Rikishi,
  awardFact: string | undefined,
  rng: SeededRNG
): number {
  let count = 0;
  
  if (awardFact === 'kinboshi') {
    count = Math.floor(15 + rng.next() * 11);
  } else if (awardFact === 'ginboshi') {
    count = Math.floor(5 + rng.next() * 4);
  } else {
    // Standard varies by division and impact
    count = Math.floor(1 + rng.next() * 3);
  }

  // --- BUZZ MULTIPLIER (Phase 3.2) ---
  const mediaState = world.mediaState;
  if (mediaState && mediaState.mediaHeat) {
    const heat = mediaState.mediaHeat[rikishi.id] || 0;
    // Every 20 points of heat adds +25% kensho interest
    const buzzMod = 1.0 + (heat / 80); 
    count = Math.round(count * buzzMod);
  }

  return count;
}

/**
 * Determine bout importance for kensho allocation
 */
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

/**
 * Assign kensho banners to a bout
 */
export function assignKenshoBanners(
  boutId: string,
  bannerCount: number,
  importance: BoutImportanceBucket,
  sponsors: Sponsor[],
  rng: SeededRNG
): KenshoBannerSlot[] {
  const count = Math.max(0, Math.floor(bannerCount));
  if (count === 0 || sponsors.length === 0) return [];

  const activeSponsors = sponsors.filter(s => s.active);
  if (activeSponsors.length === 0) return [];

  const caps = TIER_CAPS[importance];

  const scored = activeSponsors
    .map((s) => ({
      sponsor: s,
      score: s.prestigeAffinity * 0.5 + s.loyalty * 0.3 + (s.tier === "T5" ? 20 : 0) + (s.tier === "T4" ? 8 : 0)
    }))
    .sort((a, b) => b.score - a.score || stableTieBreak(a.sponsor, b.sponsor));

  const t4plus = scored.filter((x) => x.sponsor.tier === "T4" || x.sponsor.tier === "T5");
  const t3 = scored.filter((x) => x.sponsor.tier === "T3");

  const pickFromBucket = (bucket: typeof scored, k: number) =>
    weightedSampleWithoutReplacement(
      rng,
      bucket.map((x) => ({ item: x.sponsor, w: x.score })),
      k
    );

  const chosen: Sponsor[] = [];
  chosen.push(...pickFromBucket(t4plus, Math.min(caps.maxT4Plus, count)));
  chosen.push(...pickFromBucket(t3, Math.min(caps.maxT3, Math.max(0, count - chosen.length))));

  if (chosen.length < count) {
    const chosenIds = new Set(chosen.map((s) => s.sponsorId));
    const remaining = scored
      .map((x) => x.sponsor)
      .filter((s) => !chosenIds.has(s.sponsorId))
      .map((s) => ({ sponsor: s, score: 1 + (s.prestigeAffinity * 0.4 + s.loyalty * 0.2) }));

    const fill = weightedSampleWithoutReplacement(
      rng,
      remaining.map((x) => ({ item: x.sponsor, w: x.score })),
      count - chosen.length
    );
    chosen.push(...fill);
  }


  return chosen.slice(0, count).map((sponsor, index) => {
    const ceremonyStyle: KenshoBannerSlot["ceremonyStyleTag"] =
      sponsor.tier === "T5" || sponsor.tier === "T4" ? "premium" : sponsor.visibilityPreference === 0 ? "quiet" : "classic";

    return {
      bannerId: `${boutId}_banner_${index}`,
      boutId,
      sponsorId: sponsor.sponsorId,
      tier: sponsor.tier,
      displayName: sponsor.displayName,
      ceremonyStyleTag: ceremonyStyle
    };
  });
}

/**
 * Create a new Koenkai (Supporters Association)
 */
export function createKoenkai(
  beyaId: string,
  availableSponsors: Sponsor[],
  prestigeBand: string,
  rng: SeededRNG,
  currentTick: number
): Koenkai {
  const koenkaiId = `koenkai_${beyaId}`;
  const memberCount = 3 + Math.floor(rng.next() * 5);

  const eligibleSponsors = availableSponsors
    .filter(s => s.active && (s.tier === "T1" || s.tier === "T2" || s.tier === "T3"))
    .sort((a, b) => b.prestigeAffinity - a.prestigeAffinity || stableTieBreak(a, b));

  const picked = eligibleSponsors.slice(0, Math.min(memberCount, eligibleSponsors.length));
  const members: SponsorRelationship[] = picked.map((sponsor, i) => {
    const isPillar = i === 0 && sponsor.tier !== "T1";
    return {
      relId: `rel_${koenkaiId}_${sponsor.sponsorId}`,
      sponsorId: sponsor.sponsorId,
      targetType: "beya",
      targetId: beyaId,
      role: isPillar ? "koenkai_pillar" : "koenkai_member",
      strength: isPillar ? 4 : 2,
      startedAtTick: currentTick
    };
  });

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


/**
 * Calculate income from supporters for a month
 */
export function calculateKoenkaiIncome(strengthBand: KoenkaiBandType): number {
  return KOENKAI_MONTHLY_INCOME[strengthBand];
}

/**
 * Generate the initial sponsor pool for a new world
 */
export function generateInitialSponsorPool(worldSeed: string, worldSizeScalar: number = 1): SponsorPool {
  const rng = rngFromSeed(worldSeed, "sponsors", "root");
  const existingIds = new Set<string>();
  const poolSize = 180 + Math.floor(worldSizeScalar * 60);

  const tierDistribution: Record<SponsorTier, number> = {
    T0: 0.35, T1: 0.25, T2: 0.2, T3: 0.12, T4: 0.07, T5: 0.01
  };

  const sponsors = new Map<string, Sponsor>();
  for (let i = 0; i < poolSize; i++) {
    const tier = rollTier(rng, tierDistribution);
    const sponsor = generateSponsor(rng, tier, 0, existingIds);
    sponsors.set(sponsor.sponsorId, sponsor);
  }

  return {
    sponsors,
    koenkais: new Map()
  };
}

/**
 * Identify a potential high-tier benefactor for a stable
 */
export function selectBenefactor(
  beyaId: string,
  availableSponsors: Sponsor[],
  koenkai: Koenkai | undefined,
  rng: SeededRNG
): Sponsor | null {
  if (koenkai) {
    const pillars = koenkai.members
      .filter((m) => m.role === "koenkai_pillar")
      .map((m) => availableSponsors.find(s => s.sponsorId === m.sponsorId))
      .filter((s): s is Sponsor => s !== undefined)
      .sort((a, b) => b.riskAppetite - a.riskAppetite || a.sponsorId.localeCompare(b.sponsorId));

    if (pillars.length > 0 && pillars[0].riskAppetite >= 50) return pillars[0];
  }

  const eligible = availableSponsors
    .filter((s) => s.active && (s.tier === "T4" || s.tier === "T5") && s.riskAppetite >= 60)
    .sort((a, b) => b.riskAppetite - a.riskAppetite || b.prestigeAffinity - a.prestigeAffinity || a.sponsorId.localeCompare(b.sponsorId));

  if (eligible.length > 0) return eligible[0];

  return null;
}
