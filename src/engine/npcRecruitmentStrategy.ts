import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import { assertNever } from "./utils/types";
import type { Oyakata, OyakataArchetype } from "./types/oyakata";

interface RecruitmentStrategy {
  evaluateVacancies: (world: WorldState, heya: Heya, oyakata: Oyakata) => number;
  calculateMaxBid: (
    world: WorldState,
    heya: Heya,
    oyakata: Oyakata,
    candidateId: string,
    rivalHeyaId?: string
  ) => number;
}

export const DefaultRecruitmentStrategy: RecruitmentStrategy = {
  evaluateVacancies(_world: WorldState, heya: Heya, oyakata: Oyakata): number {
    const freezeWeeks = heya.welfareState?.sanctions?.recruitmentFreezeWeeks ?? 0;
    if (freezeWeeks > 0) return 0;

    // Use ambition and tradition traits to determine target roster size
    let targetSize = 8;
    if (oyakata.traits.ambition > 75) targetSize += 2;
    if (oyakata.traits.tradition < 30) targetSize -= 1; // Modern less is more approach

    // Mood affects recruitment aggressiveness
    if (oyakata.mood === "anxious") {
      targetSize -= 1; // Anxious oyakata are more conservative
    } else if (oyakata.mood === "obsessed") {
      targetSize += 1; // Obsessed oyakata are more aggressive
    }

    const currentSize = heya.rikishiIds ? heya.rikishiIds.length : 0;

    return Math.max(0, targetSize - currentSize);
  },

  calculateMaxBid(
    _world: WorldState,
    heya: Heya,
    oyakata: Oyakata,
    _candidateId: string,
    rivalHeyaId?: string
  ): number {
    // Basic value based on heya funds and ambition
    let maxBase = heya.funds * 0.15; // 15% of funds as a standard max
    if (oyakata.traits.ambition > 80) maxBase *= 1.25;

    // Drama Pass (Initiative 4): Vindictive NPCs overpay to spite rivals
    if (rivalHeyaId && oyakata.temperament === "Vindictive") {
      const isGrudge = oyakata.grudges?.includes(rivalHeyaId);
      if (isGrudge) {
        console.log(
          `[DramaPass] Oyakata ${oyakata.name} is overpaying (Vindictive) to deny a recruit to rival heya ${rivalHeyaId}`
        );
        maxBase *= 1.4; // 40% premium to block a hated rival
      }
    }

    return maxBase;
  },
};

/**
 * Recruitment strategies for NPC stables.
 * Aligned with real-world sumo archetypes (Traditionalist, Scientist, Gambler, etc.)
 */
export const TraditionalistRecruitmentStrategy: RecruitmentStrategy = {
  evaluateVacancies(_world, heya, oyakata) {
    const freezeWeeks = heya.welfareState?.sanctions?.recruitmentFreezeWeeks ?? 0;
    if (freezeWeeks > 0) return 0;

    // Traditionalists keep a stable, medium roster (approx 10-12)
    // High patience leads to slightly larger target roster (slower development)
    let targetSize = Math.max(10, 8 + Math.floor(oyakata.traits.tradition / 20));
    if (oyakata.traits.patience > 70) {
      targetSize += 1; // More patient oyakata maintain larger rosters
    }
    const currentSize = heya.rikishiIds?.length ?? 0;
    return Math.max(0, targetSize - currentSize);
  },
  calculateMaxBid(world, heya, oyakata, candidateId, _rivalHeyaId) {
    // Traditionalists are conservative with money unless it's a "Traditional" prospect
    let maxBase = heya.funds * 0.1;
    const candidate = Object.values(world.talentPool?.candidates || {}).find(
      (c) => c.candidateId === candidateId
    );
    if (candidate?.style === "yotsu") maxBase *= 1.35; // Value belt-wrestlers
    // Weight-Cutter quirk prefers lighter rikishi
    if (
      oyakata.quirks?.includes("Weight-Cutter") &&
      candidate?.weightPotentialKg &&
      candidate.weightPotentialKg < 120
    ) {
      maxBase *= 1.2;
    }
    // Keiko Romantic quirk strongly favors traditional yotsu style
    if (oyakata.quirks?.includes("Keiko Romantic") && candidate?.style === "yotsu") {
      maxBase *= 1.4;
    }
    return maxBase;
  },
};

