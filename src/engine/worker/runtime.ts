/**
 * runtime.ts
 * =================
 * Mutable runtime state for the Basho Engine Web Worker.
 * Holds the world reference, versioning counters, and the emit/sync
 * helpers shared by every command handler.
 */

import type { WorldState } from "@/engine/types/world";
import type { WorkerEvent } from "@/engine/worker/types";
import { buildWeeklyDigest } from "./digestProjections";

export interface WorkerRuntime {
  world: WorldState | null;
  worldVersion: number;
  digestRevision: number;
  simPaused: boolean;
  /** >0 while a pendingTick-setting command (TICK_DAY / TICK_MULTIPLE_DAYS /
   *  GO_ON_HOLIDAY) is executing. */
  tickDepth: number;
  post(event: WorkerEvent): void;
  emitDigest(): void;
  syncWorld(): void;
  syncAndDigest(): void;
}

export function createWorkerRuntime(): WorkerRuntime {
  const rt: WorkerRuntime = {
    world: null,
    worldVersion: 0,
    digestRevision: 0,
    simPaused: false,
    tickDepth: 0,
    post: (event) => self.postMessage(event),

    /**
     * Builds and emits the latest UI digest to the main thread.
     * This digest is used to update the UI components with current game data.
     *
     * TICK_COMPLETED is reserved for messages posted while a tick command is
     * in flight — the main thread clears pendingTick/isSimulating on it, so
     * a non-tick command's digest must go out as DIGEST_UPDATED. Otherwise a
     * RESOLVE/LOAD_WORLD completing ahead of a queued TICK clears pendingTick
     * mid-tick and the drop-guard lets commands interleave into the running
     * advance (observed e2e: a LOAD_WORLD graft clobbered by a queued
     * multi-day tick).
     */
    emitDigest() {
      if (!rt.world) return;
      const digest = buildWeeklyDigest(rt.world);
      if (digest) {
        rt.digestRevision++;
        rt.post({
          type: rt.tickDepth > 0 ? "TICK_COMPLETED" : "DIGEST_UPDATED",
          digest,
          digestRevision: rt.digestRevision,
        });
      }
    },

    /**
     * Sync the latest world state to the main thread.
     */
    syncWorld() {
      if (!rt.world) return;
      rt.worldVersion++;
      rt.post({
        type: "WORLD_UPDATED",
        world: rt.world,
        version: rt.worldVersion,
        clearsPendingTick: rt.tickDepth > 0,
      });
    },

    /**
     * Emits the UI digest and syncs the world state to the main thread.
     * Consolidates the repeated emitDigest() + syncWorld() pattern.
     */
    syncAndDigest() {
      rt.emitDigest();
      rt.syncWorld();
    },
  };
  return rt;
}
