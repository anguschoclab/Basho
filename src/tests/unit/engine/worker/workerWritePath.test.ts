/**
 * workerWritePath.test.ts
 * =======================
 * Regression guard for the dual-write-path defect.
 *
 * These player actions used to mutate only the main-thread world via
 * `updateWorld(...)`. Because the worker owns `currentWorld` and re-broadcasts
 * it on every WORLD_UPDATED, the next tick silently reverted them.
 *
 * Each test asserts the mutation lands in the WORKER's world — i.e. it is still
 * present in the world the worker syncs back after a subsequent TICK_DAY.
 */
import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { MockFactory } from "../../../helpers/utils/MockFactory";
import type { EngineCommand, EngineEvent } from "@/engine/worker/types";
import type { WorldState } from "@/engine/types/world";

const originalSelf = globalThis.self;
const originalPostMessage = globalThis.postMessage;
const originalOnmessage = globalThis.onmessage;

const mockPostMessage = vi.fn();

interface MockWorkerGlobal {
  postMessage: (message: EngineEvent) => void;
  onmessage: ((event: MessageEvent<EngineCommand>) => void) | null;
  self?: unknown;
}

const mockGlobal = globalThis as unknown as MockWorkerGlobal;
mockGlobal.postMessage = mockPostMessage;
mockGlobal.onmessage = null;
if (!mockGlobal.self) mockGlobal.self = globalThis;

afterAll(() => {
  if (originalPostMessage === undefined) delete (globalThis as never as Record<string, unknown>)
    .postMessage;
  else mockGlobal.postMessage = originalPostMessage;
  if (originalOnmessage === undefined) delete (globalThis as never as Record<string, unknown>)
    .onmessage;
  else mockGlobal.onmessage = originalOnmessage;
  if (originalSelf === undefined) delete (globalThis as never as Record<string, unknown>).self;
  else mockGlobal.self = originalSelf;
});

vi.mock("@/presenters/uiDigest", () => ({
  buildWeeklyDigest: vi.fn(() => ({ mockDigest: true })),
}));

// The orchestrator is mocked to a pure pass-through so that anything still
// present after TICK_DAY provably came from the worker's own currentWorld.
vi.mock("@/engine/tick/tickOrchestrator", () => ({
  tickOrchestrator: vi.fn((world) => ({ ...world, ticked: true })),
  advanceDaysFastOrchestrator: vi.fn((world) => ({ ...world, ticked: true })),
  cloneWorldForTick: vi.fn((world) => world),
}));

await import("@/engine/worker/engine.worker");

const send = async (data: EngineCommand) => {
  if (mockGlobal.onmessage) await mockGlobal.onmessage({ data } as MessageEvent<EngineCommand>);
};

/** The world the worker last synced to the main thread. */
function lastSyncedWorld(): WorldState {
  const calls = mockPostMessage.mock.calls
    .map((c) => c[0] as EngineEvent)
    .filter((e) => e.type === "WORLD_UPDATED");
  expect(calls.length, "worker never emitted WORLD_UPDATED").toBeGreaterThan(0);
  return (calls[calls.length - 1] as { world: WorldState }).world;
}

/** Loads a world with one player heya, then runs `cmd`, then ticks a day. */
async function runThenTick(cmd: EngineCommand, mutate?: (w: WorldState) => void) {
  const world = MockFactory.createWorld({ seed: "write-path" });
  world.playerHeyaId = "heya-p";
  world.heyas.set("heya-p", {
    id: "heya-p",
    name: "Player Heya",
    rikishiIds: [],
    funds: 50_000_000,
    reputation: 50,
    politicalCapital: 200,
  } as never);
  mutate?.(world);

  await send({ type: "LOAD_WORLD", world });
  await send(cmd);
  await send({ type: "TICK_DAY" });
  return lastSyncedWorld();
}

describe("worker write path — player actions survive the next tick", () => {
  beforeEach(() => vi.clearAllMocks());

  it("APPLY_PRESS_CONFERENCE persists the reputation delta", async () => {
    const w = await runThenTick({
      type: "APPLY_PRESS_CONFERENCE",
      heyaId: "heya-p",
      reputationDelta: 12,
    });
    expect(w.heyas.get("heya-p")?.reputation).toBe(62);
  });

  it("APPLY_PRESS_CONFERENCE clamps reputation to 0..100", async () => {
    const w = await runThenTick({
      type: "APPLY_PRESS_CONFERENCE",
      heyaId: "heya-p",
      reputationDelta: 999,
    });
    expect(w.heyas.get("heya-p")?.reputation).toBe(100);
  });

  it("SET_HEYA_DIET persists the diet regimen", async () => {
    const w = await runThenTick({
      type: "SET_HEYA_DIET",
      heyaId: "heya-p",
      diet: "heavy_bulk",
    });
    expect(w.heyas.get("heya-p")?.welfareState?.activeDiet).toBe("heavy_bulk");
  });

  it("SPEND_POLITICAL_CAPITAL persists the spend", async () => {
    const w = await runThenTick({
      type: "SPEND_POLITICAL_CAPITAL",
      heyaId: "heya-p",
      amount: 100,
    });
    expect(w.heyas.get("heya-p")?.politicalCapital).toBe(100);
  });

  it("SET_KESHO_CONFIG persists the custom kesho config", async () => {
    const w = await runThenTick({
      type: "SET_KESHO_CONFIG",
      rikishiId: "rik-1",
      config: { primaryColor: "#123456" },
    });
    expect(w.customKeshoConfigs?.["rik-1"]).toEqual({ primaryColor: "#123456" });
  });

  it("RETIRE_RIKISHI persists the retirement", async () => {
    const w = await runThenTick(
      { type: "RETIRE_RIKISHI", rikishiId: "rik-1", reason: "player_initiated_intai" },
      (world) => {
        world.rikishi.set("rik-1", MockFactory.createRikishi("rik-1", { heyaId: "heya-p" }));
        world.activeRikishiIds.add("rik-1");
      }
    );
    // retireRikishi() moves the entity into historicalRikishi and drops it
    // from the active id set — both must survive the tick.
    expect(w.historicalRikishi.get("rik-1")?.isRetired).toBe(true);
    expect(w.activeRikishiIds.has("rik-1")).toBe(false);
  });

  it("unknown commands are rejected rather than silently mutating state", async () => {
    const w = await runThenTick({ type: "NOT_A_REAL_COMMAND" } as never as EngineCommand);
    expect(w.heyas.get("heya-p")?.reputation).toBe(50);
  });
});
