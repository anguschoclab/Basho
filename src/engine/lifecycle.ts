/**
 * File Name: src/engine/lifecycle.ts
 * Notes:
 * - Implements Retirement logic based on Age, Injury, and Rank performance.
 * - Implements Regeneration logic to create new recruits with diverse origins and archetypes.
 * - Uses high-fidelity types for recruit generation.
 */

import { rngFromSeed } from "./rng";
import type { Rikishi, RikishiStats } from "./types/rikishi";
import type { Rank } from "./types/banzuke";
import { generateShikona } from "./shikona";
import type { WorldState } from "./types/world";
import type { InjurySeverity } from "./systems/health/BodyDefinitions";
import { buildCombatProfile, deriveWeakAgainstStyles, rollArchetypeWithBias } from "./archetype";
import { rollAgeForRank } from "./systems/generation/CandidateStats";
import { isCollegeRecruit } from "./utils/identity";
import { applyPersonaAssignment } from "./systems/generation/PersonaAssignment";
import {
  RETIREMENT_MIN_AGE,
  RETIREMENT_MANDATORY_AGE,
  RETIREMENT_YOKOZUNA_MANDATORY_AGE,
  RETIREMENT_NATURAL_AGE_START,
  RETIREMENT_STAGNANT_AGE,
  RETIREMENT_WEAK_AGE,
  RETIREMENT_CRITICAL_WEAK_AGE,
  RETIREMENT_INJURY_WEEKS_THRESHOLD,
  RETIREMENT_COUNCIL_WARNINGS_FORCED,
  RETIREMENT_CONSECUTIVE_MAKE_KOSHI_WEAK,
  RETIREMENT_CONSECUTIVE_KYUJO_TOO_LONG,
  RETIREMENT_PRESSURE_BASE,
  RETIREMENT_PRESSURE_PER_WARNING,
  RETIREMENT_PRESSURE_MAX,
  RETIREMENT_NATURAL_RATE_PER_YEAR,
  RETIREMENT_PROB_STAGNANT,
  RETIREMENT_PROB_WEAK,
  RETIREMENT_PROB_CRITICAL,
  RETIREMENT_STAT_WEAK_POWER,
  RETIREMENT_STAT_CRITICAL_POWER,
  RETIREMENT_STAT_DIMINISHING_POWER,
  RETIREMENT_DEFAULT_POWER,
  ROOKIE_ID_MIN,
  ROOKIE_ID_MAX,
  ROOKIE_BASE_STAT_ELITE,
  ROOKIE_BASE_STAT_NORMAL,
  ROOKIE_STAT_VARIANCE,
  ROOKIE_BASE_WEIGHT,
  ROOKIE_WEIGHT_RANGE,
  ROOKIE_ELITE_EXPERIENCE,
  ROOKIE_BASE_HEIGHT,
  ROOKIE_HEIGHT_RANGE,
  ROOKIE_TALL_HEIGHT_THRESHOLD,
  ROOKIE_SHORT_HEIGHT_THRESHOLD,
  ROOKIE_BMI_TOWER_THRESHOLD,
  ROOKIE_BMI_BARREL_THRESHOLD,
  ROOKIE_BMI_COMPACT_THRESHOLD,
  ROOKIE_ELITE_RANK_NUMBER,
  ROOKIE_NORMAL_RANK_NUMBER,
  ROOKIE_INITIAL_MOMENTUM,
  ROOKIE_INITIAL_CONDITION,
  ROOKIE_MOTIVATION_BASE,
  ROOKIE_MOTIVATION_RANGE,
  ROOKIE_DISCIPLINE_BASE,
  ROOKIE_DISCIPLINE_RANGE,
  ROOKIE_MEDIA_SAVVY_BASE,
  ROOKIE_MEDIA_SAVVY_RANGE,
  BODY_TYPE_BEHAVIORS,
  ORIGINS,
} from "../constants/engine/career";

// --- RETIREMENT LOGIC ---

/**
 * Evaluates whether a rikishi should retire based on age, injuries, rank pressure, and performance.
 * Implements mandatory retirement at age 45 and Yokozuna-specific retirement rules.
 *
 * @param {Rikishi} rikishi - The rikishi to evaluate.
 * @param {number} currentYear - The current simulation year.
 * @param {string} seed - Seed for deterministic random generation.
 * @returns {string | null} A string describing the retirement reason, or null if the rikishi continues their career.
 */
