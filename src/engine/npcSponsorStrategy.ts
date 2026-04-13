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
    const avgFacility =
      (heya.facilities.training + heya.facilities.recovery + heya.facilities.nutrition) / 3;
    const monthlyBurn = (heya.rikishiIds ?? []).length * 150_000 + avgFacility * 9_000;
    const runwayMonths = monthlyBurn > 0 ? heya.funds / monthlyBurn : 0;

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
    const currentSponsorCount = Array.from(pool.sponsors.values()).filter(
      (s) => s.active && s.relationships?.some((r) => r.targetId === heya.id)
    ).length;

    if (currentSponsorCount >= recruitmentThreshold) return;

    // Find eligible sponsors not already in a relationship with this heya
    const eligibleSponsors = Array.from(pool.sponsors.values())
      .filter(
        (s) => s.active && !s.relationships?.some((r) => r.targetId === heya.id) && s.tier !== "T0" // Exclude lowest tier
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

    const suitableSponsors = eligibleSponsors.filter((s) => {
      const tierIndex = tierOrder.indexOf(s.tier);
      return tierIndex <= maxTierIndex;
    });

    if (suitableSponsors.length === 0) return;

    // Pick top candidate
    const selectedSponsor = suitableSponsors[0];

    // Create sponsor relationship
    const relId = rng.uuid("SR");
    const relationship: SponsorRelationship = {
      relId,
      sponsorId: selectedSponsor.sponsorId,
      targetType: "beya",
      targetId: heya.id,
      role: "benefactor" as SponsorRole,
      strength: 3,
      startedAtTick: world.week,
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
    EventBus.managementDecision(
      world,
      heya.id,
      {
        archetype: oyakata.archetype,
        sponsor: selectedSponsor.displayName,
        tier: selectedSponsor.tier,
        reasoning: reason,
      },
      "minor"
    );
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
    const avgFacility =
      (heya.facilities.training + heya.facilities.recovery + heya.facilities.nutrition) / 3;
    const monthlyBurn = (heya.rikishiIds ?? []).length * 150_000 + avgFacility * 9_000;
    const runwayMonths = monthlyBurn > 0 ? heya.funds / monthlyBurn : 0;

    if (runwayMonths < 9) return; // Traditionalists are more conservative

    const recruitmentThreshold = isPublicityHawk ? 2 : 1;

    const currentSponsorCount = Array.from(pool.sponsors.values()).filter(
      (s) => s.active && s.relationships?.some((r) => r.targetId === heya.id)
    ).length;

    if (currentSponsorCount >= recruitmentThreshold) return;

    // Prefer sponsors with established reputation
    const eligibleSponsors = Array.from(pool.sponsors.values())
      .filter(
        (s) =>
          s.active &&
          !s.relationships?.some((r) => r.targetId === heya.id) &&
          s.tier !== "T0" &&
          s.tier !== "T5" // Avoid risky new sponsors
      )
      .sort((a, b) => b.prestigeAffinity - a.prestigeAffinity);

    if (eligibleSponsors.length === 0) return;

    const selectedSponsor = eligibleSponsors[0];

    const relId = rng.uuid("SR");
    const relationship: SponsorRelationship = {
      relId,
      sponsorId: selectedSponsor.sponsorId,
      targetType: "beya",
      targetId: heya.id,
      role: "benefactor" as SponsorRole,
      strength: 4, // Stronger relationships
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
        reasoning: "Traditionalist recruited established sponsor for long-term partnership",
      },
      "minor"
    );
  },
};

