/**
 * Tsukebito/Ototodeshi System
 *
 * Tsukebito: Junior rikishi assigned as personal attendants to senior sekitori.
 * The senior rikishi receives a small training focus boost; the junior receives
 * morale and technique exposure benefits.
 *
 * Ototodeshi: The most junior wrestlers in the heya who perform chores.
 * They receive a small fatigue penalty but gain mental toughness.
 */

import type { Id } from "../../types/common";
import type { Rikishi } from "../../types/rikishi";
import type { WorldState } from "../../types/world";
import type { StateImpact } from "../../core/StateImpact";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { rngForWorld } from "../../rng";

/** Minimum rank number to be eligible for tsukebito (sekiwake and above = rankNum <= 3) */
export const TSUKEBITO_SENIOR_RANK_THRESHOLD = 3;

/** Maximum number of tsukebito per senior rikishi */
export const MAX_TSUKEBITO_PER_SENIOR = 2;

/** Training boost per tsukebito for the senior rikishi */
export const TSUKEBITO_TRAINING_BOOST = 0.02;

/** Morale boost for being a tsukebito */
export const TSUKEBITO_MORALE_BOOST = 3;

/** Technique exposure bonus for tsukebito */
export const TSUKEBITO_TECHNIQUE_EXPOSURE = 0.01;

/** Fatigue penalty for ototodeshi (chores) */
export const OTOTODESHI_FATIGUE_PENALTY = 0.5;

/** Mental toughness gain for ototodeshi */
export const OTOTODESHI_MENTAL_GAIN = 0.05;

/** Tsukebito assignment record */
export interface TsukebitoAssignment {
  seniorId: Id;
  tsukebitoIds: Id[];
}

/**
 * Check if a rikishi is eligible to have tsukebito.
 * Must be sekitori (rankNumber <= TSUKEBITO_SENIOR_RANK_THRESHOLD) and not retired.
 */
export function isEligibleForTsukebito(rikishi: Rikishi): boolean {
  if (rikishi.isRetired) return false;
  const rankNum = rikishi.rankNumber ?? 99;
  return rankNum <= TSUKEBITO_SENIOR_RANK_THRESHOLD;
}

/**
 * Check if a rikishi is eligible to be a tsukebito.
 * Must be junior (rankNumber > 10), same heya, not retired.
 */
export function isEligibleTsukebito(rikishi: Rikishi, senior: Rikishi): boolean {
  if (rikishi.id === senior.id) return false;
  if (rikishi.heyaId !== senior.heyaId) return false;
  if (rikishi.isRetired) return false;
  const rankNum = rikishi.rankNumber ?? 99;
  return rankNum > 10;
}

/**
 * Assign tsukebito to a senior rikishi.
 * Deterministic based on world seed and senior ID.
 */
export function assignTsukebito(
  world: WorldState,
  senior: Rikishi,
  candidates: Rikishi[]
): TsukebitoAssignment {
  if (!isEligibleForTsukebito(senior)) {
    return { seniorId: senior.id, tsukebitoIds: [] };
  }

  const eligible = candidates.filter((r) => isEligibleTsukebito(r, senior));
  if (eligible.length === 0) {
    return { seniorId: senior.id, tsukebitoIds: [] };
  }

  const rng = rngForWorld(world, "tsukebito", `assign-${senior.id}`);
  const shuffled = [...eligible].sort(() => rng.next() - 0.5);
  const count = Math.min(MAX_TSUKEBITO_PER_SENIOR, shuffled.length);

  return {
    seniorId: senior.id,
    tsukebitoIds: shuffled.slice(0, count).map((r) => r.id),
  };
}

/**
 * Apply weekly tsukebito benefits — training boost to senior,
 * morale + technique exposure to tsukebito.
 */
