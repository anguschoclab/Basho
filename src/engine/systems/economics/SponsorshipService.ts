import { SeededRNG } from "../../rng";
import type { Rikishi } from "../../types/rikishi";
import type { 
  Sponsor, 
  SponsorPool, 
  Koenkai, 
  KoenkaiBandType, 
  SponsorRelationship 
} from "../../types/sponsors";
import { EventBus } from "../../events";

const KOENKAI_MONTHLY_INCOME: Record<KoenkaiBandType, number> = {
  none: 0,
  weak: 500_000,
  moderate: 1_500_000,
  strong: 3_500_000,
  powerful: 7_000_000
};

/**
 * Manage Koenkai (Supporter Association) creation and strength.
 */
export function createKoenkai(
  beyaId: string,
  sponsorPool: SponsorPool,
  prestigeBand: string,
  rng: SeededRNG,
  currentTick: number
): Koenkai {
  const koenkaiId = `koenkai_${beyaId}`;
  const memberCount = 3 + Math.floor(rng.next() * 5);

  const eligibleSponsors = Array.from(sponsorPool.sponsors.values())
    .filter((s) => s.active && (s.tier === "T1" || s.tier === "T2" || s.tier === "T3"))
    .sort((a, b) => b.prestigeAffinity - a.prestigeAffinity || a.sponsorId.localeCompare(b.sponsorId));

  const picked = eligibleSponsors.slice(0, Math.min(memberCount, eligibleSponsors.length));
  const members: SponsorRelationship[] = picked.map((sponsor, idx) => {
    const isPillar = idx === 0 && sponsor.tier !== "T1";
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
 * Calculate recurring income from a Koenkai.
 */
export function calculateKoenkaiIncome(strengthBand: KoenkaiBandType): number {
  return KOENKAI_MONTHLY_INCOME[strengthBand] || 0;
}

/**
 * Procedural benefactor selection logic.
 */
export function selectBenefactor(
  beyaId: string,
  sponsorPool: SponsorPool,
  koenkai: Koenkai | undefined,
  rng: SeededRNG
): Sponsor | null {
  if (koenkai) {
    const pillars = koenkai.members
      .filter((m) => m.role === "koenkai_pillar")
      .map((m) => sponsorPool.sponsors.get(m.sponsorId))
      .filter((s): s is Sponsor => s !== undefined)
      .sort((a, b) => b.riskAppetite - a.riskAppetite || a.sponsorId.localeCompare(b.sponsorId));

    if (pillars.length > 0 && pillars[0].riskAppetite >= 50) return pillars[0];
  }
  return null;
}

/**
 * Update Rikishi popularity and sponsor triggers based on achievements.
 */
export function applyAchievementImpact(world: any, rikishi: Rikishi, awardType: 'kinboshi' | 'ginboshi' | 'sansho'): void {
  if (!rikishi.economics) return;
  
  let popBoost = 0;
  if (awardType === 'kinboshi') popBoost = 20;
  else if (awardType === 'ginboshi') popBoost = 8;
  else if (awardType === 'sansho') popBoost = 12;
  
  rikishi.economics.popularity = Math.min(100, (rikishi.economics.popularity || 0) + popBoost);
  
  if (rikishi.economics.popularity >= 80) {
    // Potential trigger for T3+ national level sponsorship
  }
}

/**
 * Process Sponsor Churn (Addendum D).
 * Runs post-basho to evaluate satisfaction and relationship longevity.
 */
export function processSponsorChurn(world: any, currentTick: number): void {
  const rng = rngForWorld(world, "churn");
  
  // Logic to iterate over active relationships and roll for churn
  // based on loyalty and target performance.
  // This will be expanded in the next iteration.
}
