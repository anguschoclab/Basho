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
import { warn } from "../engine/utils/Logger";

/**
 * Represents the state and actions available in the global Game Store.
 */
interface GameStoreState {
  /** The UI-visible summary of the game state. */
  digest: UIDigest | null;
  /** Monotonic revision counter — increments only when the worker builds a new digest. */
  digestRevision: number;
  /** Last world state received from the worker after long-running simulations. */
  workerWorld: WorldState | null;
  /** Monotonic version counter for state synchronization. */
  worldVersion: number;
  /** Lock flag to prevent concurrent tick commands. */
  pendingTick: boolean;
  /** Whether the engine is currently busy with a simulation. */
  isSimulating: boolean;
  /** Current simulation progress details. */
  progress: { message: string; current: number; total: number } | null;
  /** Error message if a simulation fails. */
  error: string | null;
  /** Whether to show the onboarding tour. */
  showTour: boolean;
  /** Reason for dismissing the tour (e.g., 'completed', 'skipped'). */
  dismissedTourReason: string | null;

  /** Reference to the engine background worker. */
  worker: Worker | null;

  /**
   * Optional callback invoked when the worker emits WORLD_UPDATED.
   * Used to sync the main-thread world after worker-driven simulation completes.
   */
  onWorldUpdated: ((world: WorldState) => void) | null;

  // Actions
  /** Initializes the engine background worker. */
  initWorker: () => void;
  /** Sends a command to the background worker. */
  sendCommand: (command: EngineCommand) => void;
  /** Sets the UI digest. */
  setDigest: (digest: UIDigest) => void;
  /** Toggles the simulation state. */
  setSimulating: (isSimulating: boolean) => void;
  /** Updates simulation progress. */
  setProgress: (progress: { message: string; current: number; total: number } | null) => void;
  /** Sets the error state. */
  setError: (error: string | null) => void;
  /** Sets the world updated callback. */
  setOnWorldUpdated: (cb: ((world: WorldState) => void) | null) => void;
  /** Dismisses the onboarding tour. */
  dismissTour: (reason: string) => void;
  /** Checks if the onboarding tour should be triggered based on world state. */
  checkTourTrigger: (world: WorldState) => void;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  digest: null,
  digestRevision: 0,
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
          break;
        case "TICK_COMPLETED":
          set({
            digest: data.digest,
            digestRevision: data.digestRevision ?? get().digestRevision + 1,
            isSimulating: false,
            progress: null,
            pendingTick: false,
          });
          break;
        case "DIGEST_UPDATED":
          set({
            digest: data.digest,
            digestRevision: data.digestRevision ?? get().digestRevision + 1,
          });
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
          set({ error: data.message, isSimulating: false, pendingTick: false });
          break;
      }
    };

    set({ worker });
  },

  sendCommand: (command: EngineCommand) => {
    const { worker, initWorker, pendingTick } = get();

    // B4.1.3: Reject ALL commands while a tick is in progress.
    // Previously only tick commands were blocked, but non-tick commands
    // (OFFER_CONTRACT, BUY_MYOSEKI, etc.) could interleave with async
    // TICK_MULTIPLE_DAYS loops via the worker's await yield point.
    if (pendingTick) {
      warn(`Command "${command.type}" dropped - tick in progress`, "Store");
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
    } else if (command.type === "GO_ON_HOLIDAY") {
      // GO_ON_HOLIDAY advances the sim on the worker thread; serialize it so
      // repeated clicks can't interleave with the holiday advance loop.
      set({ isSimulating: true, error: null, pendingTick: true });
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