export function applyWeeklyTsukebitoBenefits(
  _world: WorldState,
  assignment: TsukebitoAssignment,
  senior: Rikishi,
  tsukebitoRikishi: Rikishi[]
): StateImpact {
  const builder = createImpactBuilder("applyWeeklyTsukebitoBenefits");

  if (assignment.tsukebitoIds.length === 0) {
    return builder.build();
  }

  // Senior gets training boost
  const seniorBoost = assignment.tsukebitoIds.length * TSUKEBITO_TRAINING_BOOST;
  const seniorStats = { ...(senior.stats ?? {}) };
  seniorStats.technique = (seniorStats.technique ?? 50) + seniorBoost;
  builder.updateRikishi(senior.id, { stats: seniorStats });

  // Each tsukebito gets morale + technique exposure
  for (const tsukebito of tsukebitoRikishi) {
    const stats = { ...(tsukebito.stats ?? {}) };
    stats.technique = (stats.technique ?? 50) + TSUKEBITO_TECHNIQUE_EXPOSURE;
    stats.mental = (stats.mental ?? 50) + TSUKEBITO_MORALE_BOOST * 0.01;
    builder.updateRikishi(tsukebito.id, { stats });
  }

  return builder.build();
}

/**
 * Apply weekly ototodeshi effects — fatigue penalty and mental toughness gain
 * for the most junior rikishi in a heya.
 */
export function applyWeeklyOtotodeshiEffects(
  _world: WorldState,
  heyaId: Id,
  rikishiList: Rikishi[]
): StateImpact {
  const builder = createImpactBuilder("applyWeeklyOtotodeshiEffects");

  // Ototodeshi = lowest-ranked rikishi in the heya (rankNumber > 30)
  const ototodeshi = rikishiList
    .filter((r) => r.heyaId === heyaId && !r.isRetired && (r.rankNumber ?? 99) > 30)
    .sort((a, b) => (b.rankNumber ?? 99) - (a.rankNumber ?? 99));

  for (const riki of ototodeshi) {
    const stats = { ...(riki.stats ?? {}) };
    stats.mental = (stats.mental ?? 50) + OTOTODESHI_MENTAL_GAIN;
    builder.updateRikishi(riki.id, {
      stats,
      fatigue: (riki.fatigue ?? 0) + OTOTODESHI_FATIGUE_PENALTY,
    });
  }

  return builder.build();
}

/**
 * Player-controlled tsukebito assignment.
 * Assigns a junior rikishi as a tsukebito to a senior sekitori.
 * Validates eligibility and respects the MAX_TSUKEBITO_PER_SENIOR limit.
 * Refuses if the junior is already assigned to another senior.
 */
export function setTsukebito(
  world: WorldState,
  seniorId: Id,
  juniorId: Id
): StateImpact {
  const builder = createImpactBuilder("setTsukebito");

  const senior = world.rikishi.get(seniorId);
  const junior = world.rikishi.get(juniorId);
  if (!senior || !junior) return builder.build();

  // Validate eligibility
  if (!isEligibleForTsukebito(senior)) return builder.build();
  if (!isEligibleTsukebito(junior, senior)) return builder.build();

  // Check if junior is already assigned to another senior
  for (const r of world.rikishi.values()) {
    if (r.id !== seniorId && r.tsukebitoIds?.includes(juniorId)) {
      // Junior is already a tsukebito for another senior — refuse
      return builder.build();
    }
  }

  // Check if already assigned to this senior
  const currentIds = senior.tsukebitoIds ?? [];
  if (currentIds.includes(juniorId)) return builder.build();

  // Respect max limit
  if (currentIds.length >= MAX_TSUKEBITO_PER_SENIOR) return builder.build();

  builder.updateRikishi(seniorId, {
    tsukebitoIds: [...currentIds, juniorId],
    tsukebitoPlayerSet: true,
  });

  return builder.build();
}

/**
 * Player-controlled tsukebito removal.
 * Removes a junior rikishi from a senior's tsukebito list.
 */
export function clearTsukebito(
  world: WorldState,
  seniorId: Id,
  juniorId: Id
): StateImpact {
  const builder = createImpactBuilder("clearTsukebito");

  const senior = world.rikishi.get(seniorId);
  if (!senior) return builder.build();

  const currentIds = senior.tsukebitoIds ?? [];
  if (!currentIds.includes(juniorId)) return builder.build();

  const remainingIds = currentIds.filter((id) => id !== juniorId);
  builder.updateRikishi(seniorId, {
    tsukebitoIds: remainingIds,
    // Keep playerSet flag true even after clearing — player explicitly chose this state
    tsukebitoPlayerSet: true,
  });

  return builder.build();
}
