// CandidateGenerator.ts
// Barrel re-exporting all public generation APIs. Also owns generateCandidate,
// the entry-point that assembles TalentCandidate objects for recruitment pools.

export {
  rollAgeForRank,
  rollPotential,
  deriveCurrentAbility,
  generateRikishiStats,
  type GeneratedStats,
  type PotentialPackage,
} from "./CandidateStats";

export {
  generateSyntheticCareer,
  type DivisionRecords,
} from "./CandidateCareer";

export {
  generateFullRikishi,
  convertCandidateToRikishi,
} from "./CandidateBuilder";

import { seededPick } from "../../utils/random";
import { SeededRNG } from "../../rng";
import { clampInt } from "../../utils/math";
import { generateShikona } from "../../shikona";
import { rollArchetype, buildCombatProfile } from "../../archetype";
import { DEVELOPMENT_PROFILE_WEIGHTS } from "../../constants/DevelopmentCurves";
import type { DevelopmentProfile } from "../../constants/DevelopmentCurves";
import type { TalentCandidate, TalentPoolType } from "../../types/talent";
import { rollPotential } from "./CandidateStats";
import { LineageService } from "./LineageService";
import type { WorldState } from "../../types/world";

/**
 * Generates a single TalentCandidate for the recruitment pools.
 */
export function generateCandidate(args: {
  id: string;
  rng: SeededRNG;
  currentYear: number;
  poolType: TalentPoolType;
  world?: WorldState;
}): TalentCandidate {
  const { id, rng, currentYear, poolType, world } = args;

  const archetype = rollArchetype(rng);
  const profile = buildCombatProfile(archetype);

  // Candidates are always future jonokuchi recruits — roll PA + dev profile so
  // scouting can reveal their trajectory before signing.
  const developmentProfile = (() => {
    const roll = rng.next();
    let acc = 0;
    for (const [p, w] of Object.entries(DEVELOPMENT_PROFILE_WEIGHTS)) {
      acc += w;
      if (roll < acc) return p as DevelopmentProfile;
    }
    return "standard" as DevelopmentProfile;
  })();

  // Phase 5: Emergent Prodigy (1.5% chance)
  const isEmergentProdigy = rng.next() < 0.015;
  const devProfileForRoll = isEmergentProdigy ? "prodigy" : developmentProfile;

  const paPkg = rollPotential({
    rng,
    rank: "jonokuchi",
    profile,
    developmentProfile: devProfileForRoll,
  });

  // Apply Prodigy bonus to stat ceilings
  if (isEmergentProdigy) {
    Object.keys(paPkg.stats).forEach((stat) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (paPkg.stats as any)[stat] = clampInt((paPkg.stats as any)[stat] + 12, 40, 99);
    });
    paPkg.ceilingFraction = 1.0; // Prodigies always reach their full PA
    paPkg.developmentSpeed *= 1.25; // Faster growth
  }

  // Phase 5 Depth: Genetic Lineage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bloodlineTrait: any = null;
  if (world) {
    bloodlineTrait = LineageService.rollGeneticLineage(
      world,
      {
        ...args, // Partial mock since we haven't built the candidate yet
        tags: isEmergentProdigy ? ["prodigy"] : [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      rng
    );
  }

  // Determine origin based on pool
  const origin =
    poolType === "foreign"
      ? seededPick(rng, ["Mongolia", "Georgia", "Russia", "Brazil", "USA"])
      : seededPick(rng, ["Aomori", "Osaka", "Tokyo", "Fukuoka", "Hokkaido", "Ishikawa"]);

  const name = generateShikona(`${rng.seed}::candidate::${id}`, {
    rng,
    heyaId: undefined,
    nationality: poolType === "foreign" ? origin : "Japan",
    rank: "jonokuchi",
    legacyShikona: undefined,
  });

  return {
    candidateId: id,
    personId: rng.uuid("PS"),
    name,
    nationality: poolType === "foreign" ? origin : "Japan",
    birthYear: currentYear - (15 + rng.int(0, poolType === "university" ? 7 : 3)),
    originRegion: origin,

    visibilityBand: "hidden",
    availabilityState: "available",

    // Core combat stats (masked by visibility in UI)
    archetype,
    style: archetype === "oshi" ? "oshi" : archetype === "yotsu" ? "yotsu" : "hybrid",
    combatProfile: profile,

    reputationSeed: rng.int(0, 100),
    heightPotentialCm: paPkg.heightCm,
    weightPotentialKg: paPkg.weightKg,
    talentSeed: rng.int(0, 100),
    temperament: { discipline: rng.int(0, 100), volatility: rng.int(0, 100) },

    competingSuitors: [],
    tags: isEmergentProdigy ? ["prodigy"] : rng.next() > 0.8 ? ["amateur_star"] : [],
    isEmergentProdigy,

    potentialStats: {
      strength: paPkg.stats.strength,
      speed: paPkg.stats.speed,
      technique: paPkg.stats.technique,
      balance: paPkg.stats.balance,
      stamina: paPkg.stats.stamina,
      mental: paPkg.stats.mental,
      adaptability: paPkg.stats.adaptability,
    },
    developmentProfile: devProfileForRoll,
    developmentSpeed: paPkg.developmentSpeed,
    peakAgeOffset: paPkg.peakAgeOffset,
    ceilingFraction: paPkg.ceilingFraction,
    bloodlineTrait,
  };
}
