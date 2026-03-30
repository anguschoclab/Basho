/**
 * InjuryService.ts — Logic for rolling and applying injuries.
 */

import { SeededRNG } from "../../rng";
import { WorldState } from "../../types/world";
import { Rikishi } from "../../types/rikishi";
import { SIMULATION_CONFIG } from "../../core/SimulationConfig";
import { clamp, clampInt } from "../../utils/math";
import { seededPick } from "../../utils/random";
import { 
  InjurySeverity, 
  InjuryBodyArea, 
  InjuryType, 
  getBaseWeeksOut,
  BODY_AREA_LABELS,
  INJURY_TYPE_LABELS
} from "./BodyDefinitions";

/**
 * Calculates a weekly injury chance for a rikishi.
 */
export function calculateWeeklyInjuryChance(rikishi: Rikishi, fatigue: number): number {
  const base = SIMULATION_CONFIG.injuries.weeklyBaseChance;
  const fatigueMult = 1 + clamp(fatigue, 0, 100) / 200;
  
  // Durability: using 'durability' property if it exists, default 60
  const durability = typeof rikishi.durability === "number" ? rikishi.durability : 60;
  const durabilityMult = clamp(1.35 - durability / 100, 0.6, 1.35);

  const chance = base * fatigueMult * durabilityMult;
  return clamp(chance, 0, SIMULATION_CONFIG.injuries.maxWeeklyChance);
}

/**
 * Rolls for a weekly injury. Returns injury details if successful.
 */
export function rollWeeklyInjury(args: {
  rng: SeededRNG;
  rikishi: Rikishi;
  fatigue: number;
}): { severity: InjurySeverity; area: InjuryBodyArea; type: InjuryType; weeksOut: number } | null {
  const { rng, rikishi, fatigue } = args;
  
  const chance = calculateWeeklyInjuryChance(rikishi, fatigue);
  if (rng.next() >= chance) return null;

  const sevRoll = rng.next();
  const severity: InjurySeverity = sevRoll < 0.72 ? "minor" : sevRoll < 0.95 ? "moderate" : "serious";
  
  const area = pickArea(rng);
  const type = pickType(rng, severity);
  const { min, max } = getBaseWeeksOut(severity, area, type);
  const weeksOut = clampInt(min + Math.floor(rng.next() * (max - min + 1)), 1, 26);

  return { severity, area, type, weeksOut };
}

function pickArea(rng: SeededRNG): InjuryBodyArea {
  const areas: InjuryBodyArea[] = ["knee", "ankle", "back", "shoulder", "elbow", "wrist", "hip", "rib", "neck", "other"];
  const weights = [0.18, 0.12, 0.12, 0.10, 0.08, 0.08, 0.08, 0.08, 0.06, 0.10];
  
  let r = rng.next();
  for (let i = 0; i < weights.length; i++) {
    if (r < weights[i]) return areas[i];
    r -= weights[i];
  }
  return "other";
}

function pickType(rng: SeededRNG, severity: InjurySeverity): InjuryType {
  const roll = rng.next();
  if (severity === "serious") {
    if (roll < 0.35) return "tear";
    if (roll < 0.65) return "fracture";
    return "nerve";
  }
  if (severity === "moderate") {
    if (roll < 0.35) return "sprain";
    if (roll < 0.70) return "strain";
    return "contusion";
  }
  return "inflammation"; // Default minor
}
