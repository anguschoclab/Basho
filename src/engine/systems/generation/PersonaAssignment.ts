// PersonaAssignment.ts
// Assigns pressPersona, personalityTraits, and birthMonth/birthDay to rikishi
// at generation time. Used by both lifecycle.ts (rookies) and CandidateBuilder.ts (recruits).

import type { Rikishi } from "../../types/rikishi";
import type { PressPersona } from "../../types/media";
import type { CombatArchetype } from "../../types/combat";
import type { SeededRNG } from "../../rng";
import {
  PERSONALITY_TRAITS,
  PERSONALITY_TRAITS_PER_RIKISHI_MIN,
  PERSONALITY_TRAITS_PER_RIKISHI_MAX,
  TRAIT_WEIGHTS,
  BEHAVIOR_TRAIT_WEIGHTS,
  PRESS_PERSONA_CELEBRITY_MEDIA_SAVVY,
  PRESS_PERSONA_CELEBRITY_DISCIPLINE,
  PRESS_PERSONA_FIREBRAND_MEDIA_SAVVY,
  PRESS_PERSONA_STOIC_DISCIPLINE,
  PRESS_PERSONA_VILLAIN_DISCIPLINE,
} from "@/constants/engine/generation";

/**
 * Determines press persona based on behavior stats (discipline + mediaSavvy).
 * Falls back to "neutral" if no specific threshold is met.
 */
export function assignPressPersona(
  discipline: number,
  mediaSavvy: number,
): PressPersona {
  if (mediaSavvy >= PRESS_PERSONA_CELEBRITY_MEDIA_SAVVY && discipline >= PRESS_PERSONA_CELEBRITY_DISCIPLINE) {
    return "celebrity";
  }
  if (mediaSavvy >= PRESS_PERSONA_FIREBRAND_MEDIA_SAVVY && discipline < PRESS_PERSONA_VILLAIN_DISCIPLINE) {
    return "firebrand";
  }
  if (discipline >= PRESS_PERSONA_STOIC_DISCIPLINE && mediaSavvy < 40) {
    return "stoic";
  }
  if (discipline < PRESS_PERSONA_VILLAIN_DISCIPLINE && mediaSavvy < 40) {
    return "villain";
  }
  return "neutral";
}

/**
 * Weighted random selection of personality traits based on combat archetype
 * and behavior stats. Returns 2-4 traits.
 */
export function assignPersonalityTraits(
  archetype: CombatArchetype,
  discipline: number,
  mediaSavvy: number,
  rng: SeededRNG,
): string[] {
  // Build weighted pool
  const pool: Array<{ trait: string; weight: number }> = [];

  for (const trait of PERSONALITY_TRAITS) {
    let weight = 1; // Base weight

    // Archetype-based weight
    const archetypeWeight = TRAIT_WEIGHTS[trait]?.[archetype];
    if (archetypeWeight) {
      weight *= archetypeWeight;
    }

    // Behavior-based weight
    const behaviorMod = BEHAVIOR_TRAIT_WEIGHTS[trait];
    if (behaviorMod) {
      const statValue = behaviorMod.stat === "discipline" ? discipline : mediaSavvy;
      if (behaviorMod.threshold >= 50) {
        // High-threshold: boost if stat meets threshold
        if (statValue >= behaviorMod.threshold) {
          weight *= behaviorMod.weight;
        }
      } else {
        // Low-threshold: boost if stat is below threshold
        if (statValue < behaviorMod.threshold) {
          weight *= behaviorMod.weight;
        }
      }
    }

    pool.push({ trait, weight });
  }

  // Weighted selection without replacement
  const numTraits = rng.int(PERSONALITY_TRAITS_PER_RIKISHI_MIN, PERSONALITY_TRAITS_PER_RIKISHI_MAX);
  const selected: string[] = [];
  const remaining = [...pool];

  for (let i = 0; i < numTraits && remaining.length > 0; i++) {
    const totalWeight = remaining.reduce((sum, item) => sum + item.weight, 0);
    let roll = rng.next() * totalWeight;
    let idx = 0;
    for (let j = 0; j < remaining.length; j++) {
      roll -= remaining[j].weight;
      if (roll <= 0) {
        idx = j;
        break;
      }
      idx = j;
    }
    selected.push(remaining[idx].trait);
    remaining.splice(idx, 1);
  }

  return selected;
}

/**
 * Rolls a random birth month (1-12) and day (1-28).
 */
export function rollBirthday(rng: SeededRNG): { birthMonth: number; birthDay: number } {
  return {
    birthMonth: rng.int(1, 12),
    birthDay: rng.int(1, 28),
  };
}

/**
 * Applies pressPersona, personalityTraits, and birthMonth/birthDay to a rikishi.
 * Mutates the rikishi object in place and returns it.
 */
export function applyPersonaAssignment(
  rikishi: Rikishi,
  archetype: CombatArchetype,
  rng: SeededRNG,
): Rikishi {
  const { discipline, mediaSavvy } = rikishi.behavior;

  rikishi.pressPersona = assignPressPersona(discipline, mediaSavvy);
  rikishi.personalityTraits = assignPersonalityTraits(archetype, discipline, mediaSavvy, rng);

  if (rikishi.birthMonth === undefined || rikishi.birthDay === undefined) {
    const birthday = rollBirthday(rng);
    rikishi.birthMonth = birthday.birthMonth;
    rikishi.birthDay = birthday.birthDay;
  }

  return rikishi;
}
