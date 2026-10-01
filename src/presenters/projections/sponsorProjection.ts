/**
 * sponsorProjection.ts
 *
 * Sponsor-related projection functions.
 * Extracted from uiDigest.ts to separate concerns.
 */

import type { WorldState } from "../../engine/types/world";
import { SPONSOR_TIER_INCOME } from "../../engine/systems/economy/SponsorshipService";
import { KOENKAI_MONTHLY_INCOME } from "../../engine/systems/economy/sponsorshipQueries";
import { SPONSOR_RENEWAL_WINDOW_WEEKS } from "../../constants/engine/time";
import { getPlayerHeya } from "../../engine/queries";

interface SponsorData {
  sponsorId: string;
  sponsorName: string;
  name: string;
  relId: string;
  tier: string;
  power: number;
  monthlyIncome: number;
  weeksRemaining: number;
  isExpiringSoon: boolean;
  loyalty: number;
  since: number;
  category: string;
  role: string;
  satisfaction: number;
}

// Type definitions for our internal cache
type SponsorAny = {
  id: string;
  name: string;
  displayName?: string;
  shortName?: string;
  loyalty: number;
  tier: string;
  category?: string;
  satisfaction?: number;
  active: boolean;
  relationships: RelAny[];
};
type RelAny = {
  targetId: string;
  endsAtTick?: number;
  tier: string;
  strength: number;
  relId?: string;
  id?: string;
  since: number;
  role?: string;
};
type TargetMap = Map<string, Array<{ sponsor: SponsorAny; rel: RelAny }>>;

const sponsorRelationshipsCache = new WeakMap<Map<unknown, unknown>, TargetMap>();

function buildAndSortActiveSponsors(
  // Using any because sponsorPool structure varies between runtime and type definition
  pool: unknown,
  playerHeyaId: string,
  world: WorldState
): SponsorData[] {
  const activeSponsors: SponsorData[] = [];
  const sponsorMap = (pool as { sponsors: Map<unknown, unknown> }).sponsors;

  let relMap = sponsorRelationshipsCache.get(sponsorMap);
  if (!relMap) {
    relMap = new Map();
    for (const sponsor of sponsorMap.values()) {
      const s = sponsor as SponsorAny;
      if (!s.active) continue;
      for (const rel of s.relationships) {
        let list = relMap.get(rel.targetId);
        if (!list) {
          list = [];
          relMap.set(rel.targetId, list);
        }
        list.push({ sponsor: s, rel });
      }
    }
    sponsorRelationshipsCache.set(sponsorMap, relMap);
  }

  const targetRels = relMap.get(playerHeyaId);
  if (targetRels) {
    for (const { sponsor, rel } of targetRels) {
      activeSponsors.push(buildSponsorData(sponsor, rel, world));
    }
  }

  const tierOrder: Record<string, number> = {
    T5: 0,
    T4: 1,
    T3: 2,
    T2: 3,
    T1: 4,
  };

  activeSponsors.sort((a, b) => {
    const tierDiff = (tierOrder[a.tier] ?? 0) - (tierOrder[b.tier] ?? 0);
    if (tierDiff !== 0) return tierDiff;
    return b.power - a.power;
  });

  return activeSponsors;
}

function buildSponsorData(
  sponsor: {
    id: string;
    name: string;
    displayName?: string;
    shortName?: string;
    loyalty: number;
    tier: string;
    category?: string;
    satisfaction?: number;
  },
  rel: {
    endsAtTick?: number;
    tier: string;
    strength: number;
    relId?: string;
    id?: string;
    since: number;
    role?: string;
  },
  world: WorldState
): SponsorData {
  // endsAtTick is a monotonic WEEK counter (SponsorContractService sets
  // week + 52), not a tick — no /4. The engine's renewal window is 8 weeks.
  const weeksRemaining = Math.max(0, (rel.endsAtTick ?? 0) - (world.week ?? 0));
  const isExpiringSoon = weeksRemaining <= SPONSOR_RENEWAL_WINDOW_WEEKS;
  const monthlyIncome = SPONSOR_TIER_INCOME[sponsor.tier as keyof typeof SPONSOR_TIER_INCOME] ?? 0;

  return {
    sponsorId: sponsor.id,
    sponsorName: sponsor.name,
    name: sponsor.displayName ?? sponsor.name ?? sponsor.shortName ?? sponsor.id,
    relId: rel.relId ?? rel.id ?? "",
    tier: sponsor.tier,
    power: rel.strength,
    monthlyIncome,
    weeksRemaining,
    isExpiringSoon,
    loyalty: sponsor.loyalty,
    since: rel.since,
    category: sponsor.category ?? "",
    role: rel.role ?? "",
    satisfaction: sponsor.satisfaction ?? 0,
  };
}

function calculateKoenkaiIncome(heya: { koenkaiBand?: string }): number {
  if (!heya.koenkaiBand) return 0;
  // Engine-authoritative table (0 / 500k / 1.5M / 3.5M / 7M per band) — the
  // old 200k×{0,.5,1,2,4} multiplier understated income 5-8x.
  return KOENKAI_MONTHLY_INCOME[heya.koenkaiBand as keyof typeof KOENKAI_MONTHLY_INCOME] ?? 0;
}

/**
 * Project sponsorship management data.
 */
export function projectSponsorUIDigest(world: WorldState) {
  const playerHeyaId = world.playerHeyaId;
  if (!playerHeyaId) return null;
  const heya = getPlayerHeya(world);
  if (!heya) return null;

  const pool = world.sponsorPool;
  if (!pool) return null;

  const activeSponsors = buildAndSortActiveSponsors(pool, playerHeyaId, world);
  const koenkaiIncome = calculateKoenkaiIncome(heya);
  const koenkaiStrength = heya.koenkaiBand ?? "none";

  let totalMonthlyIncome = koenkaiIncome;
  let expiringCount = 0;
  for (const s of activeSponsors) {
    totalMonthlyIncome += s.monthlyIncome;
    if (s.isExpiringSoon) expiringCount++;
  }

  return {
    koenkaiName: `${heya.name} Supporters Association`,
    power: koenkaiStrength,
    activeSponsors,
    totalMonthlyIncome,
    expiringCount,
    koenkaiIncome,
  };
}
