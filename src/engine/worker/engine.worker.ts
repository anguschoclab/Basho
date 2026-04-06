/**
 * engine.worker.ts
 * =================
 * Web Worker for the Basho Engine.
 * This runs the simulation off the main thread to prevent UI blocking.
 */

import type { WorldState } from "../types/world";
import { tickOrchestrator, cloneWorldForTick } from "../tick/tickOrchestrator";
import { buildWeeklyDigest } from "../../presenters/uiDigest";
import { generateInitialWorld } from "../systems/generation/WorldFactory";
/** Adapter matching the { seed, playerConfig? } call shape used in this worker */
function generateWorld(opts: { seed: string; playerConfig?: { heyaId?: string } }) {
  const world = generateInitialWorld(opts.seed);
  if (opts.playerConfig?.heyaId) world.playerHeyaId = opts.playerConfig.heyaId;
  return world;
}
import { runAutoSim } from "../autoSim";
import type { EngineCommand, EngineEvent } from "./types";

let currentWorld: WorldState | null = null;

/**
 * Handle incoming commands from the UI.
 *  * @param event - The Event.
 */
self.onmessage = async (event: MessageEvent<EngineCommand>) => {
  const command = event.data;

  try {
    switch (command.type) {
      case "START_WORLD":
        // Initialize a new world state
        currentWorld = generateWorld({ seed: command.seed, playerConfig: { heyaId: command.playerHeyaId } });
        emitDigest();
        break;

      case "LOAD_WORLD":
        currentWorld = command.world;
        emitDigest();
        break;

      case "TICK_DAY":
        if (currentWorld) {
          currentWorld = tickOrchestrator(currentWorld);
          emitDigest();
        }
        break;

      case "AUTO_SIM_DAYS":
        if (currentWorld) {
          for (let i = 0; i < command.days; i++) {
            currentWorld = tickOrchestrator(currentWorld);
            // Optional: Emit progress for long sims
            if (i % 5 === 0) {
              self.postMessage({
                type: "PROGRESS",
                message: `Simulating day ${i + 1} of ${command.days}...`,
                current: i + 1,
                total: command.days,
              });
            }
          }
          emitDigest();
          // Return updated world so main thread can sync its own state
          self.postMessage({ type: "WORLD_UPDATED", world: currentWorld });
        }
        break;

      case "GET_DIGEST":
        emitDigest();
        break;

      default:
        console.warn(`[Worker] Unknown command: ${(command as any).type}`);
    }
  } catch (err: any) {
    self.postMessage({ type: "ERROR", message: err.message || "Unknown engine error" });
  }
};

/**
 * Build and emit the latest UI digest.
 *  * @returns The result.
 */
function emitDigest() {
  if (!currentWorld) return;
  const digest = buildWeeklyDigest(currentWorld);
  if (digest) {
    self.postMessage({ type: "TICK_COMPLETED", digest });
  }
}

// Signal that worker is ready
self.postMessage({ type: "READY", worldExists: !!currentWorld });
