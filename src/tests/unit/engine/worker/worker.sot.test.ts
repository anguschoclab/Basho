/**
 * Worker SoT Fix Tests (B4.1.1)
 * Verifies that START_WORLD generates the world in the worker and emits
 * WORLD_UPDATED, making the worker the single source of truth.
 */

import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { MockFactory } from "../../../helpers/utils/MockFactory";
import type { EngineCommand, EngineEvent } from "@/engine/worker/types";

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
if (!mockGlobal.self) {
  mockGlobal.self = globalThis;
}

afterAll(() => {
  if (originalPostMessage === undefined) {
    delete (globalThis as Record<string, unknown>).postMessage;
  } else {
    mockGlobal.postMessage = originalPostMessage;
  }
  if (originalOnmessage === undefined) {
    delete (globalThis as Record<string, unknown>).onmessage;
  } else {
    mockGlobal.onmessage = originalOnmessage;
  }
  if (originalSelf === undefined) {
    delete (globalThis as Record<string, unknown>).self;
  } else {
    mockGlobal.self = originalSelf;
  }
});

vi.mock("@/presenters/uiDigest", () => ({
  buildWeeklyDigest: vi.fn((world) => ({
    mockDigest: true,
    worldSeed: world?.seed,
  })),
}));

vi.mock("@/engine/systems/generation/WorldFactory", () => ({
  generateInitialWorld: vi.fn((seed) => MockFactory.createWorld({ seed })),
}));

vi.mock("@/engine/tick/tickOrchestrator", () => ({
  tickOrchestrator: vi.fn((world) => ({ ...world, ticked: true })),
  advanceDaysFastOrchestrator: vi.fn((world, days) => ({ ...world, ticked: true, daysAdvanced: days })),
  cloneWorldForTick: vi.fn((world) => world),
}));

await import("@/engine/worker/engine.worker");

describe("Worker SoT fix (B4.1.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const triggerMessage = async (data: EngineCommand) => {
    if (mockGlobal.onmessage) {
      await mockGlobal.onmessage({ data } as MessageEvent<EngineCommand>);
    }
  };

  it("START_WORLD emits WORLD_UPDATED with generated world", async () => {
    await triggerMessage({
      type: "START_WORLD",
      seed: "sot-test-001",
      playerHeyaId: "h1",
    });

    const worldUpdatedCalls = mockPostMessage.mock.calls.filter(
      (c) => c[0]?.type === "WORLD_UPDATED"
    );
    expect(worldUpdatedCalls.length).toBeGreaterThanOrEqual(1);
    expect(worldUpdatedCalls[0][0].world).toBeDefined();
    expect(worldUpdatedCalls[0][0].world.seed).toBe("sot-test-001");
  });

  it("START_WORLD sets playerHeyaId on the generated world", async () => {
    await triggerMessage({
      type: "START_WORLD",
      seed: "sot-test-002",
      playerHeyaId: "h1",
    });

    const worldUpdatedCalls = mockPostMessage.mock.calls.filter(
      (c) => c[0]?.type === "WORLD_UPDATED"
    );
    expect(worldUpdatedCalls.length).toBeGreaterThanOrEqual(1);
    expect(worldUpdatedCalls[0][0].world.playerHeyaId).toBe("h1");
  });
});
