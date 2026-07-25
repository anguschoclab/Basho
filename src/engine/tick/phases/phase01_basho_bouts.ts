/**
 * phase01_basho_bouts.ts
 * =======================
 * Pipeline Phase 1 (Daily during active_basho) — Bout resolution.
 *
 * Simulates all unplayed bouts for the current basho day in batch.
 * This replaces the bashoSlice mutable bout-simulation path with a
 * pipeline-integrated phase that runs inside advanceOneDay.
 *
 * Key properties:
 *   - Only runs during `active_basho` cycle phase.
 *   - Resolves all unplayed matches for `currentBasho.day` in one pass.
 *   - Does NOT re-simulate bouts that already have results.
 *   - Advances the basho day counter after all bouts are resolved.
 */

import type { WorldState } from "../../types/world";
import { simulateBoutForToday, advanceBashoDay } from "../../world";

export function phase01_basho_bouts(world: WorldState): WorldState {
  if (world.cyclePhase !== "active_basho") return world;
  const basho = world.currentBasho;
  if (!basho) return world;

  let currentWorld = world;

  // Simulate all unplayed bouts for the current day
  // Use a safety cap to avoid infinite loops from bad data
  const MAX_ITERATIONS = 128;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const currentBasho = currentWorld.currentBasho;
    if (!currentBasho) break;

    const todays = (currentBasho.matches ?? []).filter(
      (m) => m.day === currentBasho.day && !m.result
    );
    if (todays.length === 0) break;

    const { world: nextWorld, result } = simulateBoutForToday(currentWorld, 0);
    currentWorld = nextWorld;
    if (!result) break;
  }

  // Advance the basho day after all bouts for today are resolved
  currentWorld = advanceBashoDay(currentWorld);

  return currentWorld;
}
