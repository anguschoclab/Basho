/**
 * src/engine/generation/CandidateGenerator.ts
 * =================================================
 * Candidate Generator
 *
 * Responsibilities:
 * - Generate talent candidates for recruitment pools
 * - Roll combat archetypes and profiles
 * - Determine development profiles and potential
 * - Apply emergent prodigy bonuses (1.5% chance)
 * - Roll genetic lineage traits
 * - Generate shikona names and origin data
 * - Create deterministic scouting bias
 *
 * @see CandidateStats for potential rolling logic
 * @see LegacyService for genetic lineage
 * @see FogOfWarService for scouting bias
 */

import { seededPick } from "@/engine/utils/random";
import { SeededRNG } from "@/engine/core/rng";
import { clampInt } from "@/engine/utils/math";
import { generateShikona } from "@/engine/shikona/generateShikona";
import { rollArchetype, rollArchetypeWithBias, buildCombatProfile } from "@/engine/bout/archetype";
import { DEVELOPMENT_PROFILE_WEIGHTS } from "@/constants/engine/development";
import type { DevelopmentProfile } from "@/constants/engine/development";
import type { TalentCandidate, TalentPoolType } from "@/engine/types/talent";
import { rollPotential, rollCeilingRank } from "@/engine/generation/CandidateStats";
import { LegacyService } from "@/engine/legacy/LegacyService";
import type { WorldState } from "@/engine/types/world";
import type { RikishiStats } from "@/engine/types/rikishi";
import { JAPANESE_PREFECTURES, SUMO_HOTBEDS } from "@/engine/generation/data/sumo_geography";
import { generateScoutingBias } from "@/engine/recruitment/FogOfWarService";
import { generateAvatarIdentity } from "@/engine/generation/avatarGenerator";
import {
  EMERGENT_PRODIGY_CHANCE,
  PRODIGY_STAT_BONUS,
  STAT_MIN,
  STAT_MAX,
  PRODIGY_PA_CEILING_FRACTION,
  PRODIGY_DEVELOPMENT_SPEED_MULTIPLIER,
  DEBUT_AGE_BASE,
  UNIVERSITY_BIRTH_YEAR_RANGE,
  OTHER_BIRTH_YEAR_RANGE,
  REPUTATION_SEED_MIN,
  REPUTATION_SEED_MAX,
  TALENT_SEED_MIN,
  TALENT_SEED_MAX,
  TEMPERAMENT_MIN,
  TEMPERAMENT_MAX,
  AMATEUR_STAR_TAG_CHANCE,
  JAPANESE_PREFECTURES_COUNT,
  SCHOOL_ORIGIN_CHANCE,
  SUMO_SCHOOLS,
} from "@/constants/engine/generation";
import {
  DUAL_CITIZEN_RECRUIT_SHARE,
  TSUKEDASHI_UNIVERSITY_SHARE,
  TSUKEDASHI_HS_SHARE,
  FOREIGN_DEBUT_AGE_MIN,
  FOREIGN_DEBUT_AGE_MAX,
  FOREIGN_PA_FLOOR,
  FOREIGN_DEVSPEED_MULT,
  FOREIGN_SDTD_CHANCE,
  TSUKEDASHI_PA_FLOOR,
  TSUKEDASHI_DEVSPEED_MIN,
  TSUKEDASHI_EXPIRY_YEARS,
} from "@/constants/engine/recruitment";
import { rollForeignOrigin } from "@/engine/utils/identity";

function rollDevelopmentProfile(rng: SeededRNG): DevelopmentProfile {
  const roll = rng.next();
  let acc = 0;
  for (const [profile, weight] of Object.entries(DEVELOPMENT_PROFILE_WEIGHTS)) {
    acc += weight;
    if (roll < acc) return profile as DevelopmentProfile;
  }
  return "standard";
}

