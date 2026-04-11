import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { Oyakata } from "./types/oyakata";
import type { SponsorPool, Sponsor, SponsorRelationship, SponsorRole } from "./types/sponsors";
import { rngForWorld } from "./rng";
import { EventBus } from "./events";

interface SponsorStrategy {
  evaluateSponsorRecruitment: (world: WorldState, heya: Heya, oyakata: Oyakata) => void;
}

export const DefaultSponsorStrategy: SponsorStrategy = {
  evaluateSponsorRecruitment(world: WorldState, heya: Heya, oyakata: Oyakata) {
    const pool = world.sponsorPool;
    if (!pool || !pool.sponsors) return;

    const rng = rngForWorld(world, "sponsorStrategy", heya.id);
    const koenkai = pool.koenkais.get(`koenkai_${heya.id}`);

    // Personality-driven decision making
    const isAmbitious = oyakata.traits.ambition > 60;
    const isPublicityHawk = oyakata.managerFlags?.publicityHawk;
    const isNepotist = oyakata.managerFlags?.nepotist;
    const isRiskTaker = oyakata.traits.risk > 50;

    // Only recruit if financial runway is healthy
    const avgFacility = (heya.facilities.training + heya.facilities.recovery + heya.facilities.nutrition) / 3;
    const monthlyBurn = (heya.rikishiIds ?? []).length * 150_000 + avgFacility * 9_000;
    const runwayMonths = monthlyBurn > 0 ? heya.funds / monthlyBurn : 0;

    if (runwayMonths < 6) return; // Too tight to recruit

    // Ambitious and publicity-focused oyakata recruit more aggressively
    const recruitmentThreshold = (isAmbitious && isPublicityHawk) ? 3 : (isAmbitious ? 2 : 1);

    // Count current sponsor relationships
    const currentSponsorCount = Array.from(pool.sponsors.values())
      .filter(s => s.active && s.relationships?.some(r => r.targetId === heya.id))
      .length;

    if (currentSponsorCount >= recruitmentThreshold) return;

    // Find eligible sponsors not already in a relationship with this heya
    const eligibleSponsors = Array.from(pool.sponsors.values())
      .filter(s => 
        s.active && 
        !s.relationships?.some(r => r.targetId === heya.id) &&
        s.tier !== "T0" // Exclude lowest tier
      )
      .sort((a, b) => {
        // Sort by prestige affinity (higher is better)
        return b.prestigeAffinity - a.prestigeAffinity;
      });

    if (eligibleSponsors.length === 0) return;

    // Risk-takers may go for higher-tier sponsors
    const maxTier = isRiskTaker ? "T5" : "T3";
    const tierOrder = ["T5", "T4", "T3", "T2", "T1"];
    const maxTierIndex = tierOrder.indexOf(maxTier);

    const suitableSponsors = eligibleSponsors.filter(s => {
      const tierIndex = tierOrder.indexOf(s.tier);
      return tierIndex <= maxTierIndex;
    });

    if (suitableSponsors.length === 0) return;

    // Pick top candidate
    const selectedSponsor = suitableSponsors[0];

    // Create sponsor relationship
    const relId = rng.uuid('SR');
    const relationship: SponsorRelationship = {
      relId,
      sponsorId: selectedSponsor.sponsorId,
      targetType: "beya",
      targetId: heya.id,
      role: "benefactor" as SponsorRole,
      strength: 3,
      startedAtTick: world.week
    };

    if (!selectedSponsor.relationships) {
      selectedSponsor.relationships = [];
    }
    selectedSponsor.relationships.push(relationship);

    // Log the recruitment decision
    const reason = isPublicityHawk
      ? "Publicity-focused oyakata recruited sponsor for media exposure"
      : isAmbitious
      ? "Ambitious oyakata recruited sponsor to expand network"
      : isNepotist
      ? "Nepotist oyakata recruited sponsor for network connections"
      : "Standard sponsor recruitment";

    // Emit event for tracking
    EventBus.managementDecision(world, heya.id, {
      archetype: oyakata.archetype,
      sponsor: selectedSponsor.displayName,
      tier: selectedSponsor.tier,
      reasoning: reason
    }, "minor");
  }
};

export function getSponsorStrategy(archetype: string): SponsorStrategy {
  return DefaultSponsorStrategy;
}
