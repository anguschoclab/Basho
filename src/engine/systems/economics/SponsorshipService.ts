import { SeededRNG } from "../../rng";
import type { Rikishi } from "../../types/rikishi";
import type {
  Sponsor,
  SponsorPool,
  Koenkai,
  KoenkaiBandType,
  SponsorRelationship,
} from "../../types/sponsors";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";

export const KOENKAI_MONTHLY_INCOME: Record<KoenkaiBandType, number> = {
  none: 0,
  weak: 500_000,
  moderate: 1_500_000,
  strong: 3_500_000,
  powerful: 7_000_000,
};

export const SPONSOR_TIER_INCOME: Record<import("../../types/sponsors").SponsorTier, number> = {
  T0: 100_000,
  T1: 300_000,
  T2: 750_000,
  T3: 1_500_000,
  T4: 3_000_000,
  T5: 8_000_000,
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
  const koenkaiId = rng.uuid("KN");
  const memberCount = 3 + Math.floor(rng.next() * 5);

  const eligibleSponsors = Array.from(sponsorPool.sponsors.values())
    .filter((s) => s.active && (s.tier === "T1" || s.tier === "T2" || s.tier === "T3"))
    .sort(
      (a, b) => b.prestigeAffinity - a.prestigeAffinity || a.sponsorId.localeCompare(b.sponsorId)
    );

  const picked = eligibleSponsors.slice(0, Math.min(memberCount, eligibleSponsors.length));
  const members: SponsorRelationship[] = picked.map((sponsor, idx) => {
    const isPillar = idx === 0 && sponsor.tier !== "T1";
    return {
      relId: rng.uuid("SR"),
      sponsorId: sponsor.sponsorId,
      targetType: "beya",
      targetId: beyaId,
      role: isPillar ? "koenkai_pillar" : "koenkai_member",
      strength: isPillar ? 4 : 2,
      startedAtTick: currentTick,
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
    lastChangedTick: currentTick,
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

  _rng: SeededRNG
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

import type { WorldState } from "../../types/world";
import { Id } from "../../types/common";

/**
 * Recruit a new sponsor for a heya.
 * Returns StateImpact describing the recruitment instead of mutating directly.
 */
export function recruitSponsor(
  world: WorldState,
  heyaId: Id,
  sponsorId: Id,
  rng: SeededRNG
): StateImpact {
  const builder = createImpactBuilder("recruitSponsor");
  const pool = world.sponsorPool;
  if (!pool) return builder.build();

  const heya = world.heyas.get(heyaId);
  if (!heya) return builder.build();

  const sponsor = pool.sponsors.get(sponsorId);
  if (!sponsor || !sponsor.active) return builder.build();

  // Check if heya already has this sponsor
  const existingRel = pool.koenkais.get(heyaId)?.members.find((m) => m.sponsorId === sponsorId);
  if (existingRel) return builder.build();

  // Calculate recruitment cost based on sponsor tier
  const recruitmentCosts: Record<import("../../types/sponsors").SponsorTier, number> = {
    T0: 50_000,
    T1: 150_000,
    T2: 400_000,
    T3: 800_000,
    T4: 1_500_000,
    T5: 4_000_000,
  };

  const cost = recruitmentCosts[sponsor.tier] || 0;

  // Check if heya has sufficient funds
  if (heya.funds < cost) return builder.build();

  // Deduct recruitment cost
  builder.updateHeya(heyaId, { funds: heya.funds - cost });

  // Create sponsor relationship
  const koenkai = pool.koenkais.get(heyaId);
  if (!koenkai) return builder.build();

  const newRel: SponsorRelationship = {
    relId: rng.uuid("SR"),
    sponsorId,
    targetType: "beya",
    targetId: heyaId,
    role: "koenkai_member",
    strength: 2,
    startedAtTick: world.week || 0,
  };

  // Note: koenkai updates are not directly supported by ImpactBuilder yet
  // For now, we'll update them directly as koenkai is nested state
  const updatedKoenkai = {
    ...koenkai,
    members: [...koenkai.members, newRel],
    lastChangedTick: world.week || 0,
  };
  pool.koenkais.set(heyaId, updatedKoenkai);

  builder.logEvent(
    "RECRUIT_DISCOVERED",
    "narrative",
    {
      heyaId,
      sponsorId,
      sponsorName: sponsor.displayName,
      tier: sponsor.tier,
    },
    { heyaId, importance: "minor" }
  );

  return builder.build();
}

/**
 * Update Rikishi popularity and sponsor triggers based on achievements.
 */
export function applyAchievementImpact(
  world: WorldState,
  rikishi: Rikishi,
  awardType: "kinboshi" | "ginboshi" | "sansho"
): void {
  void world;
  if (!rikishi.economics) return;

  let popBoost = 0;
  if (awardType === "kinboshi") popBoost = 20;
  else if (awardType === "ginboshi") popBoost = 8;
  else if (awardType === "sansho") popBoost = 12;

  rikishi.economics.popularity = Math.min(100, (rikishi.economics.popularity || 0) + popBoost);

  if (rikishi.economics.popularity >= 80) {
    // Potential trigger for T3+ national level sponsorship
  }
}

/**
 * Compute star power for a heya based on its roster.
 */
export function computeStarPower(heya: import("../../types/heya").Heya, world: WorldState): number {
  let starPower = 0;
  for (const rId of heya.rikishiIds ?? []) {
    const r = world.rikishi.get(rId);
    if (!r) continue;
    if (r.rank === "yokozuna") starPower += 30;
    else if (r.rank === "ozeki") starPower += 20;
    else if (r.rank === "sekiwake" || r.rank === "komusubi") starPower += 10;
    else if (r.division === "makuuchi") starPower += 5;
  }
  return Math.min(100, starPower);
}

/**
 * Process Sponsor Churn (Addendum D).
 * Runs post-basho to evaluate satisfaction and relationship longevity.
 * Returns StateImpact describing sponsor churn changes instead of mutating state.
 * Note: sponsorPool mutations are still direct and will be migrated in Phase 4.
 */
export function processSponsorChurn(world: WorldState): StateImpact {
  const builder = createImpactBuilder("sponsorChurn");
  const pool = world.sponsorPool;
  if (!pool?.sponsors) {
    builder.addMetadata("churned", []);
    builder.addMetadata("retained", 0);
    return builder.build();
  }

  const churned: string[] = [];
  let retained = 0;

  for (const heya of world.heyas.values()) {
    const koenkaiId = heya.koenkaiId;
    if (!koenkaiId) continue;
    const koenkai = pool.koenkais?.get(koenkaiId);
    if (!koenkai) continue;

    // Compute heya satisfaction inputs (banded per fog-of-war)
    const prestigeScore = heya.reputation ?? 50;
    const starPower = computeStarPower(heya, world);
    const scandalSeverity = heya.scandalScore ?? 0;

    // Satisfaction = (Prestige × 0.5) + (StarPower × 0.3) - (ScandalSeverity × 20)
    const satisfaction = prestigeScore * 0.5 + starPower * 0.3 - scandalSeverity * 0.2;

    // Check each kōenkai member
    const survivingMembers: SponsorRelationship[] = koenkai.members.filter(
      (rel: SponsorRelationship) => {
        const sponsor = pool.sponsors.get(rel.sponsorId);
        if (!sponsor || !sponsor.active) return false;

        // Churn thresholds per Addendum D2
        const isLocal = sponsor.category === "local_business";
        const isCorporate =
          sponsor.category === "regional_corporation" || sponsor.category === "national_brand";
        const threshold = isLocal ? 20 : isCorporate ? 50 : 70;

        if (satisfaction < threshold) {
          // Still mutate sponsorPool directly - will migrate in Phase 4
          sponsor.active = false;
          churned.push(sponsor.displayName);

          // Queue event instead of calling EventBus directly
          builder.logEvent(
            "FINANCIAL_ALERT",
            "economy",
            {
              sponsorId: sponsor.sponsorId,
              satisfaction: Math.round(satisfaction),
            },
            { heyaId: heya.id, importance: "notable" }
          );
          return false;
        }
        retained++;
        return true;
      }
    );

    // Still mutate koenkai.members directly - will migrate in Phase 4
    koenkai.members = survivingMembers;

    // Update kōenkai band based on remaining members
    const memberCount = survivingMembers.length;
    const hasPillar = survivingMembers.some(
      (m: SponsorRelationship) => m.role === "koenkai_pillar"
    );
    let newKoenkaiBand: KoenkaiBandType = "none";
    if (memberCount === 0) newKoenkaiBand = "none";
    else if (memberCount <= 2 && !hasPillar) newKoenkaiBand = "weak";
    else if (memberCount <= 4) newKoenkaiBand = "moderate";
    else if (memberCount <= 6 || !hasPillar) newKoenkaiBand = "strong";
    else newKoenkaiBand = "powerful";

    // Queue heya update for koenkaiBand
    builder.updateHeya(heya.id, { koenkaiBand: newKoenkaiBand });
  }

  // Add churned/retained counts to metadata
  builder.addMetadata("churned", churned);
  builder.addMetadata("retained", retained);

  return builder.build();
}
