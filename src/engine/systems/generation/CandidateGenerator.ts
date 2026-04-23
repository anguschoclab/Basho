// @ts-nocheck
import { seededPick } from "../../utils/random";
import { SeededRNG } from "../../rng";
import { clampInt } from "../../utils/math";
import { generateShikona } from "../../shikona";
import { rollArchetype, buildCombatProfile } from "../../archetype";
import { DEVELOPMENT_PROFILE_WEIGHTS } from "../../constants/DevelopmentCurves";
import type { DevelopmentProfile } from "../../constants/DevelopmentCurves";
import type { TalentCandidate, TalentPoolType } from "../../types/talent";
import { rollPotential } from "./CandidateStats";
import { LegacyService } from "../legacy/LegacyService";
import type { WorldState } from "../../types/world";
import type { RikishiStats } from "../../types/rikishi";

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
    const entries = Object.entries(DEVELOPMENT_PROFILE_WEIGHTS);
    for (const [p, w] of entries) {
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
    const stats = paPkg.stats;
    const keys: Array<keyof RikishiStats> = [
      "strength",
      "speed",
      "technique",
      "stamina",
      "mental",
      "adaptability",
      "balance",
    ];
    for (const key of keys) {
      stats[key] = clampInt((stats[key] || 0) + 12, 40, 99);
    }
    paPkg.ceilingFraction = 1.0; // Prodigies always reach their full PA
    paPkg.developmentSpeed *= 1.25; // Faster growth
  }

  // Phase 5 Depth: Genetic Lineage
  const legacyTrait = world
    ? LegacyService.rollLegacyAncestry(world, { isAmateurStar: isEmergentProdigy }, rng)
    : null;

  if (legacyTrait) {
    paPkg.stats = LegacyService.applyLegacyTrait(paPkg.stats, legacyTrait);
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
    bloodlineTrait: legacyTrait,
  };
}