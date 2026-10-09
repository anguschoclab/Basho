/**
 * Rookie generation (extracted from the legacy lifecycle.ts flat file).
 * Creates new recruits with diverse origins and archetypes.
 */

import { rngFromSeed } from "../rng";
import type { Rikishi, RikishiStats } from "../types/rikishi";
import type { Rank } from "../types/banzuke";
import { generateShikona } from "../shikona";
import type { WorldState } from "../types/world";
import type { InjurySeverity } from "../systems/health/BodyDefinitions";
import { buildCombatProfile, deriveWeakAgainstStyles, rollArchetypeWithBias } from "../archetype";
import { rollAgeForRank } from "../systems/generation/CandidateStats";
import { isCollegeRecruit } from "../utils/identity";
import { applyPersonaAssignment } from "../systems/generation/PersonaAssignment";
import {
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
} from "../../constants/engine/career";

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
  const legacyShikona: string | undefined = undefined;
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
      []) as import("../types/rikishi").KimariteId[],
    weakAgainstStyles: deriveWeakAgainstStyles(archetype) as import("../types/rikishi").Style[],
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
