/**
 * v18WorkerSyncOrder.test.ts
 * ==========================
 * V18 failing-first regression pin for the sim-day worker-sync race.
 *
 * `useCalendarActions.handleSimDay` (src/hooks/useCalendarActions.ts:30-35)
 * calls `simulateAllBouts()` + `endDay()` — main-thread world mutations that
 * bump `state.uiWorldRevision` — and immediately `advanceDay()`, which posts
 * `TICK_DAY` to the worker. The `uiWorldRevision → LOAD_WORLD` sync in
 * `useWorkerSync` (src/state/game/provider/useWorkerSync.ts:82-87) DEFERS
 * while `pendingTick` is set — which `TICK_DAY` sets synchronously inside
 * `sendCommand` (src/state/stores/gameStore.ts:180-181). So under current
 * code the worker ticks its stale pre-bout copy, and the deferred LOAD_WORLD
 * (sent after the tick's WORLD_UPDATED lands and `updateWorld` has replaced
 * `state.world` with the tick output) can push the *stale-tick* world back —
 * the interactive bout results the player watched are lost either way.
 *
 * Pin invariant: a world mutation that bumps `uiWorldRevision` must reach the
 * worker (LOAD_WORLD carrying the post-mutation world) BEFORE any TICK_DAY
 * issued in the same action.
 *
 * Seam: the real `GameProvider` (real reducer + real `useWorkerSync` +
 * real `useFlowActions` + real `useGameStore.sendCommand`) with only the
 * Worker object faked — `sendCommand`'s `postMessage` boundary is where the
 * ordering is observable.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { GameProvider } from "@/state/game/GameContext";
import { useGame } from "@/state/game/useGame";
import { useGameStore } from "@/state/stores/gameStore";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { EngineCommand } from "@/engine/worker/types";
import type { WorldState } from "@/engine/types/world";
import type { MatchSchedule } from "@/engine/types/basho";
import type { SponsorPool } from "@/engine/types/sponsors";

const workerPostMessage = vi.fn();
const fakeWorker = { postMessage: workerPostMessage } as unknown as Worker;

/** Minimal active-basho world: one unresolved day-1 bout (player vs NPC). */
function activeBashoWorld(): WorldState {
  const east = MockFactory.createRikishi("east", { heyaId: "h-player", side: "east" });
  const west = MockFactory.createRikishi("west", { heyaId: "h-npc", side: "west" });
  const matches: MatchSchedule[] = [
    { boutId: "b1", day: 1, eastRikishiId: "east", westRikishiId: "west" },
  ];
  return MockFactory.createWorld({
    playerHeyaId: "h-player",
    cyclePhase: "active_basho",
    rikishi: new Map([
      ["east", east],
      ["west", west],
    ]),
    heyas: new Map([
      ["h-player", MockFactory.createHeya("h-player", { rikishiIds: ["east"] })],
      ["h-npc", MockFactory.createHeya("h-npc", { rikishiIds: ["west"] })],
    ]),
    currentBasho: MockFactory.createBasho({
      day: 1,
      matches,
      standings: new Map([
        ["east", { wins: 0, losses: 0 }],
        ["west", { wins: 0, losses: 0 }],
      ]),
    }),
    sponsorPool: {
      sponsors: new Map(),
      koenkais: new Map(),
    } as unknown as SponsorPool,
    rivalriesState: { pairs: {}, version: "1.0.0" } as never,
  });
}

function sentCommands(): EngineCommand[] {
  return workerPostMessage.mock.calls.map(([cmd]) => cmd as EngineCommand);
}

function syncBeforeTick(commands: EngineCommand[], label: string) {
  const types = commands.map((c) => c.type);
  const tickIndex = types.indexOf("TICK_DAY");
  const loadIndex = types.indexOf("LOAD_WORLD");
  expect(tickIndex, `sanity: ${label} dispatched TICK_DAY`).toBeGreaterThanOrEqual(0);
  // RED: the sync effect defers on pendingTick, so no LOAD_WORLD is posted at
  // all — the worker ticks its stale pre-mutation world.
  expect(
    loadIndex,
    `${label}: the post-mutation world must be synced (LOAD_WORLD) before the tick`
  ).toBeGreaterThanOrEqual(0);
  expect(loadIndex).toBeLessThan(tickIndex);
  return commands[loadIndex] as Extract<EngineCommand, { type: "LOAD_WORLD" }>;
}

