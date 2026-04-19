/**
 * gameStore.ts
 * ============
 * Zustand store for Basho Engine Phase 2.
 * Manages the Web Worker lifecycle and the UI-visible state (UIDigest).
 */

import { create } from "zustand";
import type { UIDigest } from "../presenters/uiDigest";
import type { WorldState } from "../engine/types/world";
import type { EngineCommand, EngineEvent } from "../engine/worker/types";

interface GameStoreState {
  digest: UIDigest | null;
  /** Last world state received from the worker after AUTO_SIM_DAYS. */
  workerWorld: WorldState | null;
  /** Monotonic version counter for state synchronization */
  worldVersion: number;
  /** Lock flag to prevent concurrent tick commands */
  pendingTick: boolean;
  isSimulating: boolean;
  progress: { message: string; current: number; total: number } | null;
  error: string | null;
  showTour: boolean;
  dismissedTourReason: string | null; // e.g., 'completed', 'skipped'

  // Worker reference
  worker: Worker | null;

  /**
   * Optional callback invoked when the worker emits WORLD_UPDATED.
   * Set this from GameContext to keep the main-thread world in sync
   * after a worker-driven AUTO_SIM_DAYS completes.
   */
  onWorldUpdated: ((world: WorldState) => void) | null;

  // Actions
  initWorker: () => void;
  sendCommand: (command: EngineCommand) => void;
  setDigest: (digest: UIDigest) => void;
  setSimulating: (isSimulating: boolean) => void;
  setProgress: (progress: { message: string; current: number; total: number } | null) => void;
  setError: (error: string | null) => void;
  setOnWorldUpdated: (cb: ((world: WorldState) => void) | null) => void;
  dismissTour: (reason: string) => void;
  checkTourTrigger: (world: WorldState) => void;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  digest: null,
  workerWorld: null,
  worldVersion: 0,
  pendingTick: false,
  isSimulating: false,
  progress: null,
  error: null,
  showTour: false,
  dismissedTourReason: null,
  worker: null,
  onWorldUpdated: null,

  initWorker: () => {
    if (get().worker) return;

    // Vite-native worker initialization
    const worker = new Worker(new URL("../engine/worker/engine.worker.ts", import.meta.url), {
      type: "module",
    });

    worker.onmessage = (event: MessageEvent<EngineEvent>) => {
      const data = event.data;

      switch (data.type) {
        case "READY":
          console.log("[Store] Engine Worker Ready");
          break;
        case "TICK_COMPLETED":
          set({ digest: data.digest, isSimulating: false, progress: null });
          break;
        case "DIGEST_UPDATED":
          set({ digest: data.digest });
          break;
        case "WORLD_UPDATED":
          set({
            workerWorld: data.world,
            worldVersion: data.version ?? get().worldVersion + 1,
            pendingTick: false,
          });
          get().onWorldUpdated?.(data.world);
          get().checkTourTrigger(data.world);
          break;
        case "PROGRESS":
          set({ progress: { message: data.message, current: data.current, total: data.total } });
          break;
        case "ERROR":
          set({ error: data.message, isSimulating: false });
          break;
      }
    };

    set({ worker });
  },

  sendCommand: (command: EngineCommand) => {
    const { worker, initWorker, pendingTick } = get();

    // Prevent concurrent tick commands
    if (
      pendingTick &&
      (command.type === "TICK_DAY" ||
        command.type === "AUTO_SIM_DAYS" ||
        command.type === "TICK_MULTIPLE_DAYS")
    ) {
      console.warn("[Store] Tick command dropped - another tick is in progress");
      return;
    }

    if (!worker) {
      initWorker();
    }

    // Some commands imply simulation start
    if (command.type === "AUTO_SIM_DAYS" || command.type === "TICK_MULTIPLE_DAYS") {
      set({ isSimulating: true, error: null, pendingTick: true });
    } else if (command.type === "TICK_DAY") {
      set({ pendingTick: true });
    }

    get().worker?.postMessage(command);
  },

  setDigest: (digest) => set({ digest }),
  setSimulating: (isSimulating) => set({ isSimulating }),
  setProgress: (progress) => set({ progress }),
  setError: (error) => set({ error }),
  setOnWorldUpdated: (cb) => set({ onWorldUpdated: cb }),
  dismissTour: (reason: string) => {
    localStorage.setItem("sumo_tour_dismissed", "true");
    set({ showTour: false, dismissedTourReason: reason });
  },
  checkTourTrigger: (world: WorldState) => {
    if (localStorage.getItem("sumo_tour_dismissed")) return;
    if (get().dismissedTourReason) return;

    const step = world.tutorialState?.currentStep;
    const isInterim = world.cyclePhase === "interim";

    if (isInterim && step === "FIRST_BASHO_STARTED") {
      set({ showTour: true });
    }
  },
}));