/**
 * Generates a single TalentCandidate for the recruitment pools.
 * Creates a complete candidate with archetype, stats, development profile,
 * and personal information.
 *
 * Algorithm:
 * 1. Roll combat archetype and build profile
 * 2. Determine development profile (standard, late_bloomer, etc.)
 * 3. Check for emergent prodigy (1.5% chance)
 * 4. Roll potential stats based on profile
 * 5. Apply prodigy bonuses if applicable
 * 6. Roll genetic lineage trait
 * 7. Determine origin based on pool type
 * 8. Generate shikona name
 * 9. Create deterministic scouting bias
 *
 * @param {{ id: string; rng: SeededRNG; currentYear: number; poolType: TalentPoolType; world?: WorldState }} args - Generation parameters.
 * @param {string} args.id - The candidate ID.
 * @param {SeededRNG} args.rng - The RNG instance for deterministic generation.
 * @param {number} args.currentYear - The current simulation year.
 * @param {TalentPoolType} args.poolType - The pool type (domestic, foreign, university).
 * @param {WorldState} [args.world] - The world state (for lineage rolling).
 * @returns {TalentCandidate} The generated talent candidate.
 *
 * @example
 * ```ts
 * const candidate = generateCandidate({
 *   id: "candidate1",
 *   rng: RNGRegistry.getSystemRNG(world, "generation", `candidate-${candidateId}`),
 *   currentYear: world.year,
 *   poolType: "domestic",
 *   world
 * });
 * console.log(candidate.name, candidate.archetype);
 * ```
 */
const PA_STAT_KEYS = [
  "power",
  "speed",
  "technique",
  "stamina",
  "mental",
  "adaptability",
  "balance",
] as const;

/** Emergent-prodigy bonus: stat bump, full-PA ceiling, faster growth. */
function applyProdigyBonus(paPkg: {
  stats: RikishiStats;
  ceilingFraction: number;
  developmentSpeed: number;
}): void {
  const keys: Array<keyof Omit<RikishiStats, "specialPrizes" | "achievements">> = [
    "power",
    "speed",
    "technique",
    "stamina",
    "mental",
    "adaptability",
    "balance",
  ];
  for (const key of keys) {
    paPkg.stats[key] = clampInt(
      (paPkg.stats[key] || 0) + PRODIGY_STAT_BONUS,
      STAT_MIN,
      STAT_MAX
    );
  }
  paPkg.ceilingFraction = PRODIGY_PA_CEILING_FRACTION; // Prodigies always reach their full PA
  paPkg.developmentSpeed *= PRODIGY_DEVELOPMENT_SPEED_MULTIPLIER; // Faster growth
}

/** Applies a combat-PA floor (and optional devSpeed multiplier) in place. */
function applyPaFloor(
  paPkg: { stats: Record<(typeof PA_STAT_KEYS)[number], number>; developmentSpeed: number },
  floor: number,
  devSpeedMult?: number
): void {
  for (const key of PA_STAT_KEYS) {
    paPkg.stats[key] = Math.max(paPkg.stats[key], floor);
  }
  if (devSpeedMult !== undefined) paPkg.developmentSpeed *= devSpeedMult;
}

