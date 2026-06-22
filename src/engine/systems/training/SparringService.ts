/**
 * src/engine/systems/training/SparringService.ts
 * ===================================================
 * Sparring Partnership System
 *
 * Responsibilities:
 * - Validate sparring pair eligibility (same heya, not injured, not retired)
 * - Calculate chemistry between rikishi based on archetypes
 * - Calculate growth delta bonuses from sparring
 * - Apply weekly sparring bonuses to world state
 * - Handle sparring pair assignment and removal mutations
 *
 * @see TrainingService for standard training logic
 * @see MentorshipService for similar mentor-apprentice pattern
 */

import type { Rikishi } from "../../types/rikishi";
import type { WorldState } from "../../types/world";
import type { SparringPair, SparringState, SparringChemistry } from "../../types/training";
import type { CombatArchetype } from "../../types/combat";
import { clamp } from "../../utils/math";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { RivalryService } from "../narrative/RivalryService";
import {
  SPARRING_MAX_BLEED,
  SPARRING_BLEED_THRESHOLD,
  SPARRING_BLEED_SCALE,
  SPARRING_CHEMISTRY_FRICTION_MULTIPLIER,
  SPARRING_CHEMISTRY_RUT_MULTIPLIER,
  SPARRING_CHEMISTRY_NEUTRAL_MULTIPLIER,
} from "../../../constants/engine/sparring";
import { getRikishi } from "../../queries";

/**
 * Archetype categories for chemistry calculation.
 * Based on actual CombatArchetype enum values from the codebase.
 */
const PUSH_ARCHETYPES = new Set<CombatArchetype>(["oshi", "tsuppari", "giant"]);
const TECH_ARCHETYPES = new Set<CombatArchetype>(["yotsu", "speedster", "trickster"]);
const HYBRID_ARCHETYPES = new Set<CombatArchetype>(["hybrid"]);

/**
 * Maximum stat points that can bleed from sparring per week.
 * This cap prevents excessive stat inflation from sparring.
 */
const MAX_BLEED = SPARRING_MAX_BLEED;

/**
 * Minimum stat gap between rikishi required for bleed to occur.
 * If the gap is below this threshold, the rikishi are too close in skill.
 */
const BLEED_THRESHOLD = SPARRING_BLEED_THRESHOLD;

/**
 * Fraction of the stat gap that transfers each week.
 * A 5% transfer rate means a 40-point gap yields 2 points per week (before capping).
 */
const BLEED_SCALE = SPARRING_BLEED_SCALE;

/**
 * Chemistry bonus multipliers for growth deltas.
 * Friction: Different archetype categories produce competitive growth
 * Rut: Same archetype produces complacency (no bonus)
 * Neutral: Mixed hybrid or similar categories
 */
const CHEMISTRY_MULTIPLIERS: Record<SparringChemistry, number> = {
  friction: SPARRING_CHEMISTRY_FRICTION_MULTIPLIER,
  rut: SPARRING_CHEMISTRY_RUT_MULTIPLIER,
  neutral: SPARRING_CHEMISTRY_NEUTRAL_MULTIPLIER,
};

/**
 * Sparring service providing pure sparring-assignment logic and growth-bonus calculation.
 *
 * @example
 * ```ts
 * const a = getRikishi(world, "rikishi1");
 * const b = getRikishi(world, "rikishi2");
 *
 * if (SparringService.canSpar(a, b)) {
 *   const chemistry = SparringService.calculateChemistry(a, b);
 *   const growthDelta = SparringService.calculateGrowthDelta(a, b, chemistry);
 *   console.log(`Chemistry: ${chemistry}, Growth Delta: ${growthDelta}`);
 * }
 * ```
 */
