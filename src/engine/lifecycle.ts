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

// Body type physics behavior modifiers (5.1)
const BODY_TYPE_BEHAVIORS: Record<string, {
  pushVelocityBonus: number;
  lateralMovementBonus: number;
  beltTorqueBonus: number;
  tachiaiSpeedBonus: number;
}> = {
  tower: { pushVelocityBonus: 4, lateralMovementBonus: -2, beltTorqueBonus: -1, tachiaiSpeedBonus: 2 },
  barrel: { pushVelocityBonus: 1, lateralMovementBonus: -3, beltTorqueBonus: 5, tachiaiSpeedBonus: -1 },
  compact: { pushVelocityBonus: -1, lateralMovementBonus: 4, beltTorqueBonus: 2, tachiaiSpeedBonus: 4 },
  lanky: { pushVelocityBonus: 2, lateralMovementBonus: 3, beltTorqueBonus: -2, tachiaiSpeedBonus: 3 },
};

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
  if (age < 28) {
    // Check injury retirement — the only plausible path for young rikishi
    const hasCareerEndingInjury =
      rikishi.injured &&
      rikishi.injuryStatus?.severity === "serious" &&
      (rikishi.injuryWeeksRemaining ?? 0) > 20;

    if (hasCareerEndingInjury) {
      return "Career-Ending Injury";
    }

    // Block all non-injury retirements for rikishi under 28
    return null;
  }

  // 1. Mandatory Retirement
  if (age >= 45) return "Mandatory Age Retirement";

  // 1.5. Yokozuna Mandatory Retirement (earlier due to intense pressure)
  // Real sumo: Yokozuna often retire earlier due to the pressure of maintaining their status
  if (rikishi.rank === "yokozuna" && age >= 40) return "Yokozuna Mandatory Retirement";

  // 2. Injury Forced Retirement
  // Career-ending: serious injury (from weekly health phase) with >20 weeks remaining
  if (
    rikishi.injured &&
    rikishi.injuryStatus?.severity === "serious" &&
    (rikishi.injuryWeeksRemaining ?? 0) > 20
  ) {
    return "Career-Ending Injury";
  }

  // 3. Yokozuna Retirement Pressure (Council Recommendations)
  if (rikishi.rank === "yokozuna") {
    const warnings = rikishi.councilWarnings || 0;

    // 3.1 Council Warning Trigger (Binary)
    // 3 warnings = mandatory retirement
    if (warnings >= 3) return "Council Forced Retirement (Lack of Dignity)";

    // 3.2 Performance/Kyujo Pressure
    // Real sumo: Yokozuna who miss 3 consecutive basho or are consistently weak face pressure
    const isWeak = rikishi.consecutiveMakeKoshi && rikishi.consecutiveMakeKoshi >= 2;
    const isAbsentTooLong = (rikishi.consecutiveKyujo || 0) >= 3;

    if (isWeak || isAbsentTooLong) {
      // Base chance increases by 30% per warning level
      const pressureChance = 0.5 + warnings * 0.2;
      if (rng.bool(Math.min(0.95, pressureChance))) {
        return isAbsentTooLong
          ? "Yokozuna Chronic Injury Retirement"
          : "Yokozuna Performance Retirement";
      }
    }
  }

  // 4. Natural Aging Curve (Probability increases with age)
  const baseRetireChance = Math.max(0, (age - 34) * 0.1);
  const roll = rng.next();

  if (roll < baseRetireChance) {
    return "Age & Fatigue";
  }

  // 5. Performance Drop (Rank & Stat based)
  const isStagnant = rikishi.rank === "jonokuchi" && age > 28;
  const isWeak = (rikishi.stats?.power ?? 50) < 40 && age > 38;
  const isCriticallyWeak = (rikishi.stats?.power ?? 50) < 30 && age > 30;

  if (isStagnant || isWeak || isCriticallyWeak) {
    let retireProb = 0.1;
    if (isWeak) retireProb = 0.25;
    if (isCriticallyWeak) retireProb = 0.5;

    if (rng.bool(retireProb)) {
      return (rikishi.stats?.power ?? 50) < 35 ? "Diminishing Physicality" : "Lack of Performance";
    }
  }

  return null;
}

// --- REGENERATION (REPLACEMENT) LOGIC ---