export function generateCandidate(args: {
  id: string;
  rng: SeededRNG;
  currentYear: number;
  poolType: TalentPoolType;
  world?: WorldState;
  heyaId?: string;
}): TalentCandidate {
  const { id, rng, currentYear, poolType, world, heyaId } = args;

  // Heya style influence (5.3): bias archetype based on heya training philosophy
  const heya = heyaId && world ? world.heyas.get(heyaId) : undefined;
  const archetype = heya?.trainingPhilosophy
    ? rollArchetypeWithBias(rng, heya.trainingPhilosophy)
    : rollArchetype(rng);
  const profile = buildCombatProfile(archetype);

  // Candidates are always future jonokuchi recruits — roll PA + dev profile so
  // scouting can reveal their trajectory before signing.
  const developmentProfile = rollDevelopmentProfile(rng);

  // Phase 5: Emergent Prodigy (1.5% chance)
  const isEmergentProdigy = rng.next() < EMERGENT_PRODIGY_CHANCE;
  const devProfileForRoll = isEmergentProdigy ? "prodigy" : developmentProfile;

  // Candidates still debut at jonokuchi, but their ceiling tier is drawn
  // first — debut rank and potential ceiling are not the same thing. The
  // thin elite tail supplies sanyaku-calibre material (measured 0 ≥72 PA
  // in 400 under the flat jonokuchi roll).
  const paPkg = rollPotential({
    rng,
    rank: rollCeilingRank(rng),
    profile,
    developmentProfile: devProfileForRoll,
  });

  // Apply Prodigy bonus to stat ceilings
  if (isEmergentProdigy) applyProdigyBonus(paPkg);

  // Phase 5 Depth: Genetic Lineage
  const legacyTrait = world
    ? LegacyService.rollLegacyAncestry(world, { isAmateurStar: isEmergentProdigy }, rng)
    : null;

  if (legacyTrait) {
    paPkg.stats = LegacyService.applyLegacyTrait(paPkg.stats, legacyTrait);
  }

  const { origin, name, personId, nationality } = rollOriginIdentity(poolType, rng, id);

  // Amateur-star roll — drawn only for non-prodigies, preserving the single
  // conditional draw the previous inline roll consumed. `rng.next() < CHANCE`
  // yields the documented 80% tag rate; `> CHANCE` yielded ~20% (S7-42).
  const amateurStarTag = !isEmergentProdigy && rng.next() < AMATEUR_STAR_TAG_CHANCE;

  const schoolOrigin = rollSchoolOrigin(poolType, rng);
  const tsukedashi = rollTsukedashi(poolType, amateurStarTag, rng);

  // WS-1c — foreign recruits arrive older with proven ability: the
  // selection funnel is harsher, so survivors carry a PA floor and a
  // faster development track than domestic teens.
  if (poolType === "foreign") applyPaFloor(paPkg, FOREIGN_PA_FLOOR, FOREIGN_DEVSPEED_MULT);

  // WS-2 — a tsukedashi credential is earned quality, not a label:
  // national champions carry a combat-PA floor and a faster development
  // track, and the credential expires after TSUKEDASHI_EXPIRY_YEARS.
  let tsukedashiExpiryYear: number | undefined;
  if (tsukedashi) {
    applyPaFloor(paPkg, TSUKEDASHI_PA_FLOOR);
    paPkg.developmentSpeed = Math.max(paPkg.developmentSpeed, TSUKEDASHI_DEVSPEED_MIN);
    tsukedashiExpiryYear = currentYear + TSUKEDASHI_EXPIRY_YEARS;
  }

  return {
    candidateId: id,
    personId,
    name,
    nationality,
    // Foreign recruits debut at 18–22 (harsh selection funnel); domestic
    // candidates keep the standard teen band.
    birthYear:
      poolType === "foreign"
        ? currentYear - rng.int(FOREIGN_DEBUT_AGE_MIN, FOREIGN_DEBUT_AGE_MAX)
        : currentYear -
          (DEBUT_AGE_BASE +
            rng.int(
              0,
              poolType === "university" ? UNIVERSITY_BIRTH_YEAR_RANGE : OTHER_BIRTH_YEAR_RANGE
            )),
    originRegion: origin,
    schoolOrigin,

    visibilityBand: "hidden",
    availabilityState: "available",

    // Core combat stats (masked by visibility in UI)
    archetype,
    style: archetype === "oshi" ? "oshi" : archetype === "yotsu" ? "yotsu" : "hybrid",
    combatProfile: profile,

    reputationSeed: rng.int(REPUTATION_SEED_MIN, REPUTATION_SEED_MAX),
    heightPotentialCm: paPkg.heightCm,
    weightPotentialKg: paPkg.weightKg,
    talentSeed: rng.int(TALENT_SEED_MIN, TALENT_SEED_MAX),
    temperament: {
      discipline: rng.int(TEMPERAMENT_MIN, TEMPERAMENT_MAX),
      volatility: rng.int(TEMPERAMENT_MIN, TEMPERAMENT_MAX),
    },

    competingSuitors: [],
    tags: isEmergentProdigy ? ["prodigy"] : amateurStarTag ? ["amateur_star"] : [],
    isEmergentProdigy,
    // The flag its readers check (eventSurfacing, CandidatePoolPage) —
    // previously never set even when the tag landed (S7-43).
    isAmateurStar: amateurStarTag || undefined,
    tsukedashi,
    tsukedashiExpiryYear,
    // §5.3 — a small share of foreign-born recruits hold Japanese citizenship.
    dualCitizen: poolType === "foreign" ? rng.next() < DUAL_CITIZEN_RECRUIT_SHARE : undefined,

    potentialStats: {
      power: paPkg.stats.power,
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
    bustFraction: paPkg.bustFraction,
    bloodlineTrait: legacyTrait ?? undefined,
    // Generate deterministic scouting bias that skews initial stat readings
    scoutingBias: generateScoutingBias(id, currentYear),
    avatarConfig: generateAvatarIdentity({ seed: personId, nationality, role: "prospect" }),
  };
}

/** W H — domestic school programs: amateur recruits can carry a named
 * school that later produces schoolmate narrative + keiko links. */
/**
 * Roll the candidate's origin, shikona name, personId, and nationality from
 * the pool type — personId doubles as the avatar seed so the scout-card
 * face carries over unchanged when the candidate becomes a Rikishi.
 */
function rollOriginIdentity(
  poolType: TalentPoolType,
  rng: SeededRNG,
  id: string
): { origin: string; name: string; personId: string; nationality: string } {
  const origin =
    poolType === "foreign"
      ? rollForeignOrigin(rng)
      : seededPick(rng, [
          ...SUMO_HOTBEDS.filter((h) => h !== "Mongolia" && h !== "Georgia" && h !== "Egypt"),
          ...JAPANESE_PREFECTURES.slice(0, JAPANESE_PREFECTURES_COUNT),
        ]);
  const nationality = poolType === "foreign" ? origin : "Japan";
  const name = generateShikona(`${rng.seed}::candidate::${id}`, {
    rng,
    heyaId: undefined,
    nationality,
    rank: "jonokuchi",
    legacyShikona: undefined,
  });
  return { origin, name, personId: rng.uuid("PS"), nationality };
}

/**
 * Tsukedashi qualification: only amateur stars can hold credentials.
 * University-pool stars ≈ national university/corporate champions →
 * makushita tsukedashi; high-school stars ≈ national-title holders →
 * sandanme tsukedashi. Seeded, so the same candidate always qualifies.
 */
function rollTsukedashi(
  poolType: TalentPoolType,
  amateurStarTag: boolean,
  rng: SeededRNG
): TalentCandidate["tsukedashi"] {
  // Rare foreign sandanme-tsukedashi — the Kinbozan path (foreign amateur
  // champions can hold Sd credentials; makushita TD is never foreign).
  if (poolType === "foreign") {
    return rng.next() < FOREIGN_SDTD_CHANCE ? "sandanme" : undefined;
  }
  if (!amateurStarTag) return undefined;
  if (poolType === "university")
    return rng.next() < TSUKEDASHI_UNIVERSITY_SHARE ? "makushita" : undefined;
  if (poolType === "high_school") return rng.next() < TSUKEDASHI_HS_SHARE ? "sandanme" : undefined;
  return undefined;
}

function rollSchoolOrigin(poolType: TalentPoolType, rng: SeededRNG): string | undefined {
  if (
    (poolType === "high_school" || poolType === "university") &&
    rng.next() < SCHOOL_ORIGIN_CHANCE
  ) {
    return seededPick(rng, SUMO_SCHOOLS);
  }
  return undefined;
}
