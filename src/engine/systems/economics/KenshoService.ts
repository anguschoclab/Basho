import { SeededRNG } from "../../rng";
import type { 
  Sponsor, 
  SponsorPool, 
  KenshoBannerSlot 
} from "../../types/sponsors";
import type { WorldState } from "../../types/world";
import type { Rikishi } from "../../types/rikishi";

/** Type representing bout importance bucket. */
export type BoutImportanceBucket = "low" | "mid" | "high" | "peak";

const TIER_CAPS: Record<BoutImportanceBucket, { maxT4Plus: number; maxT3: number }> = {
  low: { maxT4Plus: 0, maxT3: 1 },
  mid: { maxT4Plus: 1, maxT3: 2 },
  high: { maxT4Plus: 2, maxT3: 4 },
  peak: { maxT4Plus: 4, maxT3: 6 }
};

/**
 * Normalize rank for comparison.
 */
function normalizeRank(rank: string): string {
  return rank.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Determine bout importance based on ranks and context.
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
 * Weighted sample without replacement (Deterministic).
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
    const chosen = pool[Math.min(idx, pool.length - 1)];
    out.push(chosen.item);

    pool.splice(Math.min(idx, pool.length - 1), 1);
    picks--;
  }

  return out;
}

/**
 * Authoritative Kensho Banner Assignment logic.
 */
export function assignKenshoBanners(
  boutId: string,
  bannerCount: number,
  importance: BoutImportanceBucket,
  sponsorPool: SponsorPool,
  rng: SeededRNG
): KenshoBannerSlot[] {
  const count = Math.max(0, Math.floor(bannerCount));
  if (count === 0) return [];

  const activeSponsors: Sponsor[] = [];
  for (const s of sponsorPool.sponsors.values()) { if (s.active) activeSponsors.push(s); }
  if (activeSponsors.length === 0) return [];

  const caps = TIER_CAPS[importance];

  // Score sponsors
  const scored = activeSponsors
    .map((s) => ({
      sponsor: s,
      score: s.prestigeAffinity * 0.5 + s.loyalty * 0.3 + (s.tier === "T5" ? 20 : 0) + (s.tier === "T4" ? 8 : 0)
    }))
    .sort((a, b) => b.score - a.score || a.sponsor.sponsorId.localeCompare(b.sponsor.sponsorId));

  const t4plus = scored.filter((x) => x.sponsor.tier === "T4" || x.sponsor.tier === "T5");
  const t3 = scored.filter((x) => x.sponsor.tier === "T3");

  const chosen: Sponsor[] = [];
  chosen.push(...weightedSampleWithoutReplacement(rng, t4plus.map(x => ({ item: x.sponsor, w: x.score })), Math.min(caps.maxT4Plus, count)));
  chosen.push(...weightedSampleWithoutReplacement(rng, t3.map(x => ({ item: x.sponsor, w: x.score })), Math.min(caps.maxT3, Math.max(0, count - chosen.length))));

  if (chosen.length < count) {
    const chosenIds = new Set(chosen.map((s) => s.sponsorId));
    const remaining = scored
      .map((x) => x.sponsor)
      .filter((s) => !chosenIds.has(s.sponsorId))
      .map((s) => ({ item: s, w: 1 + (s.prestigeAffinity * 0.4 + s.loyalty * 0.2) }));

    const fill = weightedSampleWithoutReplacement(rng, remaining, count - chosen.length);
    chosen.push(...fill);
  }

  return chosen.slice(0, count).map((sponsor, idx) => ({
    bannerId: `${boutId}_banner_${idx}`,
    boutId,
    sponsorId: sponsor.sponsorId,
    tier: sponsor.tier,
    displayName: sponsor.displayName,
    ceremonyStyleTag: (sponsor.tier === "T5" || sponsor.tier === "T4") ? "premium" : (sponsor.visibilityPreference === 0 ? "quiet" : "classic")
  }));
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
