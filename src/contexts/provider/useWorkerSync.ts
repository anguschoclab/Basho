/**
 * useWorkerSync.ts
 *
 * Worker lifecycle + world-sync effects for GameProvider: worker init,
 * world-update subscription, autosave side-effect, debug exposure, and
 * the uiWorldRevision → worker LOAD_WORLD sync. Also builds the weekly
 * digest fallback when the store lacks one.
 */

import { useMemo, useEffect, useRef } from "react";
import { error as logError } from "@/engine/utils/Logger";
import type { WorldState } from "@/engine/types/world";
import { autosaveWithSignal } from "../gameHelpers";
import { buildWeeklyDigest } from "@/presenters/uiDigest";
import type { GameState } from "../gameTypes";
import * as actions from "../gameActions";
import { useGameStore } from "@/store/gameStore";

export function useWorkerSync(
  state: GameState,
  dispatch: React.Dispatch<import("../gameTypes").GameAction>,
  startTransition: (cb: () => void) => void
) {
  const sendCommand = useGameStore((s) => s.sendCommand);
  const initWorker = useGameStore((s) => s.initWorker);
  const setOnWorldUpdated = useGameStore((s) => s.setOnWorldUpdated);

  // Build digest outside the reducer (selector pattern) — pure, memoized.
  // The worker already builds the digest via buildWeeklyDigest — we only
  // rebuild locally if the store doesn't have one yet (e.g. main-thread
  // actions like SIMULATE_BOUT that don't go through the worker).
  const storeDigest = useGameStore((s) => s.digest);
  const digest = useMemo(() => {
    if (storeDigest) return storeDigest;
    if (!state.world) return null;
    try {
      return buildWeeklyDigest(state.world);
    } catch (err) {
      logError("Error building weekly digest", "GameContext", err);
      return null;
    }
  }, [storeDigest, state.world]);

  // Initialize worker once on mount and wire world-update sync
  useEffect(() => {
    initWorker();
    setOnWorldUpdated((world: WorldState) => {
      startTransition(() => dispatch(actions.updateWorld(world)));
    });
  }, [initWorker, setOnWorldUpdated, dispatch, startTransition]);

  // B4.1.2: Autosave as a side-effect of world changes, not inside the reducer.
  // This preserves reducer purity. The effect debounces via the world reference.
  useEffect(() => {
    if (state.world) {
      try {
        autosaveWithSignal(state.world);
      } catch {
        /* silent */
      }
    }
  }, [state.world]);

  // Expose the live world for E2E/debug inspection. Zero-cost (a reference,
  // not a copy) and lets tests poll world state without depending on
  // localStorage quota or save timing.
  useEffect(() => {
    (window as { __BASHO_WORLD__?: unknown }).__BASHO_WORLD__ = state.world;
    (window as { __BASHO_STORE__?: unknown }).__BASHO_STORE__ = useGameStore;
  }, [state.world]);

  // V5-B09: the interactive basho path (SIMULATE_BOUT / SIMULATE_ALL_BOUTS /
  // SET_BOUT_TACTIC / END_BASHO) still resolves on the main thread for
  // synchronous match animation. Those slice cases bump state.uiWorldRevision;
  // this effect pushes the resulting world to the worker via LOAD_WORLD so the
  // worker's authoritative copy can't go stale and re-resolve the day without
  // player tactics on the next TICK_DAY.
  // Gated on pendingTick: sendCommand drops commands mid-tick, so we wait for
  // the flag to clear and re-run rather than silently losing the sync.
  const pendingTick = useGameStore((s) => s.pendingTick);
  const lastSyncedUiRevision = useRef(0);
  useEffect(() => {
    const rev = state.uiWorldRevision ?? 0;
    if (!state.world || rev <= lastSyncedUiRevision.current || pendingTick) return;
    lastSyncedUiRevision.current = rev;
    sendCommand({ type: "LOAD_WORLD", world: state.world });
  }, [state.world, state.uiWorldRevision, pendingTick, sendCommand]);

  return { digest };
}
