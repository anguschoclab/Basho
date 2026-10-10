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
import type { CombatArchetype } from "../types/combat";
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

  const stats = rollRookieStats(rng, isElite, origin);

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
  // Body type diversity (5.1): derive from height/weight ratio
  const bodyType = deriveRookieBodyType(rookieHeight, stats.weight);

  // Origin & backstory enrichment (5.2)
  const backstory = generateBackstory(origin.name, archetype, bodyType, rng);

  const rookie = buildRookieEntity({
    rng,
    rookieId,
    shikona,
    origin,
    isElite,
    targetRank,
    currentYear,
    age,
    stats,
    rookieHeight,
    bodyType,
    backstory,
    archetype,
  });

  applyPersonaAssignment(rookie, archetype, rng);

  return rookie;
}

type RookieOrigin = (typeof ORIGINS)[number];

/** Raw stat rolls plus origin modifiers (RNG order: weight → stat rolls). */
function rollRookieStats(
  rng: ReturnType<typeof rngFromSeed>,
  isElite: boolean,
  origin: RookieOrigin
): RikishiStats {
  const baseStat = isElite ? ROOKIE_BASE_STAT_ELITE : ROOKIE_BASE_STAT_NORMAL;
  const variance = ROOKIE_STAT_VARIANCE;

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

  return stats;
}

/** Derives body type from the height/weight BMI ratio (5.1). */
function deriveRookieBodyType(
  rookieHeight: number,
  rookieWeight: number
): "tower" | "barrel" | "compact" | "lanky" {
  const bmi = rookieWeight / Math.pow(rookieHeight / 100, 2);
  return rookieHeight >= ROOKIE_TALL_HEIGHT_THRESHOLD && bmi < ROOKIE_BMI_TOWER_THRESHOLD
    ? "tower"
    : rookieHeight < ROOKIE_SHORT_HEIGHT_THRESHOLD && bmi >= ROOKIE_BMI_BARREL_THRESHOLD
      ? "barrel"
      : rookieHeight < ROOKIE_SHORT_HEIGHT_THRESHOLD && bmi < ROOKIE_BMI_COMPACT_THRESHOLD
        ? "compact"
        : rookieHeight >= ROOKIE_TALL_HEIGHT_THRESHOLD && bmi >= ROOKIE_BMI_TOWER_THRESHOLD
          ? "barrel"
          : "lanky";
}

/** Assembles the Rikishi entity literal (motivation/behavior rolls consume rng). */
function buildRookieEntity(p: {
  rng: ReturnType<typeof rngFromSeed>;
  rookieId: string;
  shikona: string;
  origin: RookieOrigin;
  isElite: boolean;
  targetRank: Rank;
  currentYear: number;
  age: number;
  stats: RikishiStats;
  rookieHeight: number;
  bodyType: "tower" | "barrel" | "compact" | "lanky";
  backstory: string;
  archetype: CombatArchetype;
}): Rikishi {
  return {
    id: p.rookieId,
    name: p.shikona,
    shikona: p.shikona,
    heyaId: "scout_pool",
    nationality: isCollegeRecruit({ origin: p.origin.name }) ? "Japan" : p.origin.name,
    birthYear: p.currentYear - p.age,
    origin: p.origin.name,

    // Rank
    rank: p.isElite ? "makushita" : p.targetRank,
    rankNumber: p.isElite ? ROOKIE_ELITE_RANK_NUMBER : ROOKIE_NORMAL_RANK_NUMBER,
    division: p.isElite ? "makushita" : "jonokuchi",
    side: "east",

    // Stats (canonical stats obj)
    stats: p.stats,
    fatigue: 0,

    height: p.rookieHeight,
    weight: p.stats.weight,
    bodyType: p.bodyType,
    backstory: p.backstory,

    momentum: ROOKIE_INITIAL_MOMENTUM,

    archetypeEvidence: {
      push: { success: 0, fail: 0 },
      grapple: { success: 0, fail: 0 },
      evade: { success: 0, fail: 0 },
    },

    // Style
    style: p.archetype === "oshi" ? "oshi" : p.archetype === "yotsu" ? "yotsu" : "hybrid",
    combatProfile: {
      ...buildCombatProfile(p.archetype),
      bodyTypeBehavior: BODY_TYPE_BEHAVIORS[p.bodyType] ?? BODY_TYPE_BEHAVIORS.lanky,
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
    motivation: ROOKIE_MOTIVATION_BASE + p.rng.next() * ROOKIE_MOTIVATION_RANGE,
    behavior: {
      discipline: ROOKIE_DISCIPLINE_BASE + p.rng.int(0, ROOKIE_DISCIPLINE_RANGE),
      mediaSavvy: ROOKIE_MEDIA_SAVVY_BASE + p.rng.int(0, ROOKIE_MEDIA_SAVVY_RANGE),
      stress: 0,
    },
    personalityTraits: [],
    favoredKimarite: (buildCombatProfile(p.archetype).favoredKimarite ??
      []) as import("../types/rikishi").KimariteId[],
    weakAgainstStyles: deriveWeakAgainstStyles(p.archetype) as import("../types/rikishi").Style[],
    // Required Rikishi fields for career tracking
    consecutiveYusho: 0,
    careerHistory: [],
    milestones: [],
    heyaHistory: [],
    lineage: {},
  } as Rikishi;
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
