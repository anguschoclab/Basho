import { SeededRNG } from "../../rng";
import type { Sponsor, SponsorPool, KenshoBannerSlot } from "../../types/sponsors";
import type { WorldState } from "../../types/world";
import type { Rikishi } from "../../types/rikishi";
import {
  KENSHO_LOW_MAX_T4_PLUS,
  KENSHO_LOW_MAX_T3,
  KENSHO_MID_MAX_T4_PLUS,
  KENSHO_MID_MAX_T3,
  KENSHO_HIGH_MAX_T4_PLUS,
  KENSHO_HIGH_MAX_T3,
  KENSHO_PEAK_MAX_T4_PLUS,
  KENSHO_PEAK_MAX_T3,
  FINAL_BASHO_DAY,
  PRESTIGE_AFFINITY_T4_WEIGHT,
  LOYALTY_T4_WEIGHT,
  T5_TIER_BONUS,
  T4_TIER_BONUS,
  PRESTIGE_AFFINITY_T3_WEIGHT,
  LOYALTY_T3_WEIGHT,
  MEDIA_HEAT_DIVISOR,
  MIN_KINBOSHI_BANNER_COUNT,
  ADDITIONAL_KINBOSHI_BANNER_MAX,
  MIN_GINBOSHI_BANNER_COUNT,
  ADDITIONAL_GINBOSHI_BANNER_MAX,
} from "../../../constants/engine/economyExtended";
import { isSanyakuRank } from "@/constants/engine/rankDisplay";

/** Type representing bout importance bucket. */
export type BoutImportanceBucket = "low" | "mid" | "high" | "peak";

const TIER_CAPS: Record<BoutImportanceBucket, { maxT4Plus: number; maxT3: number }> = {
  low: { maxT4Plus: KENSHO_LOW_MAX_T4_PLUS, maxT3: KENSHO_LOW_MAX_T3 },
  mid: { maxT4Plus: KENSHO_MID_MAX_T4_PLUS, maxT3: KENSHO_MID_MAX_T3 },
  high: { maxT4Plus: KENSHO_HIGH_MAX_T4_PLUS, maxT3: KENSHO_HIGH_MAX_T3 },
  peak: { maxT4Plus: KENSHO_PEAK_MAX_T4_PLUS, maxT3: KENSHO_PEAK_MAX_T3 },
};

/**
 * Normalize rank for comparison.
 */
function normalizeRank(rank: string): string {
  return rank
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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

  const isTopRank = isSanyakuRank(e) || isSanyakuRank(w);

  if (isYushoContention || (day === FINAL_BASHO_DAY && isTopRank)) return "peak";
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
  const pool: Array<{ item: T; w: number }> = [];
  for (const x of items) {
    const w = Math.max(0, x.w);
    if (w > 0) pool.push({ item: x.item, w });
  }

  const out: T[] = [];
  let picks = Math.max(0, Math.floor(k));

  let total = 0;
  for (const x of pool) total += x.w;

  while (picks > 0 && pool.length > 0) {
    let r = rng.next() * total;

    let idx = 0;
    for (; idx < pool.length; idx++) {
      r -= pool[idx].w;
      if (r <= 0) break;
    }
    const chosen = pool[Math.min(idx, pool.length - 1)];
    out.push(chosen.item);

    total -= chosen.w;
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
  for (const s of sponsorPool.sponsors.values()) {
    if (s.active) activeSponsors.push(s);
  }
  if (activeSponsors.length === 0) return [];

  const caps = TIER_CAPS[importance];

  // Score sponsors
  const scored = activeSponsors
    .map((s) => ({
      sponsor: s,
      score:
        s.prestigeAffinity * PRESTIGE_AFFINITY_T4_WEIGHT +
        s.loyalty * LOYALTY_T4_WEIGHT +
        (s.tier === "T5" ? T5_TIER_BONUS : 0) +
        (s.tier === "T4" ? T4_TIER_BONUS : 0),
    }))
    .sort((a, b) => b.score - a.score || a.sponsor.sponsorId.localeCompare(b.sponsor.sponsorId));

  const t4plus = scored.filter((x) => x.sponsor.tier === "T4" || x.sponsor.tier === "T5");
  const t3 = scored.filter((x) => x.sponsor.tier === "T3");

  const chosen: Sponsor[] = [];
  chosen.push(
    ...weightedSampleWithoutReplacement(
      rng,
      t4plus.map((x) => ({ item: x.sponsor, w: x.score })),
      Math.min(caps.maxT4Plus, count)
    )
  );
  chosen.push(
    ...weightedSampleWithoutReplacement(
      rng,
      t3.map((x) => ({ item: x.sponsor, w: x.score })),
      Math.min(caps.maxT3, Math.max(0, count - chosen.length))
    )
  );

  if (chosen.length < count) {
    const chosenIds = new Set(chosen.map((s) => s.sponsorId));
    const remaining = scored
      .map((x) => x.sponsor)
      .filter((s) => !chosenIds.has(s.sponsorId))
      .map((s) => ({
        item: s,
        w: 1 + (s.prestigeAffinity * PRESTIGE_AFFINITY_T3_WEIGHT + s.loyalty * LOYALTY_T3_WEIGHT),
      }));

    const fill = weightedSampleWithoutReplacement(rng, remaining, count - chosen.length);
    chosen.push(...fill);
  }

  return chosen.slice(0, count).map((sponsor, idx) => {
    // Determine visual style for the parade
    let ceremonyStyleTag: "classic" | "premium" | "quiet" = "classic";
    if (sponsor.tier === "T5" || sponsor.tier === "T4") ceremonyStyleTag = "premium";
    else if (sponsor.visibilityPreference === 0) ceremonyStyleTag = "quiet";

    return {
      bannerId: `${boutId}_banner_${idx}`,
      boutId,
      sponsorId: sponsor.sponsorId,
      tier: sponsor.tier,
      displayName: sponsor.displayName,
      ceremonyStyleTag,
    };
  });
}

/**
 * Calculates kensho envelopes based on importance and buzz.
 * Ref: Phase 3.2 implementation plan.
 */
export function calculateKenshoEnvelopes(
  world: WorldState,
  rikishi: Rikishi,
  banners: KenshoBannerSlot[],
  awardFact: string | undefined,
  rng: SeededRNG
): number {
  // Baseline count reflects the actual sponsors who paid for banners
  let count = banners.length;

  const mediaState = world.mediaState;
  if (mediaState && mediaState.mediaHeat) {
    const heat = mediaState.mediaHeat[rikishi.id] || 0;
    const buzzMod = heat / MEDIA_HEAT_DIVISOR;
    // Fan donations/anonymous envelopes scale with buzz
    count += Math.round(count * buzzMod);
  }

  // Minimum guarantees for historic wins even if un-sponsored
  if (awardFact === "kinboshi" && count < MIN_KINBOSHI_BANNER_COUNT) {
    count = MIN_KINBOSHI_BANNER_COUNT + Math.floor(rng.next() * ADDITIONAL_KINBOSHI_BANNER_MAX);
  } else if (awardFact === "ginboshi" && count < MIN_GINBOSHI_BANNER_COUNT) {
    count = MIN_GINBOSHI_BANNER_COUNT + Math.floor(rng.next() * ADDITIONAL_GINBOSHI_BANNER_MAX);
  }

  return count;
}
