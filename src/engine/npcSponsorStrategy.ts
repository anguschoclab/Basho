import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { Oyakata } from "./types/oyakata";
import type { OyakataArchetype } from "./types/oyakata";
import type { SponsorRelationship, SponsorRole } from "./types/sponsors";
import { rngForWorld } from "./rng";
import { EventBus } from "./events";

interface SponsorStrategy {
  evaluateSponsorRecruitment: (world: WorldState, heya: Heya, oyakata: Oyakata) => void;
}

function getRunwayMonths(heya: Heya): number {
  const avgFacility =
    (heya.facilities.training + heya.facilities.recovery + heya.facilities.nutrition) / 3;
  const monthlyBurn = (heya.rikishiIds ?? []).length * 150_000 + avgFacility * 9_000;
  return monthlyBurn > 0 ? heya.funds / monthlyBurn : 0;
}

function getCurrentSponsorCount(pool: any, heya: Heya): number {
  return Array.from(pool.sponsors.values()).filter(
    (s: any) => s.active && s.relationships?.some((r: any) => r.targetId === heya.id)
  ).length;
}

function getEligibleSponsors(pool: any, heya: Heya, filterFn?: (s: Sponsor) => boolean): Sponsor[] {
  return Array.from(pool.sponsors.values())
    .filter(
      (s: any) =>
        s.active &&
        !s.relationships?.some((r: any) => r.targetId === heya.id) &&
        (filterFn ? filterFn(s) : s.tier !== "T0")
    )
    .sort((a: any, b: any) => b.prestigeAffinity - a.prestigeAffinity);
}

function executeSponsorRecruitment(
  world: WorldState,
  heya: Heya,
  oyakata: Oyakata,
  rng: RNG,
  selectedSponsor: Sponsor,
  strength: number,
  reasoning: string
) {
  const relId = rng.uuid("SR");
  const relationship: SponsorRelationship = {
    relId,
    sponsorId: selectedSponsor.sponsorId,
    targetType: "beya",
    targetId: heya.id,
    role: "benefactor" as SponsorRole,
    strength,
    startedAtTick: world.week,
  };

  if (!selectedSponsor.relationships) {
    selectedSponsor.relationships = [];
  }
  selectedSponsor.relationships.push(relationship);

  EventBus.managementDecision(
    world,
    heya.id,
    {
      archetype: oyakata.archetype,
      sponsor: selectedSponsor.displayName,
      tier: selectedSponsor.tier,
      reasoning,
    },
    "minor"
  );
}

export const DefaultSponsorStrategy: SponsorStrategy = {
  evaluateSponsorRecruitment(world: WorldState, heya: Heya, oyakata: Oyakata) {
    const pool = world.sponsorPool;
    if (!pool || !pool.sponsors) return;

    const rng = rngForWorld(world, "sponsorStrategy", heya.id);

    // Personality-driven decision making
    const isAmbitious = oyakata.traits.ambition > 60;
    const isPublicityHawk = oyakata.managerFlags?.publicityHawk;
    const isNepotist = oyakata.managerFlags?.nepotist;
    const isRiskTaker = oyakata.traits.risk > 50;

    // Only recruit if financial runway is healthy
    const runwayMonths = getRunwayMonths(heya);

    if (runwayMonths < 6) return; // Too tight to recruit

    // Ambitious and publicity-focused oyakata recruit more aggressively
    // High patience leads to more selective recruitment (lower threshold)
    let recruitmentThreshold = isAmbitious && isPublicityHawk ? 3 : isAmbitious ? 2 : 1;
    if (oyakata.traits.patience > 70) {
      recruitmentThreshold = Math.max(1, recruitmentThreshold - 1); // More patient oyakata recruit fewer sponsors
    }

    // Mood affects sponsor recruitment aggressiveness
    if (oyakata.mood === "anxious") {
      recruitmentThreshold = Math.max(1, recruitmentThreshold - 1); // Anxious oyakata recruit fewer sponsors
    } else if (oyakata.mood === "obsessed") {
      recruitmentThreshold += 1; // Obsessed oyakata recruit more sponsors
    }

    // Count current sponsor relationships
    const currentSponsorCount = getCurrentSponsorCount(pool, heya);

    if (currentSponsorCount >= recruitmentThreshold) return;

    // Find eligible sponsors not already in a relationship with this heya
    const eligibleSponsors = getEligibleSponsors(pool, heya);

    if (eligibleSponsors.length === 0) return;

    // Risk-takers may go for higher-tier sponsors
    const maxTier = isRiskTaker ? "T5" : "T3";
    const tierOrder = ["T5", "T4", "T3", "T2", "T1"];
    const maxTierIndex = tierOrder.indexOf(maxTier);

    const suitableSponsors = eligibleSponsors.filter((s) => {
      const tierIndex = tierOrder.indexOf(s.tier);
      return tierIndex <= maxTierIndex;
    });

    if (suitableSponsors.length === 0) return;

    // Pick top candidate
    const selectedSponsor = suitableSponsors[0];

    // Create sponsor relationship
    const reason = isPublicityHawk
      ? "Publicity-focused oyakata recruited sponsor for media exposure"
      : isAmbitious
        ? "Ambitious oyakata recruited sponsor to expand network"
        : isNepotist
          ? "Nepotist oyakata recruited sponsor for network connections"
          : "Standard sponsor recruitment";

    executeSponsorRecruitment(world, heya, oyakata, rng, selectedSponsor, 3, reason);
  },
};