export const ScientistRecruitmentStrategy: RecruitmentStrategy = {
  evaluateVacancies(_world, heya, oyakata) {
    // Scientists lean, high-potential rosters
    const targetSize = oyakata.traits.ambition > 80 ? 15 : 9;
    return Math.max(0, targetSize - (heya.rikishiIds?.length ?? 0));
  },
  calculateMaxBid(world, heya, oyakata, candidateId, _rivalHeyaId) {
    // Scientists value 'Potential' (talentSeed) above all else
    const candidate = Object.values(world.talentPool?.candidates || {}).find(
      (c) => c.candidateId === candidateId
    );
    const potentialMultiplier = (candidate?.talentSeed ?? 50) / 50;
    let maxBid = heya.funds * 0.2 * potentialMultiplier;
    // Numbers Guy quirk uses detailed stat analysis
    if (oyakata.quirks?.includes("Numbers Guy") && candidate) {
      const discipline = candidate.temperament?.discipline ?? 50;
      const volatility = candidate.temperament?.volatility ?? 50;
      // Favor candidates with high discipline and low volatility
      if (discipline > 70 && volatility < 30) {
        maxBid *= 1.25;
      }
    }
    return maxBid;
  },
};

export const GamblerRecruitmentStrategy: RecruitmentStrategy = {
  evaluateVacancies(_world, _heya, oyakata) {
    // Gamblers always have room for one more "long shot"
    // Low patience leads to more aggressive recruitment (higher vacancy target)
    const baseVacancies = 1;
    if (oyakata.traits.patience < 30) {
      return baseVacancies + 1; // Impatient gamblers recruit more aggressively
    }
    return baseVacancies;
  },
  calculateMaxBid(_world, heya, _oyakata, _candidateId, rivalHeyaId) {
    // Gamblers take massive risks if it denies a rival or if they feel lucky
    let base = heya.funds * 0.25;
    if (rivalHeyaId) base *= 1.5; // "The Spite Premium"
    return base;
  },
};

export const TyrantRecruitmentStrategy: RecruitmentStrategy = {
  evaluateVacancies(_world, heya, _oyakata) {
    // Tyrants want a massive meat-grinder roster
    return Math.max(0, 25 - (heya.rikishiIds?.length ?? 0));
  },
  calculateMaxBid(_world, heya, _oyakata, _candidateId, _rivalHeyaId) {
    // Tyrants will spend 50% of their total wealth to secure a top prospect
    return heya.funds * 0.5;
  },
};

export const NurturerRecruitmentStrategy: RecruitmentStrategy = {
  evaluateVacancies(_world, heya, oyakata) {
    const freezeWeeks = heya.welfareState?.sanctions?.recruitmentFreezeWeeks ?? 0;
    if (freezeWeeks > 0) return 0;
    const targetSize = oyakata.traits.compassion > 70 ? 8 : 10;
    const currentSize = heya.rikishiIds?.length ?? 0;
    return Math.max(0, targetSize - currentSize);
  },
  calculateMaxBid(world, heya, oyakata, candidateId, _rivalHeyaId) {
    const candidate = Object.values(world.talentPool?.candidates || {}).find(
      (c) => c.candidateId === candidateId
    );
    let maxBase = heya.funds * 0.12;
    if (candidate && candidate.talentSeed > 70) {
      const age = world.year - candidate.birthYear;
      if (age < 18) {
        maxBase *= 1.25;
      }
    }
    // Family First quirk increases bid for candidates with high discipline
    const discipline = candidate?.temperament?.discipline;
    if (oyakata.quirks?.includes("Family First") && discipline && discipline > 70) {
      maxBase *= 1.15;
    }
    return maxBase;
  },
};

