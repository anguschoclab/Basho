/**
 * sponsorProjection.ts
 *
 * Sponsor-related projection functions.
 * Extracted from uiDigest.ts to separate concerns.
 */

import type { WorldState } from "../../engine/types/world";
import { KOENKAI_MONTHLY_INCOME } from "../../engine/systems/economics/SponsorshipService";

interface SponsorData {
  sponsorId: string;
  sponsorName: string;
  name: string;
  relId: string;
  tier: string;
  strength: number;
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
type SponsorAny = { id: string; name: string; displayName?: string; shortName?: string; loyalty: number; category?: string; satisfaction?: number; active: boolean; relationships: RelAny[] };
type RelAny = { targetId: string; endsAtTick?: number; tier: string; strength: number; relId?: string; id?: string; since: number; role?: string };
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
    if (tierDiff !== 0) return -tierDiff;
    return b.strength - a.strength;
  });

  return activeSponsors;
}

function buildSponsorData(
  sponsor: { id: string; name: string; displayName?: string; shortName?: string; loyalty: number; category?: string; satisfaction?: number },
  rel: { endsAtTick?: number; tier: string; strength: number; relId?: string; id?: string; since: number; role?: string },
  world: WorldState
): SponsorData {
  const weeksRemaining = Math.max(0, Math.floor((rel.endsAtTick - (world.week ?? 0)) / 4));
  const isExpiringSoon = weeksRemaining <= 4;
  const monthlyIncome =
    KOENKAI_MONTHLY_INCOME[rel.tier as keyof typeof KOENKAI_MONTHLY_INCOME] || 0;

  return {
    sponsorId: sponsor.id,
    sponsorName: sponsor.name,
    name: sponsor.displayName ?? sponsor.name ?? sponsor.shortName ?? sponsor.id,
    relId: rel.relId ?? rel.id ?? "",
    tier: rel.tier,
    strength: rel.strength,
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
  const bandMultiplier = {
    none: 0,
    weak: 0.5,
    moderate: 1,
    strong: 2,
    dominant: 4,
  };
  return Math.floor(
    200000 * (bandMultiplier[heya.koenkaiBand as keyof typeof bandMultiplier] || 0)
  );
}

/**
 * Project sponsorship management data.
 */
export function projectSponsorUIDigest(world: WorldState) {
  const playerHeyaId = world.playerHeyaId;
  if (!playerHeyaId) return null;
  const heya = world.heyas.get(playerHeyaId);
  if (!heya) return null;

  const pool = world.sponsorPool;
  if (!pool) return null;

  const activeSponsors = buildAndSortActiveSponsors(pool, playerHeyaId, world);
  const koenkaiIncome = calculateKoenkaiIncome(heya);
  const koenkaiStrength = heya.koenkaiBand ?? "none";

  return {
    koenkaiName: `${heya.name} Supporters Association`,
    strength: koenkaiStrength,
    activeSponsors,
    totalMonthlyIncome: activeSponsors.reduce((sum, s) => sum + s.monthlyIncome, 0) + koenkaiIncome,
    expiringCount: activeSponsors.filter((s) => s.isExpiringSoon).length,
    koenkaiIncome,
  };
}