export function checkRetirement(
  rikishi: Rikishi,
  currentYear: number,
  seed: string
): string | null {
  const rng = rngFromSeed(seed, "lifecycle", `retirement::${rikishi.id}`);
  const age = currentYear - rikishi.birthYear;

  // Defensive: block impossible young retirements
  if (age < RETIREMENT_MIN_AGE) {
    // Check injury retirement — the only plausible path for young rikishi
    const hasCareerEndingInjury =
      rikishi.injured &&
      rikishi.injuryStatus?.severity === "serious" &&
      (rikishi.injuryWeeksRemaining ?? 0) > RETIREMENT_INJURY_WEEKS_THRESHOLD;

    if (hasCareerEndingInjury) {
      return "Career-Ending Injury";
    }

    // Block all non-injury retirements for rikishi under 28
    return null;
  }

  // 1. Mandatory Retirement
  if (age >= RETIREMENT_MANDATORY_AGE) return "Mandatory Age Retirement";

  // 1.5. Yokozuna Mandatory Retirement (earlier due to intense pressure)
  // Real sumo: Yokozuna often retire earlier due to the pressure of maintaining their status
  if (rikishi.rank === "yokozuna" && age >= RETIREMENT_YOKOZUNA_MANDATORY_AGE)
    return "Yokozuna Mandatory Retirement";

  // 2. Injury Forced Retirement
  // Career-ending: serious injury (from weekly health phase) with >20 weeks remaining
  if (
    rikishi.injured &&
    rikishi.injuryStatus?.severity === "serious" &&
    (rikishi.injuryWeeksRemaining ?? 0) > RETIREMENT_INJURY_WEEKS_THRESHOLD
  ) {
    return "Career-Ending Injury";
  }

  // 3. Yokozuna Retirement Pressure (Council Recommendations)
  if (rikishi.rank === "yokozuna") {
    const warnings = rikishi.councilWarnings || 0;

    // 3.1 Council Warning Trigger (Binary)
    // 3 warnings = mandatory retirement
    if (warnings >= RETIREMENT_COUNCIL_WARNINGS_FORCED)
      return "Council Forced Retirement (Lack of Dignity)";

    // 3.2 Performance/Kyujo Pressure
    // Real sumo: Yokozuna who miss 3 consecutive basho or are consistently weak face pressure
    const isWeak =
      rikishi.consecutiveMakeKoshi &&
      rikishi.consecutiveMakeKoshi >= RETIREMENT_CONSECUTIVE_MAKE_KOSHI_WEAK;
    const isAbsentTooLong =
      (rikishi.consecutiveKyujo || 0) >= RETIREMENT_CONSECUTIVE_KYUJO_TOO_LONG;

    if (isWeak || isAbsentTooLong) {
      // Base chance increases by 30% per warning level
      const pressureChance = RETIREMENT_PRESSURE_BASE + warnings * RETIREMENT_PRESSURE_PER_WARNING;
      if (rng.bool(Math.min(RETIREMENT_PRESSURE_MAX, pressureChance))) {
        return isAbsentTooLong
          ? "Yokozuna Chronic Injury Retirement"
          : "Yokozuna Performance Retirement";
      }
    }
  }

  // 4. Natural Aging Curve (Probability increases with age)
  const baseRetireChance = Math.max(
    0,
    (age - RETIREMENT_NATURAL_AGE_START) * RETIREMENT_NATURAL_RATE_PER_YEAR
  );
  const roll = rng.next();

  if (roll < baseRetireChance) {
    return "Age & Fatigue";
  }

  // 5. Performance Drop (Rank & Stat based)
  const isStagnant = rikishi.rank === "jonokuchi" && age > RETIREMENT_STAGNANT_AGE;
  const isWeak =
    (rikishi.stats?.power ?? RETIREMENT_DEFAULT_POWER) < RETIREMENT_STAT_WEAK_POWER &&
    age > RETIREMENT_WEAK_AGE;
  const isCriticallyWeak =
    (rikishi.stats?.power ?? RETIREMENT_DEFAULT_POWER) < RETIREMENT_STAT_CRITICAL_POWER &&
    age > RETIREMENT_CRITICAL_WEAK_AGE;

  if (isStagnant || isWeak || isCriticallyWeak) {
    let retireProb = RETIREMENT_PROB_STAGNANT;
    if (isWeak) retireProb = RETIREMENT_PROB_WEAK;
    if (isCriticallyWeak) retireProb = RETIREMENT_PROB_CRITICAL;

    if (rng.bool(retireProb)) {
      return (rikishi.stats?.power ?? RETIREMENT_DEFAULT_POWER) < RETIREMENT_STAT_DIMINISHING_POWER
        ? "Diminishing Physicality"
        : "Lack of Performance";
    }
  }

  return null;
}

// --- REGENERATION (REPLACEMENT) LOGIC ---

