/**
 * src/engine/systems/training/MentorshipService.ts
 * ===================================================
 * Mentor-Apprentice Training Bonds System
 *
 * Responsibilities:
 * - Validate mentor-mentee eligibility (rank, heya, injury status)
 * - Calculate technique bleed from mentor to apprentice
 * - Calculate adaptability penalty for apprentices
 * - Apply weekly mentorship bonuses to world state
 * - Handle mentor assignment and removal mutations
 * - Detect mentor-mentee bout events for narrative seeding
 *
 * @see TrainingService for standard training logic
 * @see BloodlineService for heritage-based bonuses
 */

import type { Rikishi } from "../../types/rikishi";
import type { WorldState } from "../../types/world";
import { clamp } from "../../utils/math";
import { EntityCollection } from "../../core/EntityCollection";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import {
  MENTORSHIP_MAX_BLEED,
  MENTORSHIP_BLEED_THRESHOLD,
  MENTORSHIP_BLEED_SCALE,
} from "../../../constants/engine/training";
import { getRikishi } from "../../queries";

/**
 * Minimum ranks required for a rikishi to be eligible as a mentor.
 * Only sekitori (juryo and above) can mentor lower-division wrestlers.
 */
const MENTOR_MIN_RANKS = new Set([
  "juryo",
  "maegashira",
  "komusubi",
  "sekiwake",
  "ozeki",
  "yokozuna",
]);

/**
 * Maximum technique points that can bleed from mentor to apprentice per week.
 * This cap prevents excessive stat inflation from mentorship.
 */
const MAX_BLEED = MENTORSHIP_MAX_BLEED;

/**
 * Minimum technique gap between mentor and apprentice required for bleed to occur.
 * If the gap is below this threshold, the apprentice is too close to the mentor's level.
 */
const BLEED_THRESHOLD = MENTORSHIP_BLEED_THRESHOLD;

/**
 * Fraction of the technique gap that transfers to the apprentice each week.
 * A 6% transfer rate means a 50-point gap yields 3 points per week (before capping).
 */
const BLEED_SCALE = MENTORSHIP_BLEED_SCALE;

/**
 * Mentorship service providing pure mentor-assignment logic and growth-bonus calculation.
 *
 * @example
 * ```ts
 * const mentor = getRikishi(world, "mentor1");
 * const apprentice = getRikishi(world, "app1");
 *
 * if (MentorshipService.canMentor(mentor, apprentice)) {
 *   const bleed = MentorshipService.calculateTechniqueBleed(mentor, apprentice);
 *   console.log(`Technique bleed: ${bleed} points`);
 * }
 * ```
 */