export const SparringService = {
  /**
   * Determines whether two rikishi can spar together.
   *
   * Eligibility criteria:
   * - Both must be in the same heya
   * - Both must be different rikishi
   * - Neither can be injured or retired
   *
   * @param {Rikishi} a - First rikishi.
   * @param {Rikishi} b - Second rikishi.
   * @returns {boolean} True if both rikishi can spar together.
   *
   * @example
   * ```ts
   * const a = mockRikishi("r1", { heyaId: "h1", injured: false });
   * const b = mockRikishi("r2", { heyaId: "h1", injured: false });
   * expect(SparringService.canSpar(a, b)).toBe(true);
   * ```
   */
  canSpar(a: Rikishi, b: Rikishi): boolean {
    // Must be in the same heya
    if (a.heyaId !== b.heyaId) return false;

    // Cannot spar with oneself
    if (a.id === b.id) return false;

    // Both must be active (not injured or retired)
    if (a.injured || a.isRetired) return false;
    if (b.injured || b.isRetired) return false;

    return true;
  },

  /**
   * Calculates the chemistry between two rikishi based on their archetypes.
   *
   * Chemistry determines the growth bonus multiplier:
   * - "rut": Same archetype (complacency, 0.8x multiplier)
   * - "friction": Different archetype categories (competitive growth, 1.2x multiplier)
   * - "neutral": Mixed or hybrid categories (normal growth, 1.0x multiplier)
   *
   * Algorithm:
   * 1. Get archetypes from combatProfile
   * 2. If same archetype → rut
   * 3. If both in same category (push vs tech) → neutral
   * 4. If different categories → friction
   * 5. Hybrid always produces friction with non-hybrid
   *
   * @param {Rikishi} a - First rikishi.
   * @param {Rikishi} b - Second rikishi.
   * @returns {SparringChemistry} Chemistry state between the two rikishi.
   *
   * @example
   * ```ts
   * const a = mockRikishi("r1", { combatProfile: { archetype: "oshi" } });
   * const b = mockRikishi("r2", { combatProfile: { archetype: "yotsu" } });
   * const chemistry = SparringService.calculateChemistry(a, b);
   * expect(chemistry).toBe("friction");
   * ```
   */
  calculateChemistry(a: Rikishi, b: Rikishi): SparringChemistry {
    const archA = a.combatProfile?.archetype;
    const archB = b.combatProfile?.archetype;

    if (!archA || !archB) return "neutral";

    // Same archetype → rut (complacency)
    if (archA === archB) return "rut";

    const aIsPush = PUSH_ARCHETYPES.has(archA);
    const bIsPush = PUSH_ARCHETYPES.has(archB);
    const aIsTech = TECH_ARCHETYPES.has(archA);
    const bIsTech = TECH_ARCHETYPES.has(archB);
    const aIsHybrid = HYBRID_ARCHETYPES.has(archA);
    const bIsHybrid = HYBRID_ARCHETYPES.has(archB);

    // Hybrid produces friction with both push and tech
    if (aIsHybrid || bIsHybrid) return "friction";

    // Different categories → friction (competitive growth)
    if ((aIsPush && bIsTech) || (aIsTech && bIsPush)) return "friction";

    // Same category → neutral
    return "neutral";
  },

  /**
   * Calculates the growth delta bonus from sparring.
   *
   * Growth delta represents stat transfer from the stronger rikishi to the weaker.
   * A fraction of the stat gap flows to the weaker rikishi each week,
   * capped at MAX_BLEED points. No bleed occurs when the gap is below BLEED_THRESHOLD.
   *
   * Algorithm:
   * 1. Calculate average stat gap across all trainable stats
   * 2. If gap < BLEED_THRESHOLD, return 0
   * 3. Calculate raw bleed: gap * BLEED_SCALE * chemistryMultiplier
   * 4. Clamp result to [0, MAX_BLEED]
   *
   * @param {Rikishi} a - First rikishi.
   * @param {Rikishi} b - Second rikishi.
   * @param {SparringChemistry} chemistry - Chemistry state between the two rikishi.
   * @returns {number} Growth delta points to add to weaker rikishi (0 to MAX_BLEED).
   *
   * @example
   * ```ts
   * const a = mockRikishi("r1", { power: 80, speed: 75, technique: 70 });
   * const b = mockRikishi("r2", { power: 40, speed: 35, technique: 30 });
   * const chemistry = "friction";
   * const delta = SparringService.calculateGrowthDelta(a, b, chemistry);
   * expect(delta).toBeGreaterThan(0);
   * expect(delta).toBeLessThanOrEqual(2);
   * ```
   */
  calculateGrowthDelta(a: Rikishi, b: Rikishi, chemistry: SparringChemistry): number {
    // Calculate average stat gap
    const stats = ["power", "speed", "balance", "technique"] as const;
    let totalGap = 0;

    for (const stat of stats) {
      const gap = (a.stats[stat] ?? 50) - (b.stats[stat] ?? 50);
      totalGap += Math.abs(gap);
    }

    const avgGap = totalGap / stats.length;

    // No bleed if gap is too small
    if (avgGap < BLEED_THRESHOLD) return 0;

    // Calculate bleed with chemistry multiplier
    const multiplier = CHEMISTRY_MULTIPLIERS[chemistry];
    const rawBleed = avgGap * BLEED_SCALE * multiplier;

    // Clamp to maximum
    return clamp(Math.floor(rawBleed), 0, MAX_BLEED);
  },

  /**
   * Creates a canonical pair key from two rikishi IDs.
   * The key is always "smallerId|largerId" to ensure consistency.
   *
   * @param {string} aId - First rikishi ID.
   * @param {string} bId - Second rikishi ID.
   * @returns {string} Canonical pair key.
   *
   * @example
   * ```ts
   * const key1 = SparringService.makePairKey("r1", "r2");
   * const key2 = SparringService.makePairKey("r2", "r1");
   * expect(key1).toBe(key2);
   * expect(key1).toBe("r1|r2");
   * ```
   */
  makePairKey(aId: string, bId: string): string {
    const [smaller, larger] = [aId, bId].sort();
    return `${smaller}|${larger}`;
  },
};

