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
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { EngineCommand, WorkerEvent } from "@/engine/worker/types";
import type { WorldState } from "@/engine/types/world";

const originalSelf = globalThis.self;
const originalPostMessage = globalThis.postMessage;
const originalOnmessage = globalThis.onmessage;

const mockPostMessage = vi.fn();

interface MockWorkerGlobal {
  postMessage: (message: WorkerEvent) => void;
  onmessage: ((event: MessageEvent<EngineCommand>) => void) | null;
  self?: unknown;
}

const mockGlobal = globalThis as unknown as MockWorkerGlobal;
mockGlobal.postMessage = mockPostMessage;
mockGlobal.onmessage = null;
if (!mockGlobal.self) mockGlobal.self = globalThis;

afterAll(() => {
  if (originalPostMessage === undefined)
    delete (globalThis as never as Record<string, unknown>).postMessage;
  else mockGlobal.postMessage = originalPostMessage;
  if (originalOnmessage === undefined)
    delete (globalThis as never as Record<string, unknown>).onmessage;
  else mockGlobal.onmessage = originalOnmessage;
  if (originalSelf === undefined) delete (globalThis as never as Record<string, unknown>).self;
  else mockGlobal.self = originalSelf;
});

vi.mock("@/engine/worker/digestProjections", () => ({
  buildWeeklyDigest: vi.fn(() => ({ mockDigest: true })),
}));

// The orchestrator is mocked to a pure pass-through so that anything still
// present after TICK_DAY provably came from the worker's own currentWorld.
vi.mock("@/engine/tick/tickOrchestrator", () => ({
  tickOrchestrator: vi.fn((world) => ({ ...world, ticked: true })),
  advanceDaysFastOrchestrator: vi.fn((world) => ({ ...world, ticked: true })),
}));

await import("@/engine/worker/engine.worker");

const send = async (data: EngineCommand) => {
  if (mockGlobal.onmessage) await mockGlobal.onmessage({ data } as MessageEvent<EngineCommand>);
};

/** The world the worker last synced to the main thread. */
function lastSyncedWorld(): WorldState {
  const calls = mockPostMessage.mock.calls
    .map((c) => c[0] as WorkerEvent)
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
      moraleDelta: 0,
      mediaHeatDelta: 0,
    });
    expect(w.heyas.get("heya-p")?.reputation).toBe(62);
  });

  it("APPLY_PRESS_CONFERENCE persists morale and heyaPressure deltas", async () => {
    const w = await runThenTick(
      {
        type: "APPLY_PRESS_CONFERENCE",
        heyaId: "heya-p",
        reputationDelta: 0,
        moraleDelta: 7,
        mediaHeatDelta: 15,
      },
      (world) => {
        world.mediaState = { heyaPressure: { "heya-p": 5 } } as never;
      }
    );
    // Fixture heya has no welfareState.morale → base 50 + 7
    expect(w.heyas.get("heya-p")?.welfareState?.morale).toBe(57);
    expect(w.mediaState?.heyaPressure?.["heya-p"]).toBe(20);
  });

  it("APPLY_PRESS_CONFERENCE clamps reputation to 0..100", async () => {
    const w = await runThenTick({
      type: "APPLY_PRESS_CONFERENCE",
      heyaId: "heya-p",
      reputationDelta: 999,
      moraleDelta: 0,
      mediaHeatDelta: 0,
    });
    expect(w.heyas.get("heya-p")?.reputation).toBe(100);
  });

  /**
   * V18-P1 — press-conference heat must land on a consumed key space.
   * The handler (worker/commands/governance.ts:80-92) writes the delta to
   * `mediaState.mediaHeat[heyaId]`, but every mediaHeat consumer indexes by
   * RIKISHI id — perception.getRikishiMediaHeat (:376-380), promotion
   * projections (:120), KenshoService (:221), BashoHistory (:406),
   * mediaProjection rikishi rows (:26-35). The heya-keyed entry is dead
   * weight that decays silently and even renders as a phantom rikishi row.
   * The consumed heya-level map is `heyaPressure`
   * (perception.getStableMediaHeat :364-368, mediaProjection :41-48,
   * MediaPreBashoService :199-201, phase01_week_welfare :181-186), and every
   * other heya-level press delta in the engine routes there
   * (crisisRegistry :89-91, chainService "press heat" :292-298,
   * MediaEventService scandal pressure :231-244).
   * Note: the "persists morale and mediaHeat deltas" test above codifies
   * the buggy storage location and must be updated when the fix lands.
   * FAILS today.
   */
  it("V18-P1: APPLY_PRESS_CONFERENCE writes heya-level heat to heyaPressure, not rikishi-keyed mediaHeat", async () => {
    const w = await runThenTick(
      {
        type: "APPLY_PRESS_CONFERENCE",
        heyaId: "heya-p",
        reputationDelta: 0,
        moraleDelta: 0,
        mediaHeatDelta: 15,
      },
      (world) => {
        world.mediaState = {
          mediaHeat: {},
          heyaPressure: { "heya-p": 5 },
        } as never;
      }
    );
    expect(w.mediaState?.heyaPressure?.["heya-p"]).toBe(20);
    // mediaHeat stays rikishi-keyed — no dead heya-scoped key.
    expect(w.mediaState?.mediaHeat?.["heya-p"]).toBeUndefined();
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