export const MentorshipService = {
  /**
   * Determines whether a mentor is eligible to guide an apprentice.
   *
   * Eligibility criteria:
   * - Both must be in the same heya
   * - Mentor must be sekitori (juryo or above)
   * - Mentor and apprentice must be different rikishi
   * - Mentor must not be injured or retired
   * - Apprentice must not be retired
   *
   * @param {Rikishi} mentor - The potential mentor rikishi.
   * @param {Rikishi} apprentice - The potential apprentice rikishi.
   * @returns {boolean} True if mentor is eligible to guide apprentice.
   *
   * @example
   * ```ts
   * const mentor = mockRikishi("m1", { rank: "ozeki", heyaId: "h1" });
   * const apprentice = mockRikishi("a1", { rank: "jonokuchi", heyaId: "h1" });
   * expect(MentorshipService.canMentor(mentor, apprentice)).toBe(true);
   * ```
   */
  canMentor(mentor: Rikishi, apprentice: Rikishi): boolean {
    // Must be in the same heya
    if (mentor.heyaId !== apprentice.heyaId) return false;

    // Mentor must be sekitori
    if (!MENTOR_MIN_RANKS.has(mentor.rank)) return false;

    // Cannot mentor oneself
    if (mentor.id === apprentice.id) return false;

    // Mentor must be active (not injured or retired)
    if (mentor.injured || mentor.isRetired) return false;

    // Apprentice must not be retired
    if (apprentice.isRetired) return false;

    return true;
  },

  /**
   * Calculates the technique bleed from mentor to apprentice.
   *
   * Technique bleed represents knowledge transfer from experienced mentor to
   * apprentice. A fraction of the technique gap flows to the apprentice each week,
   * capped at MAX_BLEED points. No bleed occurs when the gap is below BLEED_THRESHOLD.
   *
   * Algorithm:
   * 1. Calculate gap: mentor.technique - apprentice.technique
   * 2. If gap < BLEED_THRESHOLD, return 0
   * 3. Calculate raw bleed: gap * BLEED_SCALE
   * 4. Clamp result to [0, MAX_BLEED]
   *
   * @param {Rikishi} mentor - The mentor rikishi.
   * @param {Rikishi} apprentice - The apprentice rikishi.
   * @returns {number} Technique points to add to apprentice (0 to MAX_BLEED).
   *
   * @example
   * ```ts
   * const mentor = mockRikishi("m1", { rank: "ozeki", technique: 90 });
   * const apprentice = mockRikishi("a1", { rank: "jonokuchi", technique: 40 });
   * const bleed = MentorshipService.calculateTechniqueBleed(mentor, apprentice);
   * expect(bleed).toBeGreaterThan(0);
   * expect(bleed).toBeLessThanOrEqual(3);
   * ```
   */
  calculateTechniqueBleed(mentor: Rikishi, apprentice: Rikishi): number {
    const gap = mentor.technique - apprentice.technique;

    // No bleed if gap is too small
    if (gap < BLEED_THRESHOLD) return 0;

    // Calculate bleed and cap at maximum
    return clamp(Math.floor(gap * BLEED_SCALE), 0, MAX_BLEED);
  },

  /**
   * Calculates the adaptability penalty for an apprentice.
   *
   * Mentorship creates dependency, slightly throttling the apprentice's
   * independent adaptability growth. This represents over-reliance on
   * mentor guidance rather than developing independent problem-solving.
   *
   * Algorithm:
   * 1. Check eligibility via canMentor
   * 2. If not eligible, return 0
   * 3. If technique gap < BLEED_THRESHOLD, return 0
   * 4. Return -1 (fixed penalty)
   *
   * @param {Rikishi} mentor - The mentor rikishi.
   * @param {Rikishi} apprentice - The apprentice rikishi.
   * @returns {number} Adaptability delta (0 if no penalty, -1 if penalty applies).
   *
   * @example
   * ```ts
   * const mentor = mockRikishi("m1", { rank: "ozeki", technique: 90 });
   * const apprentice = mockRikishi("a1", { rank: "juryo", technique: 70 });
   * const penalty = MentorshipService.calculateAdaptabilityPenalty(mentor, apprentice);
   * expect(penalty).toBe(0); // Gap too small
   * ```
   */
  calculateAdaptabilityPenalty(mentor: Rikishi, apprentice: Rikishi): number {
    if (!this.canMentor(mentor, apprentice)) return 0;

    const gap = mentor.technique - apprentice.technique;
    if (gap < BLEED_THRESHOLD) return 0;

    return -1;
  },
};

/**
 * Interface for mentor-mentee bout event data.
 *
 * This event is fired when a mentor faces their apprentice in a basho bout,
 * seeding narrative content for the master-apprentice relationship arc.
 */
export interface MentorMenteeBoutEvent {
  /** Event type identifier. */
  type: "mentor_mentee_bout";
  /** The mentor's rikishi ID. */
  mentorId: string;
  /** The apprentice's rikishi ID. */
  apprenticeId: string;
}