export const ScientistSponsorStrategy: SponsorStrategy = {
  evaluateSponsorRecruitment(world, heya, oyakata) {
    const pool = world.sponsorPool;
    if (!pool || !pool.sponsors) return;

    const rng = rngForWorld(world, "sponsorStrategy", heya.id);

    // Scientists target sponsors with research/training benefits
    const avgFacility =
      (heya.facilities.training + heya.facilities.recovery + heya.facilities.nutrition) / 3;
    const monthlyBurn = (heya.rikishiIds ?? []).length * 150_000 + avgFacility * 9_000;
    const runwayMonths = monthlyBurn > 0 ? heya.funds / monthlyBurn : 0;

    if (runwayMonths < 6) return;

    const recruitmentThreshold = 2;

    const currentSponsorCount = Array.from(pool.sponsors.values()).filter(
      (s) => s.active && s.relationships?.some((r) => r.targetId === heya.id)
    ).length;

    if (currentSponsorCount >= recruitmentThreshold) return;

    const eligibleSponsors = Array.from(pool.sponsors.values())
      .filter(
        (s) => s.active && !s.relationships?.some((r) => r.targetId === heya.id) && s.tier !== "T0"
      )
      .sort((a, b) => b.prestigeAffinity - a.prestigeAffinity);

    if (eligibleSponsors.length === 0) return;

    const selectedSponsor = eligibleSponsors[0];

    const relId = rng.uuid("SR");
    const relationship: SponsorRelationship = {
      relId,
      sponsorId: selectedSponsor.sponsorId,
      targetType: "beya",
      targetId: heya.id,
      role: "benefactor" as SponsorRole,
      strength: 3,
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
        reasoning: "Scientist recruited sponsor for research and training benefits",
      },
      "minor"
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

    const avgFacility =
      (heya.facilities.training + heya.facilities.recovery + heya.facilities.nutrition) / 3;
    const monthlyBurn = (heya.rikishiIds ?? []).length * 150_000 + avgFacility * 9_000;
    const runwayMonths = monthlyBurn > 0 ? heya.funds / monthlyBurn : 0;

    let runwayThreshold = 3;
    // Gambler's Instinct quirk makes gamblers even more willing to take risks
    if (oyakata.quirks?.includes("Gambler's Instinct")) {
      runwayThreshold = 2;
    }
    if (runwayMonths < runwayThreshold) return;

    const recruitmentThreshold = isRiskTaker ? 4 : 2;

    const currentSponsorCount = Array.from(pool.sponsors.values()).filter(
      (s) => s.active && s.relationships?.some((r) => r.targetId === heya.id)
    ).length;

    if (currentSponsorCount >= recruitmentThreshold) return;

    // Gamblers willing to take volatile sponsor deals
    const eligibleSponsors = Array.from(pool.sponsors.values())
      .filter(
        (s) => s.active && !s.relationships?.some((r) => r.targetId === heya.id) && s.tier !== "T0"
      )
      .sort((a, b) => b.prestigeAffinity - a.prestigeAffinity);

    if (eligibleSponsors.length === 0) return;

    const selectedSponsor = eligibleSponsors[0];

    const relId = rng.uuid("SR");
    const relationship: SponsorRelationship = {
      relId,
      sponsorId: selectedSponsor.sponsorId,
      targetType: "beya",
      targetId: heya.id,
      role: "benefactor" as SponsorRole,
      strength: 2, // Weaker initial relationship
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
        reasoning: "Gambler recruited sponsor for high-risk, high-reward relationship",
      },
      "minor"
    );
  },
};

export const NurturerSponsorStrategy: SponsorStrategy = {
  evaluateSponsorRecruitment(world, heya, oyakata) {
    const pool = world.sponsorPool;
    if (!pool || !pool.sponsors) return;

    const rng = rngForWorld(world, "sponsorStrategy", heya.id);

    // Nurturers seek sponsors with welfare benefits for rikishi
    const avgFacility =
      (heya.facilities.training + heya.facilities.recovery + heya.facilities.nutrition) / 3;
    const monthlyBurn = (heya.rikishiIds ?? []).length * 150_000 + avgFacility * 9_000;
    const runwayMonths = monthlyBurn > 0 ? heya.funds / monthlyBurn : 0;

    if (runwayMonths < 8) return; // Nurturers prioritize welfare

    const recruitmentThreshold = 1;

    const currentSponsorCount = Array.from(pool.sponsors.values()).filter(
      (s) => s.active && s.relationships?.some((r) => r.targetId === heya.id)
    ).length;

    if (currentSponsorCount >= recruitmentThreshold) return;

    const eligibleSponsors = Array.from(pool.sponsors.values())
      .filter(
        (s) =>
          s.active &&
          !s.relationships?.some((r) => r.targetId === heya.id) &&
          s.tier !== "T0" &&
          s.tier !== "T5" // Avoid risky sponsors
      )
      .sort((a, b) => b.prestigeAffinity - a.prestigeAffinity);

    if (eligibleSponsors.length === 0) return;

    const selectedSponsor = eligibleSponsors[0];

    const relId = rng.uuid("SR");
    const relationship: SponsorRelationship = {
      relId,
      sponsorId: selectedSponsor.sponsorId,
      targetType: "beya",
      targetId: heya.id,
      role: "benefactor" as SponsorRole,
      strength: 5, // Strong relationships for welfare
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
        reasoning: "Nurturer recruited sponsor for rikishi welfare benefits",
      },
      "minor"
    );
  },
};