/**
 * Assigns a sparring pair to a heya.
 *
 * This function validates the sparring eligibility and, if valid, returns a
 * StateImpact that adds the pair to the heya's sparring state.
 *
 * @param {WorldState} world - The current world state.
 * @param {string} heyaId - The heya ID.
 * @param {string} aId - First rikishi ID.
 * @param {string} bId - Second rikishi ID.
 * @param {number} currentWeek - Current week number.
 * @returns {StateImpact} Impact describing sparring pair assignment.
 *
 * @example
 * ```ts
 * const a = mockRikishi("r1", { heyaId: "h1", injured: false });
 * const b = mockRikishi("r2", { heyaId: "h1", injured: false });
 * const world = makeMockWorld({ rikishi: new Map([[a.id, a], [b.id, b]]) });
 *
 * const impact = assignSparringPair(world, "h1", a.id, b.id, 10);
 * const sparringState = impact.entities?.sparringStateUpdates?.get("h1");
 * expect(sparringState).toBeDefined();
 * ```
 */
export function assignSparringPair(
  world: WorldState,
  heyaId: string,
  aId: string,
  bId: string,
  currentWeek: number
): StateImpact {
  const builder = createImpactBuilder("assignSparringPair");
  const a = getRikishi(world, aId);
  const b = getRikishi(world, bId);

  // Validate both rikishi exist
  if (!a || !b) return builder.build();

  // Validate eligibility
  if (!SparringService.canSpar(a, b)) return builder.build();

  // Get or create sparring state for heya
  const currentSparringState = world.sparringPairs?.get(heyaId);
  const pairKey = SparringService.makePairKey(aId, bId);

  // Check if pair already exists
  if (currentSparringState?.pairs[pairKey]) return builder.build();

  // Create new sparring pair
  const newPair: SparringPair = {
    key: pairKey,
    aId,
    bId,
    chemistry: SparringService.calculateChemistry(a, b),
    weeksActive: 0,
    establishedWeek: currentWeek,
  };

  // Update sparring state
  const updatedSparringState: SparringState = currentSparringState || {
    heyaId,
    pairs: {},
  };

  updatedSparringState.pairs[pairKey] = newPair;

  // Create sparring pairs map if it doesn't exist
  const updatedSparringPairs = new Map(world.sparringPairs || []);
  updatedSparringPairs.set(heyaId, updatedSparringState);

  builder.updateWorldField("sparringPairs", updatedSparringPairs);

  return builder.build();
}

/**
 * Removes a sparring pair from a heya.
 *
 * This function removes the pair from the heya's sparring state,
 * returning a StateImpact describing this change.
 *
 * @param {WorldState} world - The current world state.
 * @param {string} heyaId - The heya ID.
 * @param {string} aId - First rikishi ID.
 * @param {string} bId - Second rikishi ID.
 * @returns {StateImpact} Impact describing sparring pair removal.
 *
 * @example
 * ```ts
 * const a = mockRikishi("r1", { heyaId: "h1" });
 * const b = mockRikishi("r2", { heyaId: "h1" });
 * const world = makeMockWorld({ rikishi: new Map([[a.id, a], [b.id, b]]) });
 *
 * // First assign the pair
 * const assignImpact = assignSparringPair(world, "h1", a.id, b.id, 10);
 * let updatedWorld = resolveImpacts(world, [assignImpact]);
 *
 * // Then remove it
 * const removeImpact = removeSparringPair(updatedWorld, "h1", a.id, b.id);
 * ```
 */