/**
 * Internal function to generate a new rookie rikishi.
 * Determines origin, archetype, stats, and initial rank.
 * Academic elite (university) recruits start at a higher rank (Makushita Tsukedashi).
 *
 * @param {WorldState} world - The current world state.
 * @param {number} currentYear - The current simulation year.
 * @param {Rank} [targetRank="jonokuchi"] - The rank to assign (defaults to "jonokuchi").
 * @returns {Rikishi} A fully initialized Rikishi object.
 */
export function _generateRookie(
  world: WorldState,
  currentYear: number,
  targetRank: Rank = "jonokuchi",
  heyaId?: string
): Rikishi {
  const count = world.rikishi.size;
  const tmpRng = rngFromSeed(world.seed, "lifecycle", `rookie_${currentYear}_${count}`);
  const rookieId = `rk_${currentYear}_${tmpRng.int(ROOKIE_ID_MIN, ROOKIE_ID_MAX)}`;
  const rng = rngFromSeed(world.seed, "lifecycle", `rookie::${rookieId}`);

  const origin = ORIGINS[rng.int(0, ORIGINS.length - 1)];

  // Heya style influence (5.3): bias archetype based on heya training philosophy
  const heya = heyaId ? world.heyas.get(heyaId) : undefined;
  const archetype = rollArchetypeWithBias(rng, heya?.trainingPhilosophy);

  const isElite = origin.isElite || false;
  const age = rollAgeForRank(rng, isElite ? "makushita" : targetRank);

  const baseStat = isElite ? ROOKIE_BASE_STAT_ELITE : ROOKIE_BASE_STAT_NORMAL;
  const variance = ROOKIE_STAT_VARIANCE;

  // Raw Stats
  const baseWeight = ROOKIE_BASE_WEIGHT + rng.next() * ROOKIE_WEIGHT_RANGE;
  const stats: RikishiStats = {
    power: baseStat + rng.next() * variance,
    technique: baseStat + rng.next() * variance,
    speed: baseStat + rng.next() * variance,
    weight: baseWeight,
    stamina: baseStat + rng.next() * variance,
    mental: baseStat + rng.next() * variance,
    adaptability: baseStat + rng.next() * variance,
    balance: baseStat + rng.next() * variance,
    aggression: baseStat + rng.next() * variance,
    experience: isElite ? ROOKIE_ELITE_EXPERIENCE : 0,
  };

  // Apply Origin Modifiers
  if (origin.strMod) stats.power *= origin.strMod;
  if (origin.techMod) stats.technique *= origin.techMod;
  if (origin.speedMod) stats.speed *= origin.speedMod;
  if (origin.weightMod) stats.weight *= origin.weightMod;
  if (origin.stamMod) stats.stamina *= origin.stamMod;
  if (origin.mentalMod) stats.mental *= origin.mentalMod;
  if (origin.balanceMod) stats.balance *= origin.balanceMod;

  // Get oyakata's former shikona for legacy patterns if assigned to a heya
  let legacyShikona: string | undefined;
  // Note: generateRookie creates rikishi in scout pool, so no heya assignment yet
  // Legacy shikona will be applied when they join a stable

  const shikona = generateShikona(`${world.seed}::rookie::${rookieId}`, {
    rng,
    nationality: isCollegeRecruit({ origin: origin.name }) ? "Japan" : origin.name,
    rank: targetRank,
    legacyShikona,
  });

  const rookieHeight = ROOKIE_BASE_HEIGHT + rng.next() * ROOKIE_HEIGHT_RANGE;
  const rookieWeight = stats.weight;
  // Body type diversity (5.1): derive from height/weight ratio
  const bmi = rookieWeight / Math.pow(rookieHeight / 100, 2);
  const bodyType: "tower" | "barrel" | "compact" | "lanky" =
    rookieHeight >= ROOKIE_TALL_HEIGHT_THRESHOLD && bmi < ROOKIE_BMI_TOWER_THRESHOLD
      ? "tower"
      : rookieHeight < ROOKIE_SHORT_HEIGHT_THRESHOLD && bmi >= ROOKIE_BMI_BARREL_THRESHOLD
        ? "barrel"
        : rookieHeight < ROOKIE_SHORT_HEIGHT_THRESHOLD && bmi < ROOKIE_BMI_COMPACT_THRESHOLD
          ? "compact"
          : rookieHeight >= ROOKIE_TALL_HEIGHT_THRESHOLD && bmi >= ROOKIE_BMI_TOWER_THRESHOLD
            ? "barrel"
            : "lanky";

  // Origin & backstory enrichment (5.2)
  const backstory = generateBackstory(origin.name, archetype, bodyType, rng);

  const rookie: Rikishi = {
    id: rookieId,
    name: shikona,
    shikona: shikona,
    heyaId: "scout_pool",
    nationality: isCollegeRecruit({ origin: origin.name }) ? "Japan" : origin.name,
    birthYear: currentYear - age,
    origin: origin.name,

    // Rank
    rank: isElite ? "makushita" : targetRank,
    rankNumber: isElite ? ROOKIE_ELITE_RANK_NUMBER : ROOKIE_NORMAL_RANK_NUMBER,
    division: isElite ? "makushita" : "jonokuchi",
    side: "east",

    // Stats (canonical stats obj)
    stats: stats,
    fatigue: 0,

    height: rookieHeight,
    weight: rookieWeight,
    bodyType,
    backstory,

    momentum: ROOKIE_INITIAL_MOMENTUM,

    archetypeEvidence: {
      push: { success: 0, fail: 0 },
      grapple: { success: 0, fail: 0 },
      evade: { success: 0, fail: 0 },
    },

    // Style
    style: archetype === "oshi" ? "oshi" : archetype === "yotsu" ? "yotsu" : "hybrid",
    combatProfile: {
      ...buildCombatProfile(archetype),
      bodyTypeBehavior: BODY_TYPE_BEHAVIORS[bodyType] ?? BODY_TYPE_BEHAVIORS.lanky,
    },

    careerWins: 0,
    careerLosses: 0,
    careerAbsences: 0,
    makuuchiWins: 0,
    divisionRecords: {
      makuuchi: { wins: 0, losses: 0 },
      juryo: { wins: 0, losses: 0 },
      makushita: { wins: 0, losses: 0 },
      sandanme: { wins: 0, losses: 0 },
      jonidan: { wins: 0, losses: 0 },
      jonokuchi: { wins: 0, losses: 0 },
    },
    currentBashoWins: 0,
    currentBashoLosses: 0,

    careerRecord: { wins: 0, losses: 0, yusho: 0 },
    currentBashoRecord: { wins: 0, losses: 0 },
    history: [],
    h2h: {},

    injuryStatus: {
      type: "none",
      isInjured: false,
      severity: "none" as InjurySeverity,
      location: undefined,
      weeksRemaining: 0,
      weeksToHeal: 0,
    },
    injured: false,
    injuryWeeksRemaining: 0,
    isKyujo: false,
    kyujoReason: undefined,
    medicalCertificate: undefined,

    condition: ROOKIE_INITIAL_CONDITION,
    motivation: ROOKIE_MOTIVATION_BASE + rng.next() * ROOKIE_MOTIVATION_RANGE,
    behavior: {
      discipline: ROOKIE_DISCIPLINE_BASE + rng.int(0, ROOKIE_DISCIPLINE_RANGE),
      mediaSavvy: ROOKIE_MEDIA_SAVVY_BASE + rng.int(0, ROOKIE_MEDIA_SAVVY_RANGE),
      stress: 0,
    },
    personalityTraits: [],
    favoredKimarite: (buildCombatProfile(archetype).favoredKimarite ??
      []) as import("./types/rikishi").KimariteId[],
    weakAgainstStyles: deriveWeakAgainstStyles(archetype) as import("./types/rikishi").Style[],
    // Required Rikishi fields for career tracking
    consecutiveYusho: 0,
    careerHistory: [],
    milestones: [],
    heyaHistory: [],
    lineage: {},
  } as Rikishi;

  applyPersonaAssignment(rookie, archetype, rng);

  return rookie;
}

