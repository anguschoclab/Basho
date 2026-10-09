/**
 * flowActionsPendingTick.test.ts
 *
 * Regression test for the bashoSlice-during-pendingTick race (audit finding).
 *
 * Interactive basho actions (SIMULATE_BOUT, SIMULATE_ALL_BOUTS, END_BASHO,
 * START_BASHO, SET_BOUT_TACTIC) mutate `state.world` on the main thread and
 * rely on useWorkerSync pushing the result to the worker via LOAD_WORLD.
 * That sync is deferred while `pendingTick` — and when the in-flight tick's
 * WORLD_UPDATED lands, `updateWorld` replaces `state.world` entirely, so the
 * deferred sync pushes the worker's own world back and the main-thread write
 * is silently lost (same failure class as the LOAD_WORLD mid-tick drop).
 *
 * The fix gates the world-mutating dispatchers on `pendingTick` and surfaces
 * the drop through `commandRejected` — the same user-visible mechanism
 * sendCommand uses.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFlowActions } from "@/contexts/provider/useFlowActions";
import { useGameStore } from "@/store/gameStore";
import type { GameState, GameAction } from "@/contexts/gameTypes";
import { MockFactory } from "../../helpers/utils/MockFactory";

function renderFlowActions() {
  const dispatch = vi.fn<(a: GameAction) => void>();
  const startTransition = (cb: () => void) => cb();
  const state = {
    world: MockFactory.createWorld({}),
    uiWorldRevision: 0,
  } as unknown as GameState;
  const { result } = renderHook(() => useFlowActions(state, dispatch, startTransition));
  return { result, dispatch };
}

describe("useFlowActions — world-mutating dispatchers vs pendingTick", () => {
  beforeEach(() => {
    useGameStore.setState({
      pendingTick: false,
      commandRejected: null,
      worker: { postMessage: vi.fn() } as unknown as Worker,
    });
  });

  it.each([
    ["startBasho", (f: ReturnType<typeof useFlowActions>) => f.startBasho()],
    ["simulateBout", (f: ReturnType<typeof useFlowActions>) => f.simulateBout(0, "b1")],
    ["simulateAllBouts", (f: ReturnType<typeof useFlowActions>) => f.simulateAllBouts()],
    ["endBasho", (f: ReturnType<typeof useFlowActions>) => f.endBasho()],
    [
      "setBoutTactic",
      (f: ReturnType<typeof useFlowActions>) =>
        f.setBoutTactic("b1", "attack" as never),
    ],
  ])("drops %s mid-tick instead of letting the write be reverted", (label, invoke) => {
    useGameStore.setState({ pendingTick: true });
    const { result, dispatch } = renderFlowActions();

    invoke(result.current);

    expect(dispatch, `${label} must not mutate world mid-tick`).not.toHaveBeenCalled();
    const notice = useGameStore.getState().commandRejected;
    expect(notice, `${label} drop must surface a notice`).toBeTruthy();
  });

  it.each([
    ["startBasho", (f: ReturnType<typeof useFlowActions>) => f.startBasho()],
    ["simulateBout", (f: ReturnType<typeof useFlowActions>) => f.simulateBout(0, "b1")],
    ["endBasho", (f: ReturnType<typeof useFlowActions>) => f.endBasho()],
  ])("dispatches %s normally when no tick is pending", (label, invoke) => {
    useGameStore.setState({ pendingTick: false });
    const { result, dispatch } = renderFlowActions();

    invoke(result.current);

    expect(dispatch, `${label} should dispatch when idle`).toHaveBeenCalled();
  });
});