/**
 * Applies mentorship bonuses to all apprentices in the world state.
 *
 * This function iterates over all active rikishi, identifies those with mentors,
 * calculates technique bleed and adaptability penalties, and returns a StateImpact
 * describing the changes to apply.
 *
 * Algorithm flow:
 * 1. Get all active rikishi from world state
 * 2. For each rikishi with a mentorId:
 *    a. Retrieve mentor from world state
 *    b. Validate eligibility via canMentor
 *    c. Calculate technique bleed
 *    d. Calculate adaptability penalty
 *    e. If either delta is non-zero, queue rikishi update
 * 3. Return StateImpact with all queued updates
 *
 * @param {WorldState} world - The current world state.
 * @returns {StateImpact} Impact describing technique and adaptability changes.
 *
 * @example
 * ```ts
 * const mentor = mockRikishi("m1", { rank: "ozeki", technique: 90, heyaId: "h1" });
 * const apprentice = mockRikishi("a1", { rank: "jonokuchi", technique: 40, heyaId: "h1" });
 * mentor.menteeIds = [apprentice.id];
 * apprentice.mentorId = mentor.id;
 *
 * const world = makeMockWorld({ rikishi: new Map([[mentor.id, mentor], [apprentice.id, apprentice]]) });
 * const impact = applyMentorshipBonuses(world);
 *
 * const appUpdate = impact.entities?.rikishiUpdates?.get(apprentice.id);
 * expect(appUpdate?.technique).toBeGreaterThan(40);
 * ```
 */
export function applyMentorshipBonuses(world: WorldState): StateImpact {
  const builder = createImpactBuilder("applyMentorshipBonuses");
  const allRikishi = EntityCollection.getActiveRikishi(world);

  for (const apprentice of allRikishi) {
    // Skip apprentices without mentors
    if (!apprentice.mentorId) continue;

    const mentor = getRikishi(world, apprentice.mentorId);
    if (!mentor) continue;

    // Validate mentorship is still valid
    if (!MentorshipService.canMentor(mentor, apprentice)) continue;

    // Calculate bonuses
    const techniqueBleed = MentorshipService.calculateTechniqueBleed(mentor, apprentice);
    const adaptabilityPenalty = MentorshipService.calculateAdaptabilityPenalty(mentor, apprentice);

    // Skip if no changes to apply
    if (techniqueBleed === 0 && adaptabilityPenalty === 0) continue;

    // Queue rikishi update with clamped values
    builder.updateRikishi(apprentice.id, {
      technique: clamp(apprentice.technique + techniqueBleed, 0, 99),
      adaptability: clamp(apprentice.adaptability + adaptabilityPenalty, 0, 99),
    });
  }

  return builder.build();
}

/**
 * Assigns a mentor to an apprentice.
 *
 * This function validates the mentorship eligibility and, if valid, returns a
 * StateImpact that sets the apprentice's mentorId and adds the apprentice to
 * the mentor's menteeIds array.
 *
 * @param {WorldState} world - The current world state.
 * @param {string} mentorId - The mentor's rikishi ID.
 * @param {string} apprenticeId - The apprentice's rikishi ID.
 * @returns {StateImpact} Impact describing mentorship assignment.
 *
 * @example
 * ```ts
 * const mentor = mockRikishi("m1", { rank: "ozeki", heyaId: "h1" });
 * const apprentice = mockRikishi("a1", { rank: "jonokuchi", heyaId: "h1" });
 * const world = makeMockWorld({ rikishi: new Map([[mentor.id, mentor], [apprentice.id, apprentice]]) });
 *
 * const impact = assignMentor(world, mentor.id, apprentice.id);
 * const appUpdate = impact.entities?.rikishiUpdates?.get(apprentice.id);
 * expect(appUpdate?.mentorId).toBe(mentor.id);
 * ```
 */
export function assignMentor(
  world: WorldState,
  mentorId: string,
  apprenticeId: string
): StateImpact {
  const builder = createImpactBuilder("assignMentor");
  const mentor = getRikishi(world, mentorId);
  const apprentice = getRikishi(world, apprenticeId);

  // Validate both rikishi exist
  if (!mentor || !apprentice) return builder.build();

  // Validate eligibility
  if (!MentorshipService.canMentor(mentor, apprentice)) return builder.build();

  // Set mentorId on apprentice
  builder.updateRikishi(apprenticeId, { mentorId });

  // Add apprentice to mentor's menteeIds (with null safety)
  builder.updateRikishi(mentorId, {
    menteeIds: [...(mentor.menteeIds ?? []), apprenticeId],
  });

  return builder.build();
}

