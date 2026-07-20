import { SeededRNG } from "../../rng";
import type { Rikishi } from "../../types/rikishi";
import type { Heya } from "../../types/heya";
import type {
  Sponsor,
  SponsorPool,
  Koenkai,
  KoenkaiBandType,
  SponsorRelationship,
} from "../../types/sponsors";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import {
  KOENKAI_INCOME_NONE,
  KOENKAI_INCOME_WEAK,
  KOENKAI_INCOME_MODERATE,
  KOENKAI_INCOME_STRONG,
  KOENKAI_INCOME_POWERFUL,
  SPONSOR_TIER_INCOME_T0,
  SPONSOR_TIER_INCOME_T1,
  SPONSOR_TIER_INCOME_T2,
  SPONSOR_TIER_INCOME_T3,
  SPONSOR_TIER_INCOME_T4,
  SPONSOR_TIER_INCOME_T5,
  KOENKAI_MEMBER_COUNT_BASE,
  KOENKAI_MEMBER_COUNT_MAX,
  KOENKAI_PILLAR_STRENGTH,
  KOENKAI_MEMBER_STRENGTH,
} from "../../../constants/engine/economyExtended";

export const KOENKAI_MONTHLY_INCOME: Record<KoenkaiBandType, number> = {
  none: KOENKAI_INCOME_NONE,
  weak: KOENKAI_INCOME_WEAK,
  moderate: KOENKAI_INCOME_MODERATE,
  strong: KOENKAI_INCOME_STRONG,
  powerful: KOENKAI_INCOME_POWERFUL,
};

export const SPONSOR_TIER_INCOME: Record<import("../../types/sponsors").SponsorTier, number> = {
  T0: SPONSOR_TIER_INCOME_T0,
  T1: SPONSOR_TIER_INCOME_T1,
  T2: SPONSOR_TIER_INCOME_T2,
  T3: SPONSOR_TIER_INCOME_T3,
  T4: SPONSOR_TIER_INCOME_T4,
  T5: SPONSOR_TIER_INCOME_T5,
};

/** Prestige score weights per rank. */
const PRESTIGE_WEIGHTS: Record<string, number> = {
  yokozuna: 40,
  ozeki: 30,
  sekiwake: 20,
  komusubi: 15,
  maegashira: 8,
  juryo: 4,
};

/** Prestige score cap. */
const PRESTIGE_CAP = 100;

/**
 * Compute a heya's prestige score based on its roster's ranks.
 * Capped at 100. Non-sekitori contribute 0.
 */
export function computeHeyaPrestigeScore(heya: Heya, world: WorldState): number {
  let score = 0;
  for (const rId of heya.rikishiIds ?? []) {
    const r = getRikishi(world, rId);
    if (!r) continue;
    score += PRESTIGE_WEIGHTS[r.rank] || 0;
  }
  return Math.min(score, PRESTIGE_CAP);
}

/**
 * Map a prestige score to a kōenkai band.
 */
export function targetKoenkaiBandFromPrestige(prestige: number): KoenkaiBandType {
  if (prestige >= 80) return "powerful";
  if (prestige >= 55) return "strong";
  if (prestige >= 30) return "moderate";
  if (prestige >= 10) return "weak";
  return "none";
}

/**
 * Recalculate kōenkai band based on heya prestige score (roster ranks).
 * Called after sponsor recruitment or churn to update band tier.
 */
export function recalculateKoenkaiBand(heya: Heya, world: WorldState): KoenkaiBandType {
  const prestige = computeHeyaPrestigeScore(heya, world);
  return targetKoenkaiBandFromPrestige(prestige);
}

/**
 * Manage Koenkai (Supporter Association) creation and strength.
 */
export function createKoenkai(
  heyaId: string,
  sponsorPool: SponsorPool,
  prestigeBand: string,
  rng: SeededRNG,
  currentTick: number
): Koenkai {
  const koenkaiId = rng.uuid("KN");
  const memberCount = KOENKAI_MEMBER_COUNT_BASE + Math.floor(rng.next() * KOENKAI_MEMBER_COUNT_MAX);

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
      targetType: "heya",
      targetId: heyaId,
      role: isPillar ? "koenkai_pillar" : "koenkai_member",
      strength: isPillar ? KOENKAI_PILLAR_STRENGTH : KOENKAI_MEMBER_STRENGTH,
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
    heyaId,
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
  _heyaId: string,
  sponsorPool: SponsorPool,
  koenkai: Koenkai | undefined
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
import { getHeya, getRikishi } from "../../queries";

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

  const heya = getHeya(world, heyaId);
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
    targetType: "heya",
    targetId: heyaId,
    role: "koenkai_member",
    strength: 2,
    startedAtTick: world.week || 0,
  };

  builder.updateKoenkai(heyaId, {
    members: [...koenkai.members, newRel],
    lastChangedTick: world.week || 0,
  });

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
  _world: WorldState,
  rikishi: Rikishi,
  awardType: "kinboshi" | "ginboshi" | "sansho"
): StateImpact {
  const builder = createImpactBuilder("applyAchievementImpact");
  if (!rikishi.economics) return builder.build();

  let popBoost = 0;
  if (awardType === "kinboshi") popBoost = 20;
  else if (awardType === "ginboshi") popBoost = 8;
  else if (awardType === "sansho") popBoost = 12;

  const newPopularity = Math.min(100, (rikishi.economics.popularity || 0) + popBoost);

  builder.updateRikishi(rikishi.id, {
    economics: {
      ...rikishi.economics,
      popularity: newPopularity,
    },
  });

  return builder.build();
}

