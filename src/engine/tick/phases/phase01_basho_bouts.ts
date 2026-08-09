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
 *   - Advances the basho day after all bouts are resolved.
 */

import type { WorldState } from "../../types/world";
import type { StateImpact } from "../../core/StateImpact";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { simulateBoutForToday, advanceBashoDay } from "../../world";
import { buildBashoMatchIndex } from "../../bout/bashoMatchIndex";
import {
  generateNakabiSummary,
  logNakabiCheckpoint,
  isNakabiDay,
} from "../../systems/basho/NakabiService";
import { mergeImpacts } from "../../core/ImpactResolver";
import { applyOyakataIntervention } from "../../actions/OyakataIntervention";

export function phase01_basho_bouts(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase01_basho_bouts");

  if (world.cyclePhase !== "active_basho") return builder.build();
  const basho = world.currentBasho;
  if (!basho) return builder.build();

  let currentWorld = world;

  // Pre-index matches by day for O(1) lookup (B1.4)
  const matchIndex = buildBashoMatchIndex(basho);

  // Simulate all unplayed bouts for the current day
  // Use a safety cap to avoid infinite loops from bad data
  const MAX_ITERATIONS = 128;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const currentBasho = currentWorld.currentBasho;
    if (!currentBasho) break;

    // Use pre-indexed matches for O(1) day lookup
    const dayMatches = matchIndex.get(currentBasho.day) ?? [];
    const todays = dayMatches.filter((m) => !m.result);
    if (todays.length === 0) break;

    const { world: nextWorld, result } = simulateBoutForToday(currentWorld, 0);
    currentWorld = nextWorld;
    if (!result) break;
  }

  // Oyakata intervention: NPC oyakata may intervene with slumping rikishi
  // Check after all bouts are resolved for the day, before advancing the day
  if (basho.day >= 5 && basho.day <= 13) {
    for (const rId of currentWorld.activeRikishiIds) {
      const r = currentWorld.rikishi.get(rId);
      if (!r) continue;
      // Skip player's heya — only NPC oyakata auto-apply interventions
      if (r.heyaId === currentWorld.playerHeyaId) continue;
      if (r.interventionUsedThisBasho) continue;
      if ((r.currentLossStreak ?? 0) < 2) continue;
      if (r.injured || r.isRetired || r.isKyujo) continue;

      const { success, impact: intImpact } = applyOyakataIntervention(currentWorld, rId);
      if (success) {
        builder.merge(intImpact);
        currentWorld = { ...currentWorld };
      }
    }
  }

  // Advance the basho day after all bouts for today are resolved
  currentWorld = advanceBashoDay(currentWorld);

  // Nakabi checkpoint — log a mid-basho summary on day 8
  let nakabiImpact: StateImpact | null = null;
  if (currentWorld.currentBasho && isNakabiDay(currentWorld.currentBasho.day)) {
    const bashoRikishi = currentWorld.activeRikishiIds
      ? Array.from(currentWorld.activeRikishiIds)
          .map((id) => currentWorld.rikishi.get(id))
          .filter((r): r is NonNullable<typeof r> => r !== undefined)
      : [];
    const summary = generateNakabiSummary(
      currentWorld,
      currentWorld.currentBasho.bashoName ?? "basho",
      bashoRikishi
    );
    nakabiImpact = logNakabiCheckpoint(currentWorld, summary);
  }

  // Emit the final currentBasho as a world field update
  if (currentWorld.currentBasho) {
    builder.updateWorldField("currentBasho", currentWorld.currentBasho);
  }

  // Collect any rikishi stat changes by diffing — the simulateBoutForToday
  // function resolves impacts internally, so we capture the final rikishi state
  // for any rikishi that appear in the basho matches.
  if (currentWorld.currentBasho) {
    const matchRikishiIds = new Set<string>();
    for (const m of currentWorld.currentBasho.matches ?? []) {
      if (m.result) {
        matchRikishiIds.add(m.eastRikishiId);
        matchRikishiIds.add(m.westRikishiId);
      }
    }
    for (const rId of matchRikishiIds) {
      const updated = currentWorld.rikishi.get(rId);
      if (updated) {
        builder.updateRikishi(rId, updated);
      }
    }
  }

  if (nakabiImpact) {
    return mergeImpacts([builder.build(), nakabiImpact]);
  }

  return builder.build();
}