export const TraditionalistSponsorStrategy: SponsorStrategy = {
  evaluateSponsorRecruitment(world, heya, oyakata) {
    const pool = world.sponsorPool;
    if (!pool || !pool.sponsors) return;

    const rng = rngForWorld(world, "sponsorStrategy", heya.id);

    // Traditionalists prefer traditional, long-term sponsors
    const isPublicityHawk = oyakata.managerFlags?.publicityHawk;

    // Only recruit if financial runway is healthy
    const runwayMonths = getRunwayMonths(heya);

    if (runwayMonths < 9) return; // Traditionalists are more conservative

    const recruitmentThreshold = isPublicityHawk ? 2 : 1;

    const currentSponsorCount = getCurrentSponsorCount(pool, heya);

    if (currentSponsorCount >= recruitmentThreshold) return;

    // Prefer sponsors with established reputation
    const eligibleSponsors = getEligibleSponsors(
      pool,
      heya,
      (s) => s.tier !== "T0" && s.tier !== "T5"
    );

    if (eligibleSponsors.length === 0) return;

    const selectedSponsor = eligibleSponsors[0];

    executeSponsorRecruitment(
      world,
      heya,
      oyakata,
      rng,
      selectedSponsor,
      4,
      "Traditionalist recruited established sponsor for long-term partnership"
    );
  },
};

export const ScientistSponsorStrategy: SponsorStrategy = {
  evaluateSponsorRecruitment(world, heya, oyakata) {
    const pool = world.sponsorPool;
    if (!pool || !pool.sponsors) return;

    const rng = rngForWorld(world, "sponsorStrategy", heya.id);

    // Scientists target sponsors with research/training benefits
    const runwayMonths = getRunwayMonths(heya);

    if (runwayMonths < 6) return;

    const recruitmentThreshold = 2;

    const currentSponsorCount = getCurrentSponsorCount(pool, heya);

    if (currentSponsorCount >= recruitmentThreshold) return;

    const eligibleSponsors = getEligibleSponsors(pool, heya);

    if (eligibleSponsors.length === 0) return;

    const selectedSponsor = eligibleSponsors[0];

    executeSponsorRecruitment(
      world,
      heya,
      oyakata,
      rng,
      selectedSponsor,
      3,
      "Scientist recruited sponsor for research and training benefits"
    );
  },
};

export const GamblerSponsorStrategy: SponsorStrategy = {
  evaluateSponsorRecruitment(world, heya, oyakata) {
    const pool = world.sponsorPool;
    if (!pool || !pool.sponsors) return;

    const rng = rngForWorld(world, "sponsorStrategy", heya.id);

    // Gamblers take high-risk sponsor relationships
    const isRiskTaker = oyakata.traits.risk > 60;

    const runwayMonths = getRunwayMonths(heya);

    let runwayThreshold = 3;
    // Gambler's Instinct quirk makes gamblers even more willing to take risks
    if (oyakata.quirks?.includes("Gambler's Instinct")) {
      runwayThreshold = 2;
    }
    if (runwayMonths < runwayThreshold) return;

    const recruitmentThreshold = isRiskTaker ? 4 : 2;

    const currentSponsorCount = getCurrentSponsorCount(pool, heya);

    if (currentSponsorCount >= recruitmentThreshold) return;

    // Gamblers willing to take volatile sponsor deals
    const eligibleSponsors = getEligibleSponsors(pool, heya);

    if (eligibleSponsors.length === 0) return;

    const selectedSponsor = eligibleSponsors[0];

    executeSponsorRecruitment(
      world,
      heya,
      oyakata,
      rng,
      selectedSponsor,
      2,
      "Gambler recruited sponsor for high-risk, high-reward relationship"
    );
  },
};

export const NurturerSponsorStrategy: SponsorStrategy = {
  evaluateSponsorRecruitment(world, heya, oyakata) {
    const pool = world.sponsorPool;
    if (!pool || !pool.sponsors) return;

    const rng = rngForWorld(world, "sponsorStrategy", heya.id);

    // Nurturers seek sponsors with welfare benefits for rikishi
    const runwayMonths = getRunwayMonths(heya);

    if (runwayMonths < 8) return; // Nurturers prioritize welfare

    const recruitmentThreshold = 1;

    const currentSponsorCount = getCurrentSponsorCount(pool, heya);

    if (currentSponsorCount >= recruitmentThreshold) return;

    const eligibleSponsors = getEligibleSponsors(
      pool,
      heya,
      (s) => s.tier !== "T0" && s.tier !== "T5"
    );

    if (eligibleSponsors.length === 0) return;

    const selectedSponsor = eligibleSponsors[0];

    executeSponsorRecruitment(
      world,
      heya,
      oyakata,
      rng,
      selectedSponsor,
      5,
      "Nurturer recruited sponsor for rikishi welfare benefits"
    );
  },
};