/**
 * Removes a mentor from an apprentice.
 *
 * This function clears the apprentice's mentorId and removes the apprentice from
 * the mentor's menteeIds array, returning a StateImpact describing these changes.
 *
 * @param {WorldState} world - The current world state.
 * @param {string} apprenticeId - The apprentice's rikishi ID.
 * @returns {StateImpact} Impact describing mentorship removal.
 *
 * @example
 * ```ts
 * const mentor = mockRikishi("m1", { rank: "ozeki", heyaId: "h1" });
 * mentor.menteeIds = ["a1"];
 * const apprentice = mockRikishi("a1", { rank: "jonokuchi", heyaId: "h1" });
 * apprentice.mentorId = "m1";
 *
 * const world = makeMockWorld({ rikishi: new Map([[mentor.id, mentor], [apprentice.id, apprentice]]) });
 * const impact = removeMentor(world, apprentice.id);
 *
 * const appUpdate = impact.entities?.rikishiUpdates?.get(apprentice.id);
 * expect(appUpdate?.mentorId).toBeUndefined();
 * ```
 */
export function removeMentor(world: WorldState, apprenticeId: string): StateImpact {
  const builder = createImpactBuilder("removeMentor");
  const apprentice = getRikishi(world, apprenticeId);

  // Skip if apprentice has no mentor
  if (!apprentice?.mentorId) return builder.build();

  const mentor = getRikishi(world, apprentice.mentorId);

  // Clear mentorId on apprentice
  builder.updateRikishi(apprenticeId, { mentorId: undefined });

  // Remove apprentice from mentor's menteeIds if mentor exists
  if (mentor) {
    builder.updateRikishi(mentor.id, {
      menteeIds: (mentor.menteeIds ?? []).filter((id) => id !== apprenticeId),
    });
  }

  return builder.build();
}

/**
 * Checks if two rikishi have a mentor-mentee relationship.
 *
 * This bidirectional check determines if either rikishi is the mentor of the other.
 * Used in bout result application to seed narrative events when mentors face apprentices.
 *
 * @param {Rikishi} a - First rikishi to check.
 * @param {Rikishi} b - Second rikishi to check.
 * @returns {MentorMenteeBoutEvent | null} Event data if mentor-mentee bout, null otherwise.
 *
 * @example
 * ```ts
 * const mentor = mockRikishi("m1", { rank: "ozeki" });
 * mentor.menteeIds = ["a1"];
 * const apprentice = mockRikishi("a1", { rank: "maegashira" });
 * apprentice.mentorId = "m1";
 *
 * const event = checkMentorMenteeBout(mentor, apprentice);
 * expect(event).not.toBeNull();
 * expect(event?.type).toBe("mentor_mentee_bout");
 * expect(event?.mentorId).toBe("m1");
 * ```
 */
export function checkMentorMenteeBout(a: Rikishi, b: Rikishi): MentorMenteeBoutEvent | null {
  // Cannot be a mentor-mentee bout if they're the same rikishi
  if (a.id === b.id) return null;

  // Check if a is mentor of b (b has mentorId pointing to a, and a has b in menteeIds)
  if (b.mentorId === a.id && a.menteeIds?.includes(b.id)) {
    return { type: "mentor_mentee_bout", mentorId: a.id, apprenticeId: b.id };
  }

  // Check if b is mentor of a (a has mentorId pointing to b, and b has a in menteeIds)
  if (a.mentorId === b.id && b.menteeIds?.includes(a.id)) {
    return { type: "mentor_mentee_bout", mentorId: b.id, apprenticeId: a.id };
  }

  // No mentor-mentee relationship
  return null;
}