const ORIGINS = [
  // --- Japanese Hotbeds ---
  {
    name: "Hokkaido",
    weightMod: 1.1,
    strMod: 1.05,
    description: "Land of giants and harsh winters.",
  },
  { name: "Aomori", weightMod: 1.0, strMod: 1.1, description: "Traditional sumo powerhouse." },
  {
    name: "Akita",
    weightMod: 1.0,
    techMod: 1.05,
    description: "Technical wrestlers from the north.",
  },
  { name: "Oita", weightMod: 1.05, speedMod: 1.05, description: "Dynamic and explosive style." },
  { name: "Tokyo", weightMod: 0.95, techMod: 1.15, description: "Urban perfectionists." },
  { name: "Osaka", weightMod: 1.05, mentalMod: 1.1, description: "Resilient and street-smart." },
  { name: "Fukuoka", weightMod: 1.02, strMod: 1.02, description: "Southern strength." },
  { name: "Kagoshima", weightMod: 1.05, strMod: 1.05, description: "Heavyweight islanders." },

  // --- International ---
  {
    name: "Mongolia",
    weightMod: 0.9,
    strMod: 1.25,
    mentalMod: 1.3,
    techMod: 1.1,
    description: "Masters of leverage and spirit.",
  },
  { name: "Georgia", weightMod: 1.15, strMod: 1.2, description: "Raw power from the Caucasus." },
  { name: "Egypt", weightMod: 1.1, strMod: 1.15, description: "Sturdy and relentless." },
  {
    name: "Brazil",
    weightMod: 1.0,
    speedMod: 1.15,
    techMod: 1.05,
    description: "Flexible and athletic.",
  },
  {
    name: "USA",
    weightMod: 1.2,
    strMod: 1.1,
    speedMod: 0.9,
    description: "Huge frames and collegiate power.",
  },

  // --- Academic Elite (Makushita Tsukedashi eligible) ---
  { name: "Nihon University", weightMod: 1.0, techMod: 1.4, mentalMod: 1.1, isElite: true },
  { name: "Nippon Sport Science Univ", weightMod: 1.05, stamMod: 1.3, techMod: 1.2, isElite: true },
  { name: "Kindai University", weightMod: 1.1, strMod: 1.1, techMod: 1.1, isElite: true },

  // --- General Prefectures (Fillers) ---
  { name: "Chiba", weightMod: 1.0, speedMod: 1.05 },
  { name: "Saitama", weightMod: 1.05, strMod: 1.0 },
  { name: "Kanagawa", weightMod: 0.98, techMod: 1.05 },
  { name: "Hyogo", weightMod: 1.02, mentalMod: 1.05 },
  { name: "Shizuoka", weightMod: 1.0, balanceMod: 1.1 },
  { name: "Hiroshima", weightMod: 1.0, mentalMod: 1.1 },
  { name: "Kyoto", weightMod: 0.9, techMod: 1.2 },
  { name: "Niigata", weightMod: 1.0, stamMod: 1.1 },
  { name: "Ishikawa", weightMod: 1.05, strMod: 1.05 },
];


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
  const rookieId = `rk_${currentYear}_${tmpRng.int(1000000, 9999999)}`;
  const rng = rngFromSeed(world.seed, "lifecycle", `rookie::${rookieId}`);

  const origin = ORIGINS[rng.int(0, ORIGINS.length - 1)];

  // Heya style influence (5.3): bias archetype based on heya training philosophy
  const heya = heyaId ? world.heyas.get(heyaId) : undefined;
  const archetype = rollArchetypeWithBias(rng, heya?.trainingPhilosophy);

  const isElite = origin.isElite || false;
  const age = rollAgeForRank(rng, isElite ? "makushita" : targetRank);

  const baseStat = isElite ? 40 : 20;
  const variance = 15;

  // Raw Stats
  const baseWeight = 100 + rng.next() * 60;
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
    experience: isElite ? 20 : 0,
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

  const rookieHeight = 175 + rng.next() * 20;
  const rookieWeight = stats.weight;
  // Body type diversity (5.1): derive from height/weight ratio
  const bmi = rookieWeight / Math.pow(rookieHeight / 100, 2);
  const bodyType: "tower" | "barrel" | "compact" | "lanky" =
    rookieHeight >= 185 && bmi < 30
      ? "tower"
      : rookieHeight < 180 && bmi >= 32
        ? "barrel"
        : rookieHeight < 180 && bmi < 28
          ? "compact"
          : rookieHeight >= 185 && bmi >= 30
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
    rankNumber: isElite ? 15 : 50,
    division: isElite ? "makushita" : "jonokuchi",
    side: "east",

    // Stats (canonical stats obj)
    stats: stats,
    fatigue: 0,

    height: rookieHeight,
    weight: rookieWeight,
    bodyType,
    backstory,

    momentum: 50,

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

    condition: 100,
    motivation: 50 + rng.next() * 50,
    behavior: {
      discipline: 60 + rng.int(0, 30),
      mediaSavvy: 30 + rng.int(0, 40),
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