export const TyrantSponsorStrategy: SponsorStrategy = {
  evaluateSponsorRecruitment(world, heya, oyakata) {
    const pool = world.sponsorPool;
    if (!pool || !pool.sponsors) return;

    const rng = rngForWorld(world, "sponsorStrategy", heya.id);

    // Tyrants demand high-tier sponsors, prestige-focused
    const runwayMonths = getRunwayMonths(heya);

    if (runwayMonths < 12) return; // Tyrants want significant reserves

    const recruitmentThreshold = 3;

    const currentSponsorCount = getCurrentSponsorCount(pool, heya);

    if (currentSponsorCount >= recruitmentThreshold) return;

    // Only high-tier sponsors
    const eligibleSponsors = getEligibleSponsors(
      pool,
      heya,
      (s) => s.tier === "T5" || s.tier === "T4"
    );

    if (eligibleSponsors.length === 0) return;

    const selectedSponsor = eligibleSponsors[0];

    executeSponsorRecruitment(
      world,
      heya,
      oyakata,
      rng,
      selectedSponsor,
      3,
      "Tyrant recruited high-tier sponsor for prestige"
    );
  },
};

export const StrategistSponsorStrategy: SponsorStrategy = {
  evaluateSponsorRecruitment(world, heya, oyakata) {
    const pool = world.sponsorPool;
    if (!pool || !pool.sponsors) return;

    const rng = rngForWorld(world, "sponsorStrategy", heya.id);

    // Strategists maintain diversified sponsor portfolio
    const runwayMonths = getRunwayMonths(heya);

    if (runwayMonths < 6) return;

    const recruitmentThreshold = 3;

    const currentSponsorCount = getCurrentSponsorCount(pool, heya);

    if (currentSponsorCount >= recruitmentThreshold) return;

    const eligibleSponsors = getEligibleSponsors(pool, heya);

    if (eligibleSponsors.length === 0) return;

    const selectedSponsor = eligibleSponsors[0];

    executeSponsorRecruitment(
      world,
      heya,
      oyakata,
      rng,
      selectedSponsor,
      3,
      "Strategist recruited sponsor for diversified portfolio"
    );
  },
};

export const StrictSponsorStrategy: SponsorStrategy = {
  evaluateSponsorRecruitment(world, heya, oyakata) {
    const pool = world.sponsorPool;
    if (!pool || !pool.sponsors) return;

    const rng = rngForWorld(world, "sponsorStrategy", heya.id);

    // Strict only partner with reputable sponsors
    const runwayMonths = getRunwayMonths(heya);

    if (runwayMonths < 8) return;

    const recruitmentThreshold = 2;

    const currentSponsorCount = getCurrentSponsorCount(pool, heya);

    if (currentSponsorCount >= recruitmentThreshold) return;

    // Only reputable sponsors
    const eligibleSponsors = getEligibleSponsors(
      pool,
      heya,
      (s) => s.tier !== "T0" && s.tier !== "T5"
    );

    if (eligibleSponsors.length === 0) return;

    const selectedSponsor = eligibleSponsors[0];

    executeSponsorRecruitment(
      world,
      heya,
      oyakata,
      rng,
      selectedSponsor,
      4,
      "Strict recruited reputable sponsor to avoid controversy"
    );
  },
};

export const IndulgentSponsorStrategy: SponsorStrategy = {
  evaluateSponsorRecruitment(world, heya, oyakata) {
    const pool = world.sponsorPool;
    if (!pool || !pool.sponsors) return;

    const rng = rngForWorld(world, "sponsorStrategy", heya.id);

    // Indulgent maintain friendly sponsor relationships
    const runwayMonths = getRunwayMonths(heya);

    if (runwayMonths < 5) return;

    const recruitmentThreshold = 2;

    const currentSponsorCount = getCurrentSponsorCount(pool, heya);

    if (currentSponsorCount >= recruitmentThreshold) return;

    const eligibleSponsors = getEligibleSponsors(pool, heya);

    if (eligibleSponsors.length === 0) return;

    const selectedSponsor = eligibleSponsors[0];

    executeSponsorRecruitment(
      world,
      heya,
      oyakata,
      rng,
      selectedSponsor,
      4,
      "Indulgent recruited sponsor for friendly relationship"
    );
  },
};

export function getSponsorStrategy(archetype: OyakataArchetype): SponsorStrategy {
  switch (archetype) {
    case "traditionalist":
      return TraditionalistSponsorStrategy;
    case "scientist":
      return ScientistSponsorStrategy;
    case "gambler":
      return GamblerSponsorStrategy;
    case "nurturer":
      return NurturerSponsorStrategy;
    case "tyrant":
      return TyrantSponsorStrategy;
    case "strategist":
      return StrategistSponsorStrategy;
    case "strict":
      return StrictSponsorStrategy;
    case "indulgent":
      return IndulgentSponsorStrategy;
    default:
      return DefaultSponsorStrategy;
  }
}