export const IndulgentRecruitmentStrategy: RecruitmentStrategy = {
  evaluateVacancies(_world, heya, oyakata) {
    const freezeWeeks = heya.welfareState?.sanctions?.recruitmentFreezeWeeks ?? 0;
    if (freezeWeeks > 0) return 0;

    // Indulgent maintain moderate rosters (9-11) based on comfort
    const targetSize = 9 + Math.floor(oyakata.traits.tradition / 25);
    const currentSize = heya.rikishiIds?.length ?? 0;
    return Math.max(0, targetSize - currentSize);
  },
  calculateMaxBid(world, heya, _oyakata, candidateId, _rivalHeyaId) {
    // Indulgent bid based on "likeability" - they prefer prospects with compatible traits
    const candidate = Object.values(world.talentPool?.candidates || {}).find(
      (c) => c.candidateId === candidateId
    );
    let maxBase = heya.funds * 0.14;

    // Bonus for prospects with high discipline (they value "good attitude")
    const discipline = candidate?.temperament?.discipline;
    if (discipline && discipline > 70) {
      maxBase *= 1.15;
    }

    return maxBase;
  },
};

export const StrictRecruitmentStrategy: RecruitmentStrategy = {
  evaluateVacancies(_world, heya, oyakata) {
    const freezeWeeks = heya.welfareState?.sanctions?.recruitmentFreezeWeeks ?? 0;
    if (freezeWeeks > 0) return 0;

    // Strict maintain traditionalist-like rosters but with stricter stat thresholds
    const targetSize = Math.max(10, 8 + Math.floor(oyakata.traits.tradition / 20));
    const currentSize = heya.rikishiIds?.length ?? 0;
    return Math.max(0, targetSize - currentSize);
  },
  calculateMaxBid(world, heya, _oyakata, candidateId, _rivalHeyaId) {
    // Strict are conservative but will pay for high-quality traditional prospects
    let maxBase = heya.funds * 0.11;
    const candidate = Object.values(world.talentPool?.candidates || {}).find(
      (c) => c.candidateId === candidateId
    );

    // Only bid significantly for high-quality prospects (based on talentSeed and discipline)
    const discipline = candidate?.temperament?.discipline;
    if (candidate && candidate.talentSeed > 75 && discipline && discipline > 75) {
      maxBase *= 1.3;
    } else if (candidate && (candidate.talentSeed < 60 || (discipline && discipline < 60))) {
      maxBase *= 0.7; // Penalty for weak prospects
    }

    return maxBase;
  },
};

export const StrategistRecruitmentStrategy: RecruitmentStrategy = {
  evaluateVacancies(_world, heya, oyakata) {
    // Strategists adapt roster size based on ambition
    const targetSize = oyakata.traits.ambition > 80 ? 14 : 10;
    return Math.max(0, targetSize - (heya.rikishiIds?.length ?? 0));
  },
  calculateMaxBid(world, heya, _oyakata, candidateId, _rivalHeyaId) {
    // Strategists use data-driven bidding based on talent analysis
    const candidate = Object.values(world.talentPool?.candidates || {}).find(
      (c) => c.candidateId === candidateId
    );

    let maxBase = heya.funds * 0.16;

    // Bonus for high-potential prospects
    if (candidate && candidate.talentSeed > 75) {
      maxBase *= 1.25;
    }

    // Timing-based: bid more aggressively when funds are healthy
    const runwayMonths = heya.funds / ((heya.rikishiIds?.length ?? 0) * 150000);
    if (runwayMonths > 12) {
      maxBase *= 1.15;
    }

    return maxBase;
  },
};

export function getRecruitmentStrategy(archetype: OyakataArchetype): RecruitmentStrategy {
  switch (archetype) {
    case "traditionalist":
      return TraditionalistRecruitmentStrategy;
    case "strict":
      return StrictRecruitmentStrategy;
    case "scientist":
      return ScientistRecruitmentStrategy;
    case "strategist":
      return StrategistRecruitmentStrategy;
    case "gambler":
      return GamblerRecruitmentStrategy;
    case "tyrant":
      return TyrantRecruitmentStrategy;
    case "nurturer":
      return NurturerRecruitmentStrategy;
    case "indulgent":
      return IndulgentRecruitmentStrategy;
    default:
      assertNever(archetype);
      return DefaultRecruitmentStrategy;
  }
}
