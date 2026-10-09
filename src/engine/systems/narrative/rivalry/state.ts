import type { WorldState } from "../../../types/world";
import type { Id } from "../../../types/common";
import { EntityCollection } from "../../../core/EntityCollection";
import {
  type RivalriesState,
  type RivalryPairState,
  type RivalryKey,
} from "../../../../constants/engine/rivalry";
import {
  RIVALRY_DECAY_WEEKS_SHORT,
  RIVALRY_DECAY_WEEKS_MEDIUM,
  RIVALRY_DECAY_RATE_SHORT,
  RIVALRY_DECAY_RATE_MEDIUM,
  RIVALRY_DECAY_RATE_LONG,
} from "../../../../constants/engine/rivalry";

/**
 * Flat lookup for rivalry decay rate based on weeks since last meeting.
 */
export function getDecayRate(weeksSince: number): number {
  if (weeksSince <= RIVALRY_DECAY_WEEKS_SHORT) return RIVALRY_DECAY_RATE_SHORT;
  if (weeksSince <= RIVALRY_DECAY_WEEKS_MEDIUM) return RIVALRY_DECAY_RATE_MEDIUM;
  return RIVALRY_DECAY_RATE_LONG;
}

/**
 * Ensure rivalry state exists on world.
 * Hydrates the rivalries state if it doesn't exist.
 * Pure hydration — returns default without mutating the input world.
 */
export function ensureRivalriesState(world: WorldState): RivalriesState {
  return world.rivalriesState ?? { version: "1.0.0", pairs: {} };
}

/**
 * Canonical Pair Key Generator.
 * Creates a consistent key for a rivalry pair regardless of order.
 */
export function makeRivalryKey(aId: Id, bId: Id): RivalryKey {
  return aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
}

/**
 * Factory for a fresh rivalry pair.
 * Creates a new rivalry pair state with default values.
 */
export function createFreshPair(id1: Id, id2: Id, world: WorldState): RivalryPairState {
  const [aId, bId] = id1 < id2 ? [id1, id2] : [id2, id1];
  const rA = EntityCollection.getRikishiById(world, aId);
  const rB = EntityCollection.getRikishiById(world, bId);

  return {
    key: `${aId}|${bId}`,
    aId,
    bId,
    heat: 0,
    meetings: 0,
    lastMetWeek: world.calendar?.currentWeek || 0,
    aWins: 0,
    bWins: 0,
    closeness: 0,
    spite: 0,
    tone: "respect",
    triggers: {},
    sameHeya: !!rA && !!rB && rA.heyaId === rB.heyaId,
  };
}
