/**
 * runtime.ts
 * =================
 * Mutable runtime state for the Basho Engine Web Worker.
 * Holds the world reference, versioning counters, and the emit/sync
 * helpers shared by every command handler.
 */

import type { WorldState } from "../types/world";
import type { EngineEvent } from "./types";
import { buildWeeklyDigest } from "../../presenters/uiDigest";

export interface WorkerRuntime {
  world: WorldState | null;
  worldVersion: number;
  digestRevision: number;
  simPaused: boolean;
  post(event: EngineEvent): void;
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
    post: (event) => self.postMessage(event),

    /**
     * Builds and emits the latest UI digest to the main thread.
     * This digest is used to update the UI components with current game data.
     */
    emitDigest() {
      if (!rt.world) return;
      const digest = buildWeeklyDigest(rt.world);
      if (digest) {
        rt.digestRevision++;
        rt.post({ type: "TICK_COMPLETED", digest, digestRevision: rt.digestRevision });
      }
    },

    /**
     * Sync the latest world state to the main thread.
     */
    syncWorld() {
      if (!rt.world) return;
      rt.worldVersion++;
      rt.post({ type: "WORLD_UPDATED", world: rt.world, version: rt.worldVersion });
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