export function removeSparringPair(
  world: WorldState,
  heyaId: string,
  aId: string,
  bId: string
): StateImpact {
  const builder = createImpactBuilder("removeSparringPair");

  const currentSparringState = world.sparringPairs?.get(heyaId);
  if (!currentSparringState) return builder.build();

  const pairKey = SparringService.makePairKey(aId, bId);
  if (!currentSparringState.pairs[pairKey]) return builder.build();

  // Remove the pair via object reconstruction (no dynamic delete)
  const { [pairKey]: _removed, ...remainingPairs } = currentSparringState.pairs;
  const updatedSparringState = { ...currentSparringState, pairs: remainingPairs };

  // If no pairs left, remove the heya from sparringPairs entirely
  const updatedSparringPairs = new Map(world.sparringPairs || []);
  if (Object.keys(updatedSparringState.pairs).length === 0) {
    updatedSparringPairs.delete(heyaId);
  } else {
    updatedSparringPairs.set(heyaId, updatedSparringState);
  }

  builder.updateWorldField("sparringPairs", updatedSparringPairs);

  return builder.build();
}

/**
 * Applies weekly sparring bonuses to all active sparring pairs.
 *
 * This function iterates through all sparring pairs in the world, calculates
 * growth deltas based on chemistry and stat gaps, and applies stat bonuses to
 * the weaker rikishi in each pair. It also increments weeksActive for each pair.
 *
 * @param {WorldState} world - The current world state.
 * @returns {StateImpact} Impact describing weekly sparring bonuses.
 *
 * @example
 * ```ts
 * const world = makeMockWorld({ rikishi: rikishiMap, sparringPairs: sparringMap });
 * const impact = applyWeeklySparring(world);
 * const updatedWorld = resolveImpacts(world, [impact]);
 * ```
 */
export function applyWeeklySparring(world: WorldState): StateImpact {
  const builder = createImpactBuilder("applyWeeklySparring");

  if (!world.sparringPairs) return builder.build();

  const updatedSparringPairs = new Map(world.sparringPairs);

  for (const [heyaId, sparringState] of world.sparringPairs) {
    const updatedPairs: Record<string, SparringPair> = { ...sparringState.pairs };

    for (const pairKey in sparringState.pairs) {
      if (!Object.prototype.hasOwnProperty.call(sparringState.pairs, pairKey)) continue;
      const pair = sparringState.pairs[pairKey];
      const a = getRikishi(world, pair.aId);
      const b = getRikishi(world, pair.bId);

      if (!a || !b) {
        delete updatedPairs[pairKey];
        continue;
      }

      // Skip if either rikishi is injured or retired
      if (a.injured || a.isRetired || b.injured || b.isRetired) {
        delete updatedPairs[pairKey];
        continue;
      }

      // Calculate growth delta
      const growthDelta = SparringService.calculateGrowthDelta(a, b, pair.chemistry);

      if (growthDelta === 0) continue;

      // Determine which rikishi is weaker (lower average stats)
      const aAvg = (a.stats.power + a.stats.speed + a.stats.balance + a.stats.technique) / 4;
      const bAvg = (b.stats.power + b.stats.speed + b.stats.balance + b.stats.technique) / 4;
      const weaker = aAvg < bAvg ? a : b;

      // Apply growth delta to weaker rikishi's stats
      // Distribute delta proportionally across stats
      const stats = ["power", "speed", "balance", "technique"] as const;
      const nextStats = { ...weaker.stats };

      for (const stat of stats) {
        const current = nextStats[stat] ?? 50;
        const bonus = Math.ceil(growthDelta / stats.length);
        nextStats[stat] = clamp(current + bonus, 0, 99);
      }
      builder.updateRikishi(weaker.id, { stats: nextStats });

      // Increment weeksActive
      const newWeeksActive = pair.weeksActive + 1;
      updatedPairs[pairKey] = {
        ...pair,
        weeksActive: newWeeksActive,
      };

      // Check for rivalry seeding after 12+ weeks
      if (newWeeksActive >= 12) {
        const rivalryImpact = RivalryService.maybeSeedSparringRivalry(
          world,
          pair.aId,
          pair.bId,
          pair.chemistry,
          newWeeksActive
        );

        // Merge rivalry impact into builder
        builder.merge(rivalryImpact);
      }
    }

    // Update sparring state with incremented weeksActive, or remove if empty
    if (Object.keys(updatedPairs).length === 0) {
      updatedSparringPairs.delete(heyaId);
    } else {
      updatedSparringPairs.set(heyaId, {
        ...sparringState,
        pairs: updatedPairs,
      });
    }
  }

  builder.updateWorldField("sparringPairs", updatedSparringPairs);

  return builder.build();
}
