/**
 * commands/lifecycle.ts
 * =====================
 * World lifecycle commands: world init/load, day ticking, multi-day
 * advance, and pause/resume control.
 */

import type { WorldState } from "../../types/world";
import { tickOrchestrator, advanceDaysFastOrchestrator } from "../../tick/tickOrchestrator";
import { generateInitialWorld } from "../../systems/generation/WorldFactory";
import { isForeign } from "../../utils/identity";
import { shouldHaltAdvance } from "../../loop/shouldHaltAdvance";
import { clearQueryCaches } from "../../queries";
import { TARGET_ROSTER_SIZE } from "../../../constants/engine/recruitmentExtended";
import { applyOyakataCreationConfig } from "../../systems/generation/applyOyakataConfig";
import type { WorkerRuntime } from "../runtime";
import type { CommandHandlerMap } from "./types";

/**
 * Adapter matching the { seed, playerConfig? } call shape used in this worker.
 * Initializes a new game world.
 *
 * @param {Object} opts - Generation options.
 * @param {string} opts.seed - The random seed for world generation.
 * @param {Object} [opts.playerConfig] - Optional player configuration.
 * @param {string} [opts.playerConfig.heyaId] - Optional starting heya ID for the player.
 * @returns {WorldState} The newly generated world state.
 */
function generateWorld(opts: {
  seed: string;
  playerConfig?: {
    heyaId?: string;
    oyakataConfig?: import("../../types/oyakata").OyakataCreationConfig;
  };
}) {
  let world = generateInitialWorld(opts.seed);
  if (opts.playerConfig?.heyaId && opts.playerConfig.heyaId !== world.playerHeyaId) {
    world.playerHeyaId = opts.playerConfig.heyaId; // @world-builder
    // WorldFactory computed _populationTarget against its placeholder
    // playerHeyaId (first generated heya) — recompute so the player's actual
    // stable is the excluded one and the NPC capacity total is right.
    let targetPop = 0;
    for (const h of world.heyas.values()) {
      if (h.id !== world.playerHeyaId) targetPop += TARGET_ROSTER_SIZE;
    }
    world._populationTarget = targetPop;
  }
  if (opts.playerConfig?.oyakataConfig && world.playerHeyaId) {
    world = applyOyakataCreationConfig(world, world.playerHeyaId, opts.playerConfig.oyakataConfig);
  }
  return world;
}

/**
 * Migrates old save format to work with Phase J citizenship rules.
 * Back-computes joinedHeyaDate for existing rikishi if missing.
 *
 * @param {WorldState} world - The world state to migrate.
 * @returns {WorldState} The migrated world state.
 */
function migrateWorldState(world: WorldState): WorldState {
  const currentYear = world.year;
  let rikishiChanged = false;
  const nextRikishi = new Map(world.rikishi);

  for (const [id, r] of nextRikishi) {
    let nextR = r;
    if (!r.joinedHeyaDate) {
      nextR = { ...nextR, joinedHeyaDate: String(currentYear - 5) };
      rikishiChanged = true;
    }
    if (!r.citizenshipStatus) {
      nextR = {
        ...nextR,
        citizenshipStatus: !isForeign(r) ? "native" : "foreign",
      };
      rikishiChanged = true;
    }
    if (nextR !== r) {
      nextRikishi.set(id, nextR);
    }
  }

  return rikishiChanged ? { ...world, rikishi: nextRikishi } : world;
}

export function lifecycleCommands(rt: WorkerRuntime): CommandHandlerMap {
  return {
    START_WORLD: (cmd) => {
      rt.world = generateWorld({
        seed: cmd.seed,
        playerConfig: { heyaId: cmd.playerHeyaId, oyakataConfig: cmd.oyakataConfig },
      });
      // B4.1.1: Sync world back to main thread so the reducer can load it.
      // This makes the worker the single source of truth — the main thread
      // no longer generates worlds independently.
      rt.syncWorld();
      rt.emitDigest();
    },
    LOAD_WORLD: (cmd) => {
      // V7-B13: drop any per-week memoized query state from the previous world.
      clearQueryCaches();
      rt.world = migrateWorldState(cmd.world);
      rt.emitDigest();
    },
    TICK_DAY: () => {
      if (rt.world) {
        rt.world = tickOrchestrator(rt.world);
        rt.syncAndDigest();
      }
    },
    TICK_MULTIPLE_DAYS: async (cmd) => {
      if (rt.world) {
        const days = cmd.days;
        // Use fast path (skip daily micro-phases) only for week+ advances.
        // Short advances (2-6 days) should run full daily micro-phases for correctness.
        const useFast = days >= 7;
        const chunk = useFast ? 7 : 1;

        for (let i = 0; i < days; i += chunk) {
          // B4.1.4 INVARIANT: simPaused is ONLY read here at the loop top,
          // never inside the chunk processing below. This ensures pause is
          // strictly between-chunk — currentWorld is not yet advanced when
          // the retry occurs, so no partial advancement can be re-run.
          if (rt.simPaused) {
            // Yield control and resume on next iteration when RESUME_SIM clears the flag
            await new Promise((resolve) => setTimeout(resolve, 100));
            i -= chunk; // retry same chunk
            continue;
          }

          const remaining = days - i;
          const step = Math.min(chunk, remaining);

          if (useFast) {
            rt.world = advanceDaysFastOrchestrator(rt.world, step);
          } else {
            for (let j = 0; j < step; j++) {
              rt.world = tickOrchestrator(rt.world);
            }
          }

          if (shouldHaltAdvance(rt.world)) {
            rt.post({
              type: "PROGRESS",
              message: `Paused for a decision on day ${i + step} of ${days}.`,
              current: i + step,
              total: days,
            });
            break;
          }

          if (i % 7 === 0 || i + step >= days) {
            rt.post({
              type: "PROGRESS",
              message: `Advancing day ${i + step} of ${days}...`,
              current: i + step,
              total: days,
            });
          }
        }

        rt.emitDigest();
        rt.worldVersion++;
        rt.post({ type: "WORLD_UPDATED", world: rt.world, version: rt.worldVersion });
      }
    },
    PAUSE_SIM: () => {
      rt.simPaused = true;
      rt.post({ type: "PROGRESS", message: "Simulation paused", current: 0, total: 0 });
    },
    RESUME_SIM: () => {
      rt.simPaused = false;
      rt.post({ type: "PROGRESS", message: "Simulation resumed", current: 0, total: 0 });
    },
  };
}
