import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { Oyakata } from "./types/oyakata";
import type { OyakataArchetype } from "./types/oyakata";
import {
  evaluateSponsorRecruitmentCommon,
  type SponsorRecruitmentConfig,
  type SponsorFilterOptions,
} from "./npcSponsorStrategyHelpers";
import type { StateImpact } from "./core/StateImpact";

interface SponsorStrategy {
  evaluateSponsorRecruitment: (world: WorldState, heya: Heya, oyakata: Oyakata) => StateImpact;
}

export const DefaultSponsorStrategy: SponsorStrategy = {
  evaluateSponsorRecruitment(world: WorldState, heya: Heya, oyakata: Oyakata) {
    const isAmbitious = oyakata.traits.ambition > 60;
    const isPublicityHawk = oyakata.managerFlags?.publicityHawk;
    const isNepotist = oyakata.managerFlags?.nepotist;
    const isRiskTaker = oyakata.traits.risk > 50;

    let recruitmentThreshold = isAmbitious && isPublicityHawk ? 3 : isAmbitious ? 2 : 1;
    if (oyakata.traits.patience > 70) {
      recruitmentThreshold = Math.max(1, recruitmentThreshold - 1);
    }

    if (oyakata.mood === "anxious") {
      recruitmentThreshold = Math.max(1, recruitmentThreshold - 1);
    } else if (oyakata.mood === "obsessed") {
      recruitmentThreshold += 1;
    }

    const filterOptions: SponsorFilterOptions = {
      excludeTiers: ["T0"],
    };

    if (isRiskTaker) {
      filterOptions.includeTiers = ["T5", "T4", "T3", "T2", "T1"];
    } else {
      filterOptions.includeTiers = ["T3", "T2", "T1"];
    }

    const config: SponsorRecruitmentConfig = {
      runwayThreshold: 6,
      recruitmentThreshold,
      relationshipStrength: 3,
      filterOptions,
      getReasoning: () =>
        isPublicityHawk
          ? "Publicity-focused oyakata recruited sponsor for media exposure"
          : isAmbitious
            ? "Ambitious oyakata recruited sponsor to expand network"
            : isNepotist
              ? "Nepotist oyakata recruited sponsor for network connections"
              : "Standard sponsor recruitment",
    };

    return evaluateSponsorRecruitmentCommon(world, heya, oyakata, config);
  },
};

export const TraditionalistSponsorStrategy: SponsorStrategy = {
  evaluateSponsorRecruitment(world, heya, oyakata) {
    const isPublicityHawk = oyakata.managerFlags?.publicityHawk;
    const recruitmentThreshold = isPublicityHawk ? 2 : 1;

    const config: SponsorRecruitmentConfig = {
      runwayThreshold: 9,
      recruitmentThreshold,
      relationshipStrength: 4,
      filterOptions: {
        excludeTiers: ["T0", "T5"],
      },
      getReasoning: () => "Traditionalist recruited established sponsor for long-term partnership",
    };

    return evaluateSponsorRecruitmentCommon(world, heya, oyakata, config);
  },
};

export const ScientistSponsorStrategy: SponsorStrategy = {
  evaluateSponsorRecruitment(world, heya, oyakata) {
    const config: SponsorRecruitmentConfig = {
      runwayThreshold: 6,
      recruitmentThreshold: 2,
      relationshipStrength: 3,
      filterOptions: {
        excludeTiers: ["T0"],
      },
      getReasoning: () => "Scientist recruited sponsor for research and training benefits",
    };

    return evaluateSponsorRecruitmentCommon(world, heya, oyakata, config);
  },
};

export const GamblerSponsorStrategy: SponsorStrategy = {
  evaluateSponsorRecruitment(world, heya, oyakata) {
    const isRiskTaker = oyakata.traits.risk > 60;
    const recruitmentThreshold = isRiskTaker ? 4 : 2;

    let runwayThreshold = 3;
    if (oyakata.quirks?.includes("Gambler's Instinct")) {
      runwayThreshold = 2;
    }

    const config: SponsorRecruitmentConfig = {
      runwayThreshold,
      recruitmentThreshold,
      relationshipStrength: 2,
      filterOptions: {
        excludeTiers: ["T0"],
      },
      getReasoning: () => "Gambler recruited sponsor for high-risk, high-reward relationship",
    };

    return evaluateSponsorRecruitmentCommon(world, heya, oyakata, config);
  },
};

export const NurturerSponsorStrategy: SponsorStrategy = {
  evaluateSponsorRecruitment(world, heya, oyakata) {
    const config: SponsorRecruitmentConfig = {
      runwayThreshold: 8,
      recruitmentThreshold: 1,
      relationshipStrength: 5,
      filterOptions: {
        excludeTiers: ["T0", "T5"],
      },
      getReasoning: () => "Nurturer recruited sponsor for rikishi welfare benefits",
    };

    return evaluateSponsorRecruitmentCommon(world, heya, oyakata, config);
  },
};

export const TyrantSponsorStrategy: SponsorStrategy = {
  evaluateSponsorRecruitment(world, heya, oyakata) {
    const config: SponsorRecruitmentConfig = {
      runwayThreshold: 12,
      recruitmentThreshold: 3,
      relationshipStrength: 3,
      filterOptions: {
        includeTiers: ["T5", "T4"],
      },
      getReasoning: () => "Tyrant recruited high-tier sponsor for prestige",
    };

    return evaluateSponsorRecruitmentCommon(world, heya, oyakata, config);
  },
};

export const StrategistSponsorStrategy: SponsorStrategy = {
  evaluateSponsorRecruitment(world, heya, oyakata) {
    const config: SponsorRecruitmentConfig = {
      runwayThreshold: 6,
      recruitmentThreshold: 3,
      relationshipStrength: 3,
      filterOptions: {
        excludeTiers: ["T0"],
      },
      getReasoning: () => "Strategist recruited sponsor for diversified portfolio",
    };

    return evaluateSponsorRecruitmentCommon(world, heya, oyakata, config);
  },
};

export const StrictSponsorStrategy: SponsorStrategy = {
  evaluateSponsorRecruitment(world, heya, oyakata) {
    const config: SponsorRecruitmentConfig = {
      runwayThreshold: 8,
      recruitmentThreshold: 2,
      relationshipStrength: 4,
      filterOptions: {
        excludeTiers: ["T0", "T5"],
      },
      getReasoning: () => "Strict recruited reputable sponsor to avoid controversy",
    };

    return evaluateSponsorRecruitmentCommon(world, heya, oyakata, config);
  },
};

export const IndulgentSponsorStrategy: SponsorStrategy = {
  evaluateSponsorRecruitment(world, heya, oyakata) {
    const config: SponsorRecruitmentConfig = {
      runwayThreshold: 5,
      recruitmentThreshold: 2,
      relationshipStrength: 4,
      filterOptions: {
        excludeTiers: ["T0"],
      },
      getReasoning: () => "Indulgent recruited sponsor for friendly relationship",
    };

    return evaluateSponsorRecruitmentCommon(world, heya, oyakata, config);
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
