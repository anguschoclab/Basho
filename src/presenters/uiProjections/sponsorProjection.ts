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

function buildAndSortActiveSponsors(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pool: any,
  playerHeyaId: string,
  world: WorldState
): SponsorData[] {
  const activeSponsors: SponsorData[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const sponsor of pool.sponsors.values() as any[]) {
    if (!sponsor.active) continue;
    for (const rel of sponsor.relationships) {
      if (rel.targetId !== playerHeyaId) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      activeSponsors.push(buildSponsorData(sponsor as any, rel as any, world));
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSponsorData(sponsor: any, rel: any, world: WorldState): SponsorData {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calculateKoenkaiIncome(heya: any): number {
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
