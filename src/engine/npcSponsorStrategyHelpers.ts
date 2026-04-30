/**
 * npcSponsorStrategyHelpers.ts
 *
 * Helper functions for NPC sponsor strategy.
 */

import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { Oyakata } from "./types/oyakata";
import type { SponsorRelationship, SponsorRole } from "./types/sponsors";
import { rngForWorld } from "./rng";
import { createImpactBuilder } from "./core/ImpactBuilder";
import type { StateImpact } from "./core/StateImpact";
import { isSponsorPlayerRelevant } from "./npc/npcEventSurfacing";

export function calculateRunwayMonths(heya: Heya): number {
  const avgFacility =
    (heya.facilities.training + heya.facilities.recovery + heya.facilities.nutrition) / 3;
  const monthlyBurn = (heya.rikishiIds ?? []).length * 150_000 + avgFacility * 9_000;
  return monthlyBurn > 0 ? heya.funds / monthlyBurn : 0;
}

export function countSponsors(world: WorldState, heyaId: string): number {
  const pool = world.sponsorPool;
  if (!pool || !pool.sponsors) return 0;
  return Array.from(pool.sponsors.values()).filter(
    (s) => s.active && s.relationships?.some((r) => r.targetId === heyaId)
  ).length;
}

export interface SponsorFilterOptions {
  excludeTiers?: string[];
  includeTiers?: string[];
}

export function filterEligibleSponsors(
  world: WorldState,
  heyaId: string,
  options: SponsorFilterOptions = {}
) {
  const pool = world.sponsorPool;
  if (!pool || !pool.sponsors) return [];

  const { excludeTiers = [], includeTiers = [] } = options;

  return Array.from(pool.sponsors.values())
    .filter((s) => {
      if (!s.active) return false;
      if (s.relationships?.some((r) => r.targetId === heyaId)) return false;
      if (excludeTiers.includes(s.tier)) return false;
      if (includeTiers.length > 0 && !includeTiers.includes(s.tier)) return false;
      return true;
    })
    .sort((a, b) => b.prestigeAffinity - a.prestigeAffinity);
}

export function createSponsorRelationship(
  world: WorldState,
  sponsorId: string,
  heyaId: string,
  strength: 1 | 2 | 3 | 4 | 5,
  role: SponsorRole = "benefactor"
): SponsorRelationship {
  const rng = rngForWorld(world, "sponsorStrategy", heyaId);
  const relId = rng.uuid("SR");
  return {
    relId,
    sponsorId,
    targetType: "heya",
    targetId: heyaId,
    role,
    strength,
    startedAtTick: world.week,
  };
}

export function addSponsorRelationship(
  world: WorldState,
  sponsorId: string,
  relationship: SponsorRelationship
): StateImpact {
  const builder = createImpactBuilder("addSponsorRelationship");
  const pool = world.sponsorPool;
  if (!pool || !pool.sponsors) return builder.build();
  const sponsor = pool.sponsors.get(sponsorId);
  if (!sponsor) return builder.build();
  
  // Create a deep copy of the sponsor pool and sponsor
  const updatedSponsor = {
    ...sponsor,
    relationships: [...(sponsor.relationships || []), relationship]
  };
  
  const updatedSponsors = new Map(pool.sponsors);
  updatedSponsors.set(sponsorId, updatedSponsor);

  builder.updateWorldField("sponsorPool", {
    ...pool,
    sponsors: updatedSponsors,
  });

  return builder.build();
}

export function emitSponsorRecruitmentEvent(
  heyaId: string,
  oyakataArchetype: string,
  sponsorDisplayName: string,
  sponsorTier: string,
  reasoning: string
): StateImpact {
  const builder = createImpactBuilder("emitSponsorRecruitmentEvent");
  const importance = isSponsorPlayerRelevant(sponsorTier);

  builder.logEvent(
    "NPC_MANAGER_DECISION",
    "narrative",
    {
      archetype: oyakataArchetype,
      action: "sponsor_recruited",
      sponsor: sponsorDisplayName,
      tier: sponsorTier,
      reasoning,
    },
    { heyaId, importance }
  );
  return builder.build();
}

export interface SponsorRecruitmentConfig {
  runwayThreshold: number;
  recruitmentThreshold: number;
  relationshipStrength: 1 | 2 | 3 | 4 | 5;
  filterOptions?: SponsorFilterOptions;
  getReasoning?: (oyakata: Oyakata) => string;
}

export function evaluateSponsorRecruitmentCommon(
  world: WorldState,
  heya: Heya,
  oyakata: Oyakata,
  config: SponsorRecruitmentConfig
): StateImpact {
  const builder = createImpactBuilder("evaluateSponsorRecruitmentCommon");
  const pool = world.sponsorPool;
  if (!pool || !pool.sponsors) return builder.build();

  const runwayMonths = calculateRunwayMonths(heya);
  if (runwayMonths < config.runwayThreshold) return builder.build();

  const currentSponsorCount = countSponsors(world, heya.id);
  if (currentSponsorCount >= config.recruitmentThreshold) return builder.build();

  const eligibleSponsors = filterEligibleSponsors(world, heya.id, config.filterOptions);
  if (eligibleSponsors.length === 0) return builder.build();

  const selectedSponsor = eligibleSponsors[0];
  const relationship = createSponsorRelationship(
    world,
    selectedSponsor.sponsorId,
    heya.id,
    config.relationshipStrength
  );
  
  builder.merge(addSponsorRelationship(world, selectedSponsor.sponsorId, relationship));

  const reasoning = config.getReasoning
    ? config.getReasoning(oyakata)
    : "Standard sponsor recruitment";

  builder.merge(emitSponsorRecruitmentEvent(
    heya.id,
    oyakata.archetype,
    selectedSponsor.displayName,
    selectedSponsor.tier,
    reasoning
  ));

  return builder.build();
}
