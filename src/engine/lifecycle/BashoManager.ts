/**
 * src/engine/lifecycle/BashoManager.ts
 * =====================================
 * Basho Manager
 *
 * Responsibilities:
 * - Start basho tournaments
 * - Get current basho state
 * - Initialize day schedules
 * - Handle phase transitions to active_basho
 *
 * @see initializeBasho for basho state initialization
 * @see ensureDaySchedule for day schedule management
 */

import { initializeBasho } from "@/engine/generation/WorldFactory";
import { pendingTsukedashiDebutants } from "@/engine/basho/maezumoPrelims";
import { ensureRollingTorikumi } from "@/engine/calendar/schedule";
import type { WorldState } from "@/engine/types/world";
import type { BashoName } from "@/engine/types/basho";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { StateImpact } from "@/engine/core/StateImpact";

/**
 * Start basho — handles the transition from pre-basho/interim to active_basho.
 * Canonically initializes the tournament state and day 1 schedule.
 *
 * Algorithm:
 * 1. Check if already in active_basho (no-op if true)
 * 2. Determine basho name (use provided or world default)
 * 3. Initialize new basho state
 * 4. Set cycle phase to active_basho
 * 5. Ensure initial day 1 schedule is available
 * 6. Emit basho status event
 *
 * @param {WorldState} world - Current world state.
 * @param {BashoName} [bashoName] - Optional basho name override.
 * @returns {StateImpact} State impact with basho state updates and queued BASHO_STATUS event.
 *
 * @example
 * ```ts
 * const impact = buildStartBashoImpact(world, "haru");
 * const resolved = resolveImpacts(world, [impact]);
 * console.log(resolved.cyclePhase); // "active_basho"
 * ```
 */
export function buildStartBashoImpact(world: WorldState, bashoName?: BashoName): StateImpact {
  if (world.cyclePhase === "active_basho")
    return createImpactBuilder("buildStartBashoImpact").build();

  const name: BashoName = bashoName || world.currentBashoName || "hatsu";

  // Initialize new basho state
  const basho = initializeBasho(world, name);

  // Build impact with world field updates and queued event
  const builder = createImpactBuilder("buildStartBashoImpact")
    .updateWorldField("currentBasho", basho)
    .updateWorldField("cyclePhase", "active_basho");

  // Tsukedashi debutants join the new basho's card — the debut gate lifts
  // at basho start; the publish path prints them at their credential slot.
  for (const r of pendingTsukedashiDebutants(world)) {
    builder.updateRikishi(r.id, { isMaezumo: false });
  }

  // §3 JSA rolling torikumi — Days 1 and 2 are announced together pre-basho.
  const scheduleImpact = ensureRollingTorikumi({ ...world, currentBasho: basho });

  builder
    .logEvent(
      "BASHO_STATUS",
      "basho",
      {
        status: "started",
        incident: name,
        day: 1,
        dohyoCondition: basho.dohyoCondition,
      },
      { importance: "headline" }
    );

  // Merge schedule impact
  builder.merge(scheduleImpact);

  return builder.build();
}