export const TyrantSponsorStrategy: SponsorStrategy = {
  evaluateSponsorRecruitment(world, heya, oyakata) {
    const pool = world.sponsorPool;
    if (!pool || !pool.sponsors) return;

    const rng = rngForWorld(world, "sponsorStrategy", heya.id);

    // Tyrants demand high-tier sponsors, prestige-focused
    const avgFacility =
      (heya.facilities.training + heya.facilities.recovery + heya.facilities.nutrition) / 3;
    const monthlyBurn = (heya.rikishiIds ?? []).length * 150_000 + avgFacility * 9_000;
    const runwayMonths = monthlyBurn > 0 ? heya.funds / monthlyBurn : 0;

    if (runwayMonths < 12) return; // Tyrants want significant reserves

    const recruitmentThreshold = 3;

    const currentSponsorCount = Array.from(pool.sponsors.values()).filter(
      (s) => s.active && s.relationships?.some((r) => r.targetId === heya.id)
    ).length;

    if (currentSponsorCount >= recruitmentThreshold) return;

    // Only high-tier sponsors
    const eligibleSponsors = Array.from(pool.sponsors.values())
      .filter(
        (s) =>
          s.active &&
          !s.relationships?.some((r) => r.targetId === heya.id) &&
          (s.tier === "T5" || s.tier === "T4") // Only top tiers
      )
      .sort((a, b) => b.prestigeAffinity - a.prestigeAffinity);

    if (eligibleSponsors.length === 0) return;

    const selectedSponsor = eligibleSponsors[0];

    const relId = rng.uuid("SR");
    const relationship: SponsorRelationship = {
      relId,
      sponsorId: selectedSponsor.sponsorId,
      targetType: "beya",
      targetId: heya.id,
      role: "benefactor" as SponsorRole,
      strength: 3,
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
        reasoning: "Tyrant recruited high-tier sponsor for prestige",
      },
      "minor"
    );
  },
};

export const StrategistSponsorStrategy: SponsorStrategy = {
  evaluateSponsorRecruitment(world, heya, oyakata) {
    const pool = world.sponsorPool;
    if (!pool || !pool.sponsors) return;

    const rng = rngForWorld(world, "sponsorStrategy", heya.id);

    // Strategists maintain diversified sponsor portfolio
    const avgFacility =
      (heya.facilities.training + heya.facilities.recovery + heya.facilities.nutrition) / 3;
    const monthlyBurn = (heya.rikishiIds ?? []).length * 150_000 + avgFacility * 9_000;
    const runwayMonths = monthlyBurn > 0 ? heya.funds / monthlyBurn : 0;

    if (runwayMonths < 6) return;

    const recruitmentThreshold = 3;

    const currentSponsorCount = Array.from(pool.sponsors.values()).filter(
      (s) => s.active && s.relationships?.some((r) => r.targetId === heya.id)
    ).length;

    if (currentSponsorCount >= recruitmentThreshold) return;

    const eligibleSponsors = Array.from(pool.sponsors.values())
      .filter(
        (s) => s.active && !s.relationships?.some((r) => r.targetId === heya.id) && s.tier !== "T0"
      )
      .sort((a, b) => b.prestigeAffinity - a.prestigeAffinity);

    if (eligibleSponsors.length === 0) return;

    const selectedSponsor = eligibleSponsors[0];

    const relId = rng.uuid("SR");
    const relationship: SponsorRelationship = {
      relId,
      sponsorId: selectedSponsor.sponsorId,
      targetType: "beya",
      targetId: heya.id,
      role: "benefactor" as SponsorRole,
      strength: 3,
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
        reasoning: "Strategist recruited sponsor for diversified portfolio",
      },
      "minor"
    );
  },
};

