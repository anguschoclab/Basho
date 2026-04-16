/**
 * Avatar Generator
 * Deterministic procedural avatar generation for sumo wrestlers.
 */

import { SeededRNG } from "./rng";
import {
  AvatarConfig,
  AvatarGenerationParams,
  NATIONALITY_SKIN_TONES,
  HAIR_COLORS,
} from "./types/avatar";
import type { Division } from "./types/banzuke";

/**
 * Generate a complete avatar configuration from parameters.
 */
export function generateAvatarConfig(params: AvatarGenerationParams): AvatarConfig {
  const { seed, nationality, age, isSekitori, isRetired, isOyakata } = params;
  const rng = new SeededRNG(seed);

  const natKey = nationality.toLowerCase();
  const skinToneData = NATIONALITY_SKIN_TONES[natKey] ?? NATIONALITY_SKIN_TONES.japan;

  // Use skin tone range for variety
  const skinTone = skinToneData.range
    ? rng.pick([skinToneData.range[0], skinToneData.base, skinToneData.range[1]])
    : skinToneData.base;

  // Determine age stage
  let ageStage: AvatarConfig["ageStage"];
  if (age < 20) ageStage = "teen";
  else if (age < 25) ageStage = "young";
  else if (age < 35) ageStage = "prime";
  else if (age < 45) ageStage = "veteran";
  else ageStage = "elder";

  // Calculate aging effects
  const wrinkles = calculateWrinkles(age, rng);
  const hairGraying = calculateHairGraying(age, rng);

  // Determine hairstyle
  let hairstyle: AvatarConfig["hairstyle"];
  if (isOyakata) hairstyle = "oyakata";
  else if (isRetired) hairstyle = "retired";
  else if (isSekitori) hairstyle = "oichomage";
  else hairstyle = "chonmage";

  // Determine hair color based on graying
  const hairColor = hairGraying > 50 ? HAIR_COLORS.gray : HAIR_COLORS.black;

  // Generate distinctive marks (low probability)
  let distinctiveMark: AvatarConfig["distinctiveMark"] = "none";
  if (rng.next() < 0.08) {
    distinctiveMark = rng.pick(["scar", "mole", "freckles"]);
  }

  // Generate facial hair for retired/oyakata only
  let facialHair: AvatarConfig["facialHair"] = "none";
  if (isRetired || isOyakata) {
    if (rng.next() < 0.3) {
      facialHair = rng.pick(["mustache", "goatee", "full-beard"]);
    }
  }

  return {
    seed,
    faceShape: rng.pick(["round", "oval", "square", "broad"]),
    eyeType: rng.pick(["standard", "narrow", "wide"]),
    eyeAngle: rng.pick(["level", "slanted-up", "slanted-down"]),
    eyeSpacing: rng.pick(["close", "normal", "wide"]),
    browType: rng.pick(["straight", "furrowed", "arched"]),
    noseType: rng.pick(["small", "medium", "broad"]),
    mouthType: rng.pick(["neutral", "smile", "determined"]),
    earSize: rng.pick(["small", "medium", "large"]),
    skinTone,
    skinToneKey: (natKey as AvatarConfig["skinToneKey"]) ?? "japan",
    hairColor,
    hairGraying,
    hairstyle,
    expression: "neutral",
    ageStage,
    wrinkles,
    facialHair,
    distinctiveMark,
  };
}

/**
 * Update avatar configuration for aging.
 */
export function updateAvatarForAging(config: AvatarConfig, newAge: number): AvatarConfig {
  let ageStage: AvatarConfig["ageStage"];
  if (newAge < 20) ageStage = "teen";
  else if (newAge < 25) ageStage = "young";
  else if (newAge < 35) ageStage = "prime";
  else if (newAge < 45) ageStage = "veteran";
  else ageStage = "elder";

  const rng = new SeededRNG(config.seed + "_age_" + newAge);
  const wrinkles = calculateWrinkles(newAge, rng);
  const hairGraying = calculateHairGraying(newAge, rng);

  const hairColor = hairGraying > 50 ? HAIR_COLORS.gray : HAIR_COLORS.black;

  return {
    ...config,
    ageStage,
    wrinkles,
    hairGraying,
    hairColor,
    // Preserve new fields
    eyeAngle: config.eyeAngle,
    eyeSpacing: config.eyeSpacing,
    earSize: config.earSize,
    facialHair: config.facialHair,
    distinctiveMark: config.distinctiveMark,
  };
}

/**
 * Update hairstyle based on sekitori promotion/demotion.
 */
export function updateHairstyleForPromotion(
  config: AvatarConfig,
  isSekitori: boolean
): AvatarConfig {
  // Don't change retired or oyakata hairstyles
  if (config.hairstyle === "retired" || config.hairstyle === "oyakata") {
    return config;
  }

  return {
    ...config,
    hairstyle: isSekitori ? "oichomage" : "chonmage",
  };
}

/**
 * Calculate wrinkle level based on age.
 */
function calculateWrinkles(age: number, rng: SeededRNG): number {
  if (age < 30) return 0;
  if (age < 40) return rng.int(5, 20);
  if (age < 50) return rng.int(20, 50);
  return rng.int(50, 80);
}

/**
 * Calculate hair graying percentage based on age.
 */
function calculateHairGraying(age: number, rng: SeededRNG): number {
  if (age < 35) return 0;
  if (age < 45) return rng.int(0, 30);
  if (age < 55) return rng.int(30, 70);
  return rng.int(70, 100);
}

/**
 * Generate default avatar config for a rikishi that doesn't have one.
 */
export function generateDefaultAvatarConfig(rikishi: {
  id: string;
  nationality: string;
  birthYear: number;
  division?: Division;
  isRetired?: boolean;
}): AvatarConfig {
  const currentYear = 2025; // Should be passed in from world state in actual use
  const age = currentYear - rikishi.birthYear;
  const isSekitori = rikishi.division === "makuuchi" || rikishi.division === "juryo";

  return generateAvatarConfig({
    seed: rikishi.id,
    nationality: rikishi.nationality,
    age,
    isSekitori,
    isRetired: rikishi.isRetired,
  });
}
