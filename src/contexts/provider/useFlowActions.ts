/**
 * useFlowActions.ts
 *
 * World/basho lifecycle actions for GameProvider — world creation,
 * phase transitions, day/bout simulation, and direct world updates.
 */

import { useCallback, useMemo } from "react";
import type { WorldState } from "@/engine/types/world";
import type { GameState, GamePhase, GameAction } from "../gameTypes";
import * as actions from "../gameActions";
import { useGameStore } from "@/store/gameStore";
import { warn } from "@/engine/utils/Logger";

export function useFlowActions(
  state: GameState,
  dispatch: React.Dispatch<import("../gameTypes").GameAction>,
  startTransition: (cb: () => void) => void
) {
  const sendCommand = useGameStore((s) => s.sendCommand);

  const createWorld = useCallback(
    (
      seed: string,
      playerHeyaId?: string,
      oyakataConfig?: import("@/engine/types/oyakata").OyakataCreationConfig
    ) => {
      // B4.1.1: Worker is the single source of truth.
      // Only send START_WORLD to the worker — the worker generates the world
      // and emits WORLD_UPDATED, which is handled by the onWorldUpdated callback
      // (wired above) to dispatch updateWorld into the reducer.
      // This eliminates the redundant main-thread world generation that caused
      // divergence risk between reducer and worker state.
      // oyakataConfig carries the wizard's name/backstory/ichimon choices —
      // the worker applies them via applyOyakataCreationConfig.
      sendCommand({ type: "START_WORLD", seed, playerHeyaId, oyakataConfig });
    },
    [sendCommand]
  );

  const setPhase = useCallback((phase: GamePhase) => dispatch(actions.setPhase(phase)), [dispatch]);

  // World-mutating bashoSlice dispatches must not fire while pendingTick:
  // useWorkerSync defers the LOAD_WORLD sync, and the in-flight tick's
  // WORLD_UPDATED then replaces state.world before the deferred sync runs —
  // the main-thread write is silently lost. Same gate as sendCommand, same
  // user-visible notice.
  const dispatchWorldMutation = useCallback(
    (label: string, action: GameAction) => {
      if (useGameStore.getState().pendingTick) {
        const notice = `Action "${label}" dropped - tick in progress`;
        warn(notice, "GameContext");
        useGameStore.setState({ commandRejected: notice });
        return;
      }
      dispatch(action);
    },
    [dispatch]
  );

  const startBasho = useCallback(
    () => dispatchWorldMutation("START_BASHO", actions.startBasho()),
    [dispatchWorldMutation]
  );
  const advanceDay = useCallback(() => sendCommand({ type: "TICK_DAY" }), [sendCommand]);
  const simulateBout = useCallback(
    (index: number, boutId?: string) =>
      dispatchWorldMutation("SIMULATE_BOUT", actions.simulateBout(index, boutId)),
    [dispatchWorldMutation]
  );
  const setBoutTactic = useCallback(
    (id: string, tactic: import("@/engine/types/combat").BoutTactic) =>
      dispatchWorldMutation("SET_BOUT_TACTIC", actions.setBoutTactic(id, tactic)),
    [dispatchWorldMutation]
  );
  const simulateAllBouts = useCallback(
    () =>
      startTransition(() =>
        dispatchWorldMutation("SIMULATE_ALL_BOUTS", actions.simulateAllBouts())
      ),
    [dispatchWorldMutation, startTransition]
  );
  const endDay = useCallback(() => dispatch(actions.endDay()), [dispatch]);
  const endBasho = useCallback(
    () => dispatchWorldMutation("END_BASHO", actions.endBasho()),
    [dispatchWorldMutation]
  );
  const simFullBasho = useCallback(() => {
    // Route through the worker as TICK_MULTIPLE_DAYS with enough days to
    // finish the remaining basho days. The pipeline's phase01_basho_bouts
    // phase handles bout resolution and basho day advancement.
    const currentDay = state.world?.currentBasho?.day ?? 1;
    const remainingDays = Math.max(1, 15 - currentDay + 1);
    sendCommand({ type: "TICK_MULTIPLE_DAYS", days: remainingDays });
  }, [sendCommand, state.world?.currentBasho?.day]);
  const tickMultipleDays = useCallback(
    (days: number) => sendCommand({ type: "TICK_MULTIPLE_DAYS", days }),
    [sendCommand]
  );
  const advanceInterim = useCallback(
    (weeks: number = 1) => sendCommand({ type: "TICK_MULTIPLE_DAYS", days: weeks * 7 }),
    [sendCommand]
  );
  const advanceOneDay = useCallback(() => sendCommand({ type: "TICK_DAY" }), [sendCommand]);
  const updateWorld = useCallback(
    (world: WorldState) => dispatch(actions.updateWorld(world)),
    [dispatch]
  );

  return useMemo(
    () => ({
      createWorld,
      setPhase,
      startBasho,
      advanceDay,
      simulateBout,
      setBoutTactic,
      simulateAllBouts,
      endDay,
      endBasho,
      simFullBasho,
      tickMultipleDays,
      advanceInterim,
      advanceOneDay,
      updateWorld,
    }),
    [
      createWorld,
      setPhase,
      startBasho,
      advanceDay,
      simulateBout,
      setBoutTactic,
      simulateAllBouts,
      endDay,
      endBasho,
      simFullBasho,
      tickMultipleDays,
      advanceInterim,
      advanceOneDay,
      updateWorld,
    ]
  );
}
