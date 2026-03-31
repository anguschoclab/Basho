/**
 * File Name: src/engine/lifecycle.ts
 * Notes:
 * - Implements Retirement logic based on Age, Injury, and Rank performance.
 * - Implements Regeneration logic to create new recruits with diverse origins and archetypes.
 * - Uses high-fidelity types for recruit generation.
 */

import { rngFromSeed } from "./rng";
import { Rikishi, RikishiStats } from "./types/rikishi";
import { Rank } from "./types/banzuke";
import { CombatArchetype } from "./types/combat";
import { WorldState } from "./types/world";
import { generateRikishiName } from "./shikona";
import { rollArchetype, buildCombatProfile } from "./archetype";

// --- RETIREMENT LOGIC ---

/**
 * Check retirement.
 *  * @param rikishi - The Rikishi.
 *  * @param currentYear - The Current year.
 *  * @param seed - The Seed.
 *  * @returns The result.
 */
export function checkRetirement(rikishi: Rikishi, currentYear: number, seed: string): string | null {
  const rng = rngFromSeed(seed, "lifecycle", `retirement::${rikishi.id}`);
  const age = currentYear - rikishi.birthYear;
  
  // 1. Mandatory Retirement
  if (age >= 45) return "Mandatory Age Retirement";

  // 2. Injury Forced Retirement
  const severity = typeof rikishi.injuryStatus?.severity === "number" 
    ? rikishi.injuryStatus.severity 
    : 0;
  if (rikishi.injuryStatus?.isInjured && severity > 90) {
    return "Career-Ending Injury";
  }

  // 3. Natural Aging Curve (Probability increases with age)
  const baseRetireChance = Math.max(0, (age - 34) * 0.05);
  const roll = rng.next();

  if (roll < baseRetireChance) {
    return "Age & Fatigue";
  }

  // 4. Performance Drop (Rank-based)
  if (rikishi.rank === "jonokuchi" && age > 25) {
    if (rng.bool(0.3)) return "Lack of Performance";
  }

  return null;
}

// --- REGENERATION (REPLACEMENT) LOGIC ---

const ORIGINS = [
  { name: "Hokkaido", weightMod: 1.05, strMod: 1.0 },
  { name: "Tokyo", weightMod: 0.95, techMod: 1.1 },
  { name: "Aomori", weightMod: 1.0, strMod: 1.05 },
  { name: "Mongolia", weightMod: 0.9, strMod: 1.2, mentalMod: 1.2 }, 
  { name: "Georgia", weightMod: 1.1, strMod: 1.1 },
  { name: "Brazil", weightMod: 1.0, techMod: 0.9, speedMod: 1.1 },
  { name: "Nihon University", weightMod: 1.0, techMod: 1.3, isElite: true },
  { name: "Nippon Sport Science Univ", weightMod: 1.05, stamMod: 1.2, isElite: true },
];

const ARCHETYPES: CombatArchetype[] = [
  "oshi", "yotsu", "speedster", 
  "trickster", "hybrid", "giant"
];

/**
 * Generate rookie.
 *  * @param world - The World.
 *  * @param currentYear - The Current year.
 *  * @param targetRank - The Target rank.
 *  * @returns The result.
 */
function generateRookie(world: WorldState, currentYear: number, targetRank: Rank = "jonokuchi"): Rikishi {
  const count = world.rikishi.size;
  const tmpRng = rngFromSeed(world.seed, "lifecycle", `rookie_${currentYear}_${count}`);
  const rookieId = `rk_${currentYear}_${tmpRng.int(1000000, 9999999)}`;
  const rng = rngFromSeed(world.seed, "lifecycle", `rookie::${rookieId}`);
  
  const origin = ORIGINS[rng.int(0, ORIGINS.length - 1)];
  const archetype = ARCHETYPES[rng.int(0, ARCHETYPES.length - 1)];
  
  const isElite = origin.isElite || false;
  const age = isElite ? 22 : 15 + rng.int(0, 2); 

  const baseStat = isElite ? 40 : 20;
  const variance = 15;

  // Raw Stats
  const baseWeight = 100 + rng.next() * 60;
  const stats: RikishiStats = {
    strength: baseStat + rng.next() * variance,
    technique: baseStat + rng.next() * variance,
    speed: baseStat + rng.next() * variance,
    weight: baseWeight,
    stamina: baseStat + rng.next() * variance,
    mental: baseStat + rng.next() * variance,
    adaptability: baseStat + rng.next() * variance,
    balance: baseStat + rng.next() * variance,
  };

  // Apply Origin Modifiers
  if (origin.strMod) stats.strength *= origin.strMod;
  if (origin.techMod) stats.technique *= origin.techMod;
  if (origin.speedMod) stats.speed *= origin.speedMod;
  if (origin.weightMod) stats.weight *= origin.weightMod;

  const shikona = generateRikishiName(`${world.seed}::rookie::${rookieId}`);

  return {
    id: rookieId,
    name: shikona, 
    shikona: shikona,
    heyaId: "scout_pool",
    nationality: origin.name.includes("University") ? "Japan" : origin.name,
    birthYear: currentYear - age,
    origin: origin.name,
    
    // Rank
    rank: isElite ? "makushita" : targetRank,
    rankNumber: isElite ? 15 : 50,
    division: isElite ? "makushita" : "jonokuchi",
    side: "east",

    // Stats (flattened accessors + stats obj)
    stats: stats,
    power: stats.strength,
    speed: stats.speed,
    balance: stats.balance,
    technique: stats.technique,
    aggression: stats.mental,
    experience: isElite ? 20 : 0,
    adaptability: stats.adaptability,
    fatigue: 0,
    
    height: 175 + rng.next() * 20,
    weight: stats.weight,
    
    momentum: 50,
    stamina: stats.stamina,

    tacticalArchetypePrimary: archetype,
    archetypeEvidence: [],
    
    // Style
    style: archetype === "oshi" ? "oshi" : archetype === "yotsu" ? "yotsu" : "hybrid",
    archetype: archetype,
    derivedArchetype: archetype,
    combatProfile: buildCombatProfile(archetype),
    
    careerWins: 0,
    careerLosses: 0,
    currentBashoWins: 0,
    currentBashoLosses: 0,
    
    careerRecord: { wins: 0, losses: 0, yusho: 0 },
    currentBashoRecord: { wins: 0, losses: 0 },
    history: [],
    h2h: {},
    
    injuryStatus: { 
      type: "none",
      isInjured: false, 
      severity: 0, 
      location: "", 
      weeksRemaining: 0,
      weeksToHeal: 0 
    },
    injured: false,
    injuryWeeksRemaining: 0,
    
    condition: 100,
    motivation: 50 + rng.next() * 50,
    behavior: {
      discipline: 60 + rng.int(0, 30),
      mediaSavvy: 30 + rng.int(0, 40),
      stress: 0
    },
    personalityTraits: [],
    favoredKimarite: [],
    weakAgainstStyles: [],
    // Required Rikishi fields for career tracking
    makuuchiWins: 0,
    consecutiveYusho: 0,
    careerHistory: [],
    milestones: [],
  };
}