describe("V18 worker sync ordering — uiWorldRevision must beat TICK_DAY", () => {
  beforeEach(() => {
    workerPostMessage.mockClear();
    useGameStore.setState({
      // The Worker object is the only fake — initWorker early-returns when
      // `worker` is already set, so sendCommand's postMessage boundary is
      // fully observable. It stays set for the whole file: deferred React
      // effects can still fire between tests and must never hit `new Worker`.
      worker: fakeWorker,
      pendingTick: false,
      commandRejected: null,
      error: null,
      digest: null,
      digestRevision: 0,
      workerWorld: null,
      worldVersion: 0,
      isSimulating: false,
      simPaused: false,
      progress: null,
      onWorldUpdated: null,
    });
  });

  afterEach(() => {
    useGameStore.setState({ onWorldUpdated: null, pendingTick: false });
  });

  it("handleSimDay: LOAD_WORLD carrying the post-bout world reaches the worker before TICK_DAY", () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });

    // Seed the interactive world. UPDATE_WORLD does not bump uiWorldRevision,
    // so no LOAD_WORLD should fire for the load itself.
    act(() => result.current.updateWorld(activeBashoWorld()));
    workerPostMessage.mockClear();

    // The exact useCalendarActions.handleSimDay sequence.
    act(() => {
      result.current.simulateAllBouts();
      result.current.endDay();
      result.current.advanceDay();
    });

    // Sanity: the interactive path really did resolve b1 on the main thread —
    // there is a real post-bout world to lose.
    const resolved = result.current.state.world!.currentBasho!.matches.find(
      (m) => m.boutId === "b1"
    );
    expect(resolved?.result, "sanity: SIMULATE_ALL_BOUTS resolved b1").toBeDefined();

    const load = syncBeforeTick(sentCommands(), "handleSimDay");
    // The sync must carry the post-mutation world, not a stale copy.
    expect(load.world).toBe(result.current.state.world);
  });

  it("SIMULATE_BOUT then TICK_DAY: the post-bout world must be synced before the tick", () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });
    act(() => result.current.updateWorld(activeBashoWorld()));
    workerPostMessage.mockClear();

    // The single-bout interactive path hits the same race: dispatchWorldMutation
    // bumps uiWorldRevision, then TICK_DAY is posted before the sync can land.
    act(() => {
      result.current.simulateBout(0);
      result.current.advanceDay();
    });

    const resolved = result.current.state.world!.currentBasho!.matches.find(
      (m) => m.boutId === "b1"
    );
    expect(resolved?.result, "sanity: SIMULATE_BOUT resolved b1").toBeDefined();

    const load = syncBeforeTick(sentCommands(), "SIMULATE_BOUT + advanceDay");
    expect(load.world).toBe(result.current.state.world);
  });

  it("SET_BOUT_TACTIC then TICK_DAY: the tactic-bearing world must be synced before the tick", () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });
    act(() => result.current.updateWorld(activeBashoWorld()));
    workerPostMessage.mockClear();

    // Player sets a bout tactic, then sims the day — the third interactive
    // mutation path that bumps uiWorldRevision.
    act(() => {
      result.current.setBoutTactic("b1", "OSHI_THRUST");
      result.current.advanceDay();
    });

    const load = syncBeforeTick(sentCommands(), "SET_BOUT_TACTIC + advanceDay");
    expect(load.world.boutTactics?.["b1"]).toBe("OSHI_THRUST");
  });

  it("control: a bare advanceDay with no pending mutation posts only TICK_DAY", () => {
    const { result } = renderHook(() => useGame(), { wrapper: GameProvider });
    act(() => result.current.updateWorld(activeBashoWorld()));
    workerPostMessage.mockClear();

    act(() => result.current.advanceDay());

    const types = sentCommands().map((c) => c.type);
    // No uiWorldRevision bump → no LOAD_WORLD owed → the tick alone is fine.
    expect(types).toEqual(["TICK_DAY"]);
  });
});
