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
import {
  TRAIT_AMBITION_HIGH_THRESHOLD,
  TRAIT_RISK_HIGH_THRESHOLD,
  TRAIT_PATIENCE_THRESHOLD,
  RELATIONSHIP_STRENGTH_DEFAULT,
  RELATIONSHIP_STRENGTH_PUBLICITY_HAWK,
  RELATIONSHIP_STRENGTH_RISK_TAKER,
  RELATIONSHIP_STRENGTH_TRADITIONALIST,
  RELATIONSHIP_STRENGTH_NEPOSTIST,
  RELATIONSHIP_STRENGTH_NURTURER,
  RELATIONSHIP_STRENGTH_TYRANT,
  RELATIONSHIP_STRENGTH_SCIENTIST,
  RECRUITMENT_THRESHOLD_CONSERVATIVE,
  RECRUITMENT_THRESHOLD_RISK_TAKER,
  RECRUITMENT_THRESHOLD_TRADITIONALIST,
  RECRUITMENT_THRESHOLD_NEPOSTIST,
  RECRUITMENT_THRESHOLD_NURTURER,
  RECRUITMENT_THRESHOLD_TYRANT,
  RECRUITMENT_THRESHOLD_SCIENTIST,
} from "../constants/engine/npcStrategy";
import {
  RUNWAY_THRESHOLD_DEFAULT,
  RUNWAY_THRESHOLD_PUBLICITY_HAWK,
  RUNWAY_THRESHOLD_GAMBLER,
  RUNWAY_THRESHOLD_TRADITIONALIST,
  RUNWAY_THRESHOLD_NEPOSTIST,
  RUNWAY_THRESHOLD_SCIENTIST,
} from "../constants/engine/economic";

interface SponsorStrategy {
  evaluateSponsorRecruitment: (world: WorldState, heya: Heya, oyakata: Oyakata) => StateImpact;
}

export const DefaultSponsorStrategy: SponsorStrategy = {
  evaluateSponsorRecruitment(world: WorldState, heya: Heya, oyakata: Oyakata) {
    const isAmbitious = oyakata.traits.ambition > TRAIT_AMBITION_HIGH_THRESHOLD;
    const isPublicityHawk = oyakata.managerFlags?.publicityHawk;
    const isNepotist = oyakata.managerFlags?.nepotist;
    const isRiskTaker = oyakata.traits.risk > TRAIT_RISK_HIGH_THRESHOLD;

    let recruitmentThreshold = isAmbitious && isPublicityHawk ? RECRUITMENT_THRESHOLD_CONSERVATIVE : isAmbitious ? RECRUITMENT_THRESHOLD_CONSERVATIVE - 1 : RECRUITMENT_THRESHOLD_CONSERVATIVE - 2;
    if (oyakata.traits.patience > TRAIT_PATIENCE_THRESHOLD) {
      recruitmentThreshold = Math.max(RECRUITMENT_THRESHOLD_CONSERVATIVE - 2, recruitmentThreshold - 1);
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
      runwayThreshold: RUNWAY_THRESHOLD_DEFAULT,
      recruitmentThreshold,
      relationshipStrength: RELATIONSHIP_STRENGTH_DEFAULT,
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
    const recruitmentThreshold = isPublicityHawk ? RECRUITMENT_THRESHOLD_TRADITIONALIST + 1 : RECRUITMENT_THRESHOLD_TRADITIONALIST;

    const config: SponsorRecruitmentConfig = {
      runwayThreshold: RUNWAY_THRESHOLD_PUBLICITY_HAWK,
      recruitmentThreshold,
      relationshipStrength: RELATIONSHIP_STRENGTH_PUBLICITY_HAWK,
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
      runwayThreshold: RUNWAY_THRESHOLD_DEFAULT,
      recruitmentThreshold: RECRUITMENT_THRESHOLD_SCIENTIST,
      relationshipStrength: RELATIONSHIP_STRENGTH_SCIENTIST,
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
    const isRiskTaker = oyakata.traits.risk > TRAIT_RISK_HIGH_THRESHOLD;
    const recruitmentThreshold = isRiskTaker ? RECRUITMENT_THRESHOLD_RISK_TAKER : RECRUITMENT_THRESHOLD_SCIENTIST;

    let runwayThreshold = RUNWAY_THRESHOLD_DEFAULT;
    if (oyakata.quirks?.includes("Gambler's Instinct")) {
      runwayThreshold = RUNWAY_THRESHOLD_GAMBLER;
    }

    const config: SponsorRecruitmentConfig = {
      runwayThreshold,
      recruitmentThreshold,
      relationshipStrength: RELATIONSHIP_STRENGTH_RISK_TAKER,
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
      runwayThreshold: RUNWAY_THRESHOLD_TRADITIONALIST,
      recruitmentThreshold: RECRUITMENT_THRESHOLD_TRADITIONALIST,
      relationshipStrength: RELATIONSHIP_STRENGTH_TRADITIONALIST,
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
      runwayThreshold: RUNWAY_THRESHOLD_NEPOSTIST,
      recruitmentThreshold: RECRUITMENT_THRESHOLD_NEPOSTIST,
      relationshipStrength: RELATIONSHIP_STRENGTH_NEPOSTIST,
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
      runwayThreshold: RUNWAY_THRESHOLD_DEFAULT,
      recruitmentThreshold: RECRUITMENT_THRESHOLD_NEPOSTIST,
      relationshipStrength: RELATIONSHIP_STRENGTH_NEPOSTIST,
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
      runwayThreshold: RUNWAY_THRESHOLD_TRADITIONALIST,
      recruitmentThreshold: RECRUITMENT_THRESHOLD_SCIENTIST,
      relationshipStrength: RELATIONSHIP_STRENGTH_SCIENTIST,
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
      runwayThreshold: RUNWAY_THRESHOLD_GAMBLER + 3,
      recruitmentThreshold: RECRUITMENT_THRESHOLD_SCIENTIST,
      relationshipStrength: RELATIONSHIP_STRENGTH_SCIENTIST,
      filterOptions: {
        excludeTiers: ["T0"],
      },
      getReasoning: () => "Indulgent recruited sponsor for friendly relationship",
    };

    return evaluateSponsorRecruitmentCommon(world, heya, oyakata, config);
  },
};

const SPONSOR_STRATEGIES: Record<OyakataArchetype, SponsorStrategy> = {
  traditionalist: TraditionalistSponsorStrategy,
  scientist: ScientistSponsorStrategy,
  gambler: GamblerSponsorStrategy,
  nurturer: NurturerSponsorStrategy,
  tyrant: TyrantSponsorStrategy,
  strategist: StrategistSponsorStrategy,
  strict: StrictSponsorStrategy,
  indulgent: IndulgentSponsorStrategy,
};

export function getSponsorStrategy(archetype: OyakataArchetype): SponsorStrategy {
  return SPONSOR_STRATEGIES[archetype] || DefaultSponsorStrategy;
}