/**
 * Generates a backstory string for a rookie rikishi based on origin, archetype, and body type (5.2).
 */
function generateBackstory(
  origin: string,
  archetype: string,
  bodyType: string,
  rng: ReturnType<typeof rngFromSeed>
): string {
  const archetypeLabels: Record<string, string> = {
    oshi: "a relentless pusher",
    yotsu: "a belt specialist",
    trickster: "a crafty trickster",
    speedster: "a lightning-fast mover",
    hybrid: "a versatile all-rounder",
    giant: "an imposing giant",
    tsuppari: "a fierce tsuppari attacker",
    defensive: "a patient counter-wrestler",
  };
  const bodyLabels: Record<string, string> = {
    tower: "tall and imposing",
    barrel: "stocky and powerful",
    compact: "compact and agile",
    lanky: "lean and wiry",
  };
  const archLabel = archetypeLabels[archetype] ?? "a determined wrestler";
  const bodyLabel = bodyLabels[bodyType] ?? "uniquely built";
  const templates = [
    `Hailing from ${origin}, this ${bodyLabel} rikishi is known as ${archLabel}.`,
    `A ${bodyLabel} competitor from ${origin}, trained to become ${archLabel}.`,
    `From ${origin} comes a ${bodyLabel} hopeful, fighting as ${archLabel}.`,
    `Born in ${origin}, this ${bodyLabel} wrestler developed into ${archLabel} through years of dedication.`,
  ];
  return templates[Math.floor(rng.next() * templates.length)];
}
