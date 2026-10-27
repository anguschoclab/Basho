/**
 * src/engine/systems/narrative/RivalryService.ts
 * ==============================================
 * Stateful orchestration for the Rivalry System.
 * Facade composing the domain modules in ./rivalry/:
 * state hydration, bout hooks, weekly decay, and seeding.
 */
import { ensureRivalriesState, makeRivalryKey, createFreshPair } from "@/engine/narrative/rivalry/state";
import { onBoutResolved } from "@/engine/narrative/rivalry/bout";
import { applyWeeklyDecay } from "@/engine/narrative/rivalry/decay";
import { seedInitialRivalries, maybeSeedSparringRivalry } from "@/engine/narrative/rivalry/seeding";

/**
 * Unified Rivalry Service.
 * Provides stateful orchestration for the Rivalry System including state hydration,
 * weekly decay, and bout hook orchestration.
 *
 * @example
 * ```ts
 * const state = RivalryService.ensureRivalriesState(world);
 * const impact = RivalryService.onBoutResolved(world, { result, day: 5 });
 * const decayImpact = RivalryService.applyWeeklyDecay(world);
 * ```
 */
export const RivalryService = {
  ensureRivalriesState,
  makeRivalryKey,
  onBoutResolved,
  applyWeeklyDecay,
  createFreshPair,
  seedInitialRivalries,
  maybeSeedSparringRivalry,
};
