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

import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { StateImpact } from "@/engine/core/StateImpact";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { simulateBoutsForDay, advanceBashoDay } from "@/engine/core/world";
import {
  generateNakabiSummary,
  logNakabiCheckpoint,
  isNakabiDay,
} from "@/engine/basho/NakabiService";
import { mergeImpacts, applyImpact } from "@/engine/core/ImpactResolver";
import { applyOyakataIntervention } from "@/engine/npc/OyakataIntervention";
import { announceConditionalSansho } from "@/engine/basho/conditionalSansho";

export function phase01_basho_bouts(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase01_basho_bouts");

  if (world.cyclePhase !== "active_basho") return builder.build();
  const basho = world.currentBasho;
  if (!basho) return builder.build();

  let currentWorld = world;

  // Sanshō committee's morning-of-senshuraku session — provisional table on
  // days 1–14 plus "needs a win today" conditionals (WS-12 residual). Runs
  // before the day's bouts resolve; the binding award still lands in
  // distributePrizes on the completed results.
  if (basho.day === 15) {
    builder.merge(announceConditionalSansho(currentWorld, basho));
  }

  // Simulate all unplayed bouts for the current day in a single pass.
  // simulateBoutsForDay owns one mutable copy of the matches array and writes
  // each bout result by index — the old per-bout loop re-scanned and re-mapped
  // the full matches array on every call (O(matches²) per day, ~2.7M element
  // ops). Player tactics are read from world.boutTactics per bout (V5-B09).
  currentWorld = simulateBoutsForDay(currentWorld).world;

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
        // Resolve the intervention into the running world WITHOUT logging its
        // events a second time (they still flow through the merged impact):
        // later interventions must see interventionUsedThisBasho, and the
        // final entity diff below must not re-export the pre-intervention
        // rikishi over the merged update.
        currentWorld = applyImpact(currentWorld, intImpact);
      }
    }
  }

  // Advance the basho day after all bouts for today are resolved
  currentWorld = advanceBashoDay(currentWorld);

  // Nakabi checkpoint — log a mid-basho summary on day 8
  let nakabiImpact: StateImpact | null = null;
  if (currentWorld.currentBasho && isNakabiDay(currentWorld.currentBasho.day)) {
    const bashoRikishi: Rikishi[] = [];
    if (currentWorld.activeRikishiIds) {
      for (const id of currentWorld.activeRikishiIds) {
        const r = currentWorld.rikishi.get(id);
        if (r !== undefined) bashoRikishi.push(r);
      }
    }
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

  // simulateBoutForToday / advanceBashoDay resolve their sub-impacts into
  // currentWorld, but this phase only returns a delta impact — any world field
  // they touched must be re-exported or it is silently dropped. Previously
  // events survived via input-world mutation (removed by the V5-B11
  // immutability fix); mediaState/rivalriesState/etc. were already being lost.
  const PASSTHROUGH_FIELDS = [
    "events",
    "boutTactics",
    "mediaState",
    "rivalriesState",
    "transientContext",
    "playerKnowledge",
    // Written by resolveBout / applyBoutResult into currentWorld; would be
    // dropped without re-export (kimarite era stats, official pool updates).
    // activeRikishiIds: ensureDaySchedule (inside advanceBashoDay) adds
    // minted maezumo/callup entrants via collections — the rikishi map entry
    // re-exports through reexportEntityDiffs, but the index Set is a world
    // field and drops without this passthrough (map-present, index-absent
    // integrity violation).
    "activeRikishiIds",
    "globalKimariteStats",
    "allTimeKimariteStats",
    "shimpanPool",
    "gyojiPool",
    "bashoNpcPosture",
    // boutResultApplier appends kinboshi/award entries via arrayAppends — a
    // new awardLog array on currentWorld that must be re-exported.
    "awardLog",
    // Officiating (hansoku/yaocho → reportScandal) appends rulings here —
    // previously dropped silently along with the heya scandalScore writes.
    "governanceLog",
    // resolveMorningOfDay (inside advanceBashoDay) surfaces kyujo_decisions
    // + pendingCrisis for injured player entrants on the next day's card —
    // without re-export they'd be silently dropped from the phase delta.
    "pendingDecisions",
    "pendingCrisis",
    // Autonomous decision resolution (morning-of under _autonomousSim) writes
    // suppression ids + request queues; dropping resolvedDecisionIds caused a
    // duplicate DECISION_AUTO_RESOLVED per day (V20-E19).
    "resolvedDecisionIds",
    "pendingRikishiRequests",
    "pendingDegeikoInvites",
    "activeChains",
    "chainCooldowns",
  ] as const;
  for (const field of PASSTHROUGH_FIELDS) {
    if (currentWorld[field] !== world[field]) {
      builder.updateWorldField(field, currentWorld[field]);
    }
  }

  reexportEntityDiffs(builder, world, currentWorld);

  // Oyakata entity updates resolve into currentWorld.oyakata too (NPC
  // opponent learning from resolved bouts). oyakata is a Map, not a
  // worldField, so re-export changed entries by reference diff like rikishi.
  if (currentWorld.oyakata !== world.oyakata) {
    for (const [id, oya] of currentWorld.oyakata) {
      if (world.oyakata.get(id) !== oya) {
        builder.updateOyakata(id, oya);
      }
    }
  }

  if (nakabiImpact) {
    return mergeImpacts([builder.build(), nakabiImpact]);
  }

  return builder.build();
}

/**
 * Re-export heya/staff entity writes that resolved into `currentWorld` during
 * bout simulation (e.g. `scandalScore` from reportScandal). These are Maps, not
 * worldFields — diff by reference like the rikishi/oyakata re-exports above.
 */
function reexportEntityDiffs(
  builder: ReturnType<typeof createImpactBuilder>,
  world: WorldState,
  currentWorld: WorldState
): void {
  // Rikishi: every resolveBout/applyBoutResult/resolveMorningOfDay write
  // resolves into currentWorld.rikishi — diff the whole map by reference.
  // (Subsumes the old matchRikishiIds block, which missed morning-of-day
  // kyujo writes on next-day matches that have no result yet.)
  if (currentWorld.rikishi !== world.rikishi) {
    for (const [id, r] of currentWorld.rikishi) {
      if (world.rikishi.get(id) !== r) {
        builder.updateRikishi(id, r);
      }
    }
  }
  if (currentWorld.heyas !== world.heyas) {
    for (const [id, heya] of currentWorld.heyas) {
      if (world.heyas.get(id) !== heya) {
        builder.updateHeya(id, heya);
      }
    }
  }
  if (currentWorld.staff !== world.staff) {
    for (const [id, s] of currentWorld.staff) {
      if (world.staff.get(id) !== s) {
        builder.updateStaff(id, s);
      }
    }
  }
  // trainingState is a Map-valued collection — a world-field write can't
  // carry it, so it re-exports as an entity diff like the others (V20-E19).
  const curTs = currentWorld.trainingState;
  const baseTs = world.trainingState;
  if (curTs && curTs !== baseTs) {
    for (const [id, ts] of curTs) {
      if (baseTs?.get(id) !== ts) {
        builder.updateTrainingState(id, ts);
      }
    }
  }
}