/**
 * Compute star power for a heya based on its roster.
 */
export function computeStarPower(heya: import("../../types/heya").Heya, world: WorldState): number {
  let starPower = 0;
  for (const rId of heya.rikishiIds ?? []) {
    const r = getRikishi(world, rId);
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
export function processSponsorChurn(world: WorldState, _rng?: SeededRNG): StateImpact {
  const builder = createImpactBuilder("processSponsorChurn");
  const allChurned: string[] = [];
  let totalRetained = 0;

  for (const [koenkaiId, koenkai] of world.sponsorPool?.koenkais || []) {
    const membersToRemove: string[] = [];

    const heya = getHeya(world, koenkai.heyaId);
    if (!heya) continue;

    const prestigeScore = computeHeyaPrestigeScore(heya, world);
    const starPower = computeStarPower(heya, world);
    const satisfaction = prestigeScore + starPower * 0.3;

    for (const member of koenkai.members) {
      const sponsor = world.sponsorPool?.sponsors.get(member.sponsorId);
      if (!sponsor) continue;

      // Satisfaction-based churn: sponsors leave if satisfaction is below their threshold
      const threshold =
        sponsor.category === "local_business"
          ? 20
          : sponsor.category === "national_brand"
            ? 50
            : sponsor.category === "anonymous_patron"
              ? 100
              : 30;

      const shouldChurn = satisfaction < threshold;

      if (shouldChurn) {
        membersToRemove.push(member.sponsorId);
        allChurned.push(sponsor.displayName || sponsor.sponsorId);
      } else {
        totalRetained++;
      }
    }

    if (membersToRemove.length > 0) {
      const updatedMembers = koenkai.members.filter((m) => !membersToRemove.includes(m.sponsorId));

      const newBand = recalculateKoenkaiBand(heya, world);

      builder.updateKoenkai(koenkaiId, {
        members: updatedMembers,
        strengthBand: newBand,
      });

      for (const sponsorId of membersToRemove) {
        builder.updateSponsor(sponsorId, { active: false });
      }

      builder.updateHeya(heya.id, { koenkaiBand: newBand });
    }
  }

  builder.addMetadata("churned", allChurned);
  builder.addMetadata("retained", totalRetained);

  return builder.build();
}

const BAND_ORDER: KoenkaiBandType[] = ["none", "weak", "moderate", "strong", "powerful"];

/**
 * Post-basho koenkai band adjustment based on roster prestige.
 *
 * For each koenkai, computes the target band from heya prestige and corrects
 * the current strengthBand if it has drifted. When the band is downgraded,
 * the weakest members are trimmed. When upgraded, eligible inactive sponsors
 * are recruited (up to 2 per basho) if the pool has candidates.
 */
export function adjustKoenkaiBandToPrestige(world: WorldState): StateImpact {
  const builder = createImpactBuilder("adjustKoenkaiBandToPrestige");

  for (const [koenkaiId, koenkai] of world.sponsorPool?.koenkais || []) {
    const heya = getHeya(world, koenkai.heyaId);
    if (!heya) continue;

    const prestige = computeHeyaPrestigeScore(heya, world);
    const targetBand = targetKoenkaiBandFromPrestige(prestige);
    const currentBand = koenkai.strengthBand;
    const currentIdx = BAND_ORDER.indexOf(currentBand);
    const targetIdx = BAND_ORDER.indexOf(targetBand);

    if (currentIdx === targetIdx) continue;

    let updatedMembers = koenkai.members;

    if (currentIdx > targetIdx) {
      // Band downgrade — trim weakest members proportional to gap
      const gap = currentIdx - targetIdx;
      const removeCount = Math.min(updatedMembers.length, gap);
      if (removeCount > 0) {
        updatedMembers = [...updatedMembers]
          .sort((a, b) => (a.strength ?? 1) - (b.strength ?? 1))
          .slice(removeCount);
      }
    } else {
      // Band upgrade — recruit eligible inactive sponsors (max 2 per basho)
      const gap = targetIdx - currentIdx;
      const addCount = Math.min(gap, 2);

      // ⚡ Bolt Optimization: Use early-exit loop instead of Array.from().filter().slice() to avoid O(N) allocations
      // ⚡ Review Fix: Use Set for O(1) sponsor ID lookup instead of updatedMembers.some() per iteration
      const existingSponsorIds = new Set(updatedMembers.map((m) => m.sponsorId));
      const picked: Sponsor[] = [];
      for (const s of world.sponsorPool?.sponsors.values() ?? []) {
        if (picked.length >= addCount) break;
        if (
          !s.active &&
          (s.tier === "T1" || s.tier === "T2" || s.tier === "T3") &&
          !existingSponsorIds.has(s.sponsorId)
        ) {
          picked.push(s);
        }
      }

      for (const sponsor of picked) {
        updatedMembers = [
          ...updatedMembers,
          {
            relId: `sr_${sponsor.sponsorId}_${world.dayIndexGlobal ?? 0}`,
            sponsorId: sponsor.sponsorId,
            targetType: "heya",
            targetId: heya.id,
            role: "koenkai_member",
            strength: KOENKAI_MEMBER_STRENGTH,
            startedAtTick: world.dayIndexGlobal ?? 0,
          },
        ];
        builder.updateSponsor(sponsor.sponsorId, { active: true });
      }
    }

    builder.updateKoenkai(koenkaiId, {
      members: updatedMembers,
      strengthBand: targetBand,
    });
    builder.updateHeya(heya.id, { koenkaiBand: targetBand });
  }

  return builder.build();
}
