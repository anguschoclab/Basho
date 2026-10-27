import { SeededRNG } from "@/engine/rng";
import type { Rikishi } from "@/engine/types/rikishi";
import type { Sponsor, KoenkaiBandType, SponsorRelationship } from "@/engine/types/sponsors";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { StateImpact } from "@/engine/core/StateImpact";
import type { WorldState } from "@/engine/types/world";
import { Id } from "@/engine/types/common";
import { getHeya } from "@/engine/queries";
import {
  computeHeyaPrestigeScore,
  computeStarPower,
  recalculateKoenkaiBand,
  targetKoenkaiBandFromPrestige,
} from "@/engine/systems/economy/sponsorshipQueries";
import { KOENKAI_MEMBER_STRENGTH } from "@/constants/engine/economyExtended";
import { SPONSOR_RECRUITMENT_COSTS } from "@/constants/engine/economic";
import { STAR_POWER_SATISFACTION_WEIGHT } from "@/constants/engine/sponsors";

const BAND_ORDER: KoenkaiBandType[] = ["none", "weak", "moderate", "strong", "powerful"];

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

  // The koenkai map is keyed by koenkaiId (WorldFactory links it via heya.koenkaiId).
  const koenkai = heya.koenkaiId != null ? pool.koenkais.get(heya.koenkaiId) : undefined;
  if (!koenkai) return builder.build();

  // Check if heya already has this sponsor
  const existingRel = koenkai.members.find((m) => m.sponsorId === sponsorId);
  if (existingRel) return builder.build();

  const cost = SPONSOR_RECRUITMENT_COSTS[sponsor.tier] || 0;

  // Check if heya has sufficient funds
  if (heya.funds < cost) return builder.build();

  // Deduct recruitment cost
  builder.updateHeya(heyaId, { funds: heya.funds - cost });

  // Create sponsor relationship
  const newRel: SponsorRelationship = {
    relId: rng.uuid("SR"),
    sponsorId,
    targetType: "heya",
    targetId: heyaId,
    role: "koenkai_member",
    strength: 2,
    startedAtTick: world.week || 0,
  };

  builder.updateKoenkai(koenkai.koenkaiId, {
    members: [...koenkai.members, newRel],
    lastChangedTick: world.week || 0,
  });

  // Mirror onto sponsor.relationships so sponsor-side queries
  // (countSponsors / filterEligibleSponsors / projections) see the member.
  builder.updateSponsor(sponsorId, {
    relationships: [...(sponsor.relationships ?? []), newRel],
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
    const satisfaction = prestigeScore + starPower * STAR_POWER_SATISFACTION_WEIGHT;

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
        const sponsor = world.sponsorPool?.sponsors.get(sponsorId);
        builder.updateSponsor(sponsorId, {
          active: false,
          relationships: (sponsor?.relationships ?? []).filter(
            (r) => !(r.targetType === "heya" && r.targetId === heya.id)
          ),
        });
      }

      builder.updateHeya(heya.id, { koenkaiBand: newBand });
    }
  }

  builder.addMetadata("churned", allChurned);
  builder.addMetadata("retained", totalRetained);

  return builder.build();
}

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
    const trimmedSponsorIds = new Set<string>();

    if (currentIdx > targetIdx) {
      // Band downgrade — trim weakest members proportional to gap
      const gap = currentIdx - targetIdx;
      const removeCount = Math.min(updatedMembers.length, gap);
      if (removeCount > 0) {
        const sorted = [...updatedMembers].sort(
          (a, b) => (a.strength ?? 1) - (b.strength ?? 1)
        );
        const removed = sorted.slice(0, removeCount);
        for (const m of removed) trimmedSponsorIds.add(m.sponsorId);
        updatedMembers = sorted.slice(removeCount);
      }
    } else {
      // Band upgrade — recruit eligible inactive sponsors (max 2 per basho)
      const gap = targetIdx - currentIdx;
      const addCount = Math.min(gap, 2);

      // Early-exit loop with O(1) Set-based sponsor ID lookup to avoid O(N) allocations per iteration
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
        const newRel: SponsorRelationship = {
          relId: `sr_${sponsor.sponsorId}_${world.dayIndexGlobal ?? 0}`,
          sponsorId: sponsor.sponsorId,
          targetType: "heya",
          targetId: heya.id,
          role: "koenkai_member",
          strength: KOENKAI_MEMBER_STRENGTH as 1 | 2 | 3 | 4 | 5,
          startedAtTick: world.dayIndexGlobal ?? 0,
        };
        updatedMembers = [...updatedMembers, newRel];
        builder.updateSponsor(sponsor.sponsorId, {
          active: true,
          relationships: [...(sponsor.relationships ?? []), newRel],
        });
      }
    }

    for (const sponsorId of trimmedSponsorIds) {
      const sponsor = world.sponsorPool?.sponsors.get(sponsorId);
      builder.updateSponsor(sponsorId, {
        relationships: (sponsor?.relationships ?? []).filter(
          (r) => !(r.targetType === "heya" && r.targetId === heya.id)
        ),
      });
    }

    builder.updateKoenkai(koenkaiId, {
      members: updatedMembers,
      strengthBand: targetBand,
    });
    builder.updateHeya(heya.id, { koenkaiBand: targetBand });
  }

  return builder.build();
}