export const StrictSponsorStrategy: SponsorStrategy = {
  evaluateSponsorRecruitment(world, heya, oyakata) {
    const pool = world.sponsorPool;
    if (!pool || !pool.sponsors) return;

    const rng = rngForWorld(world, "sponsorStrategy", heya.id);

    // Strict only partner with reputable sponsors
    const avgFacility =
      (heya.facilities.training + heya.facilities.recovery + heya.facilities.nutrition) / 3;
    const monthlyBurn = (heya.rikishiIds ?? []).length * 150_000 + avgFacility * 9_000;
    const runwayMonths = monthlyBurn > 0 ? heya.funds / monthlyBurn : 0;

    if (runwayMonths < 8) return;

    const recruitmentThreshold = 2;

    const currentSponsorCount = Array.from(pool.sponsors.values()).filter(
      (s) => s.active && s.relationships?.some((r) => r.targetId === heya.id)
    ).length;

    if (currentSponsorCount >= recruitmentThreshold) return;

    // Only reputable sponsors
    const eligibleSponsors = Array.from(pool.sponsors.values())
      .filter(
        (s) =>
          s.active &&
          !s.relationships?.some((r) => r.targetId === heya.id) &&
          s.tier !== "T0" &&
          s.tier !== "T5" // Avoid controversy
      )
      .sort((a, b) => b.prestigeAffinity - a.prestigeAffinity);

    if (eligibleSponsors.length === 0) return;

    const selectedSponsor = eligibleSponsors[0];

    const relId = rng.uuid("SR");
    const relationship: SponsorRelationship = {
      relId,
      sponsorId: selectedSponsor.sponsorId,
      targetType: "beya",
      targetId: heya.id,
      role: "benefactor" as SponsorRole,
      strength: 4,
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
        reasoning: "Strict recruited reputable sponsor to avoid controversy",
      },
      "minor"
    );
  },
};

export const IndulgentSponsorStrategy: SponsorStrategy = {
  evaluateSponsorRecruitment(world, heya, oyakata) {
    const pool = world.sponsorPool;
    if (!pool || !pool.sponsors) return;

    const rng = rngForWorld(world, "sponsorStrategy", heya.id);

    // Indulgent maintain friendly sponsor relationships
    const avgFacility =
      (heya.facilities.training + heya.facilities.recovery + heya.facilities.nutrition) / 3;
    const monthlyBurn = (heya.rikishiIds ?? []).length * 150_000 + avgFacility * 9_000;
    const runwayMonths = monthlyBurn > 0 ? heya.funds / monthlyBurn : 0;

    if (runwayMonths < 5) return;

    const recruitmentThreshold = 2;

    const currentSponsorCount = Array.from(pool.sponsors.values()).filter(
      (s) => s.active && s.relationships?.some((r) => r.targetId === heya.id)
    ).length;

    if (currentSponsorCount >= recruitmentThreshold) return;

    const eligibleSponsors = Array.from(pool.sponsors.values())
      .filter(
        (s) => s.active && !s.relationships?.some((r) => r.targetId === heya.id) && s.tier !== "T0"
      )
      .sort((a, b) => b.prestigeAffinity - a.prestigeAffinity);

    if (eligibleSponsors.length === 0) return;

    const selectedSponsor = eligibleSponsors[0];

    const relId = rng.uuid("SR");
    const relationship: SponsorRelationship = {
      relId,
      sponsorId: selectedSponsor.sponsorId,
      targetType: "beya",
      targetId: heya.id,
      role: "benefactor" as SponsorRole,
      strength: 4,
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
        reasoning: "Indulgent recruited sponsor for friendly relationship",
      },
      "minor"
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
