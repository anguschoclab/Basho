import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { MockFactory } from "../../../helpers/utils/MockFactory";
import type { EngineCommand, EngineEvent } from "@/engine/worker/types";

const originalPostMessage = globalThis.postMessage;
const originalOnmessage = globalThis.onmessage;
const mockPostMessage = vi.fn();

interface MockWorkerGlobal {
  postMessage: (message: EngineEvent) => void;
  onmessage: ((event: MessageEvent<EngineCommand>) => void) | null;
  self?: any;
}

const mockGlobal = globalThis as unknown as MockWorkerGlobal;
mockGlobal.postMessage = mockPostMessage;
mockGlobal.onmessage = null;
if (!mockGlobal.self) {
  mockGlobal.self = globalThis;
}

afterAll(() => {
  if (originalPostMessage === undefined) {
    delete (globalThis as any).postMessage;
  } else {
    mockGlobal.postMessage = originalPostMessage;
  }
  if (originalOnmessage === undefined) {
    delete (globalThis as any).onmessage;
  } else {
    mockGlobal.onmessage = originalOnmessage;
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
  advanceDaysFastOrchestrator: vi.fn((world, days) => ({
    ...world,
    ticked: true,
    daysAdvanced: days,
  })),
  cloneWorldForTick: vi.fn((world) => world),
}));

await import("@/engine/worker/engine.worker");

function sendCommand(cmd: EngineCommand) {
  const event = { data: cmd } as MessageEvent<EngineCommand>;
  mockGlobal.onmessage!(event);
}

function getMessagesOfType(type: string): any[] {
  return mockPostMessage.mock.calls
    .map((call) => call[0])
    .filter((msg: any) => msg.type === type);
}

/**
 * P4.16: Worker helper tests for syncAndDigest.
 * The syncAndDigest helper consolidates emitDigest() + syncWorld() calls.
 * After TICK_DAY, both TICK_COMPLETED (from emitDigest) and WORLD_UPDATED
 * (from syncWorld) should be emitted.
 */

describe("P3.3: syncAndDigest helper", () => {
  beforeEach(() => {
    mockPostMessage.mockClear();
  });

  it("TICK_DAY emits both TICK_COMPLETED and WORLD_UPDATED (syncAndDigest)", () => {
    sendCommand({ type: "START_WORLD", seed: "test-helper", playerHeyaId: "h1" } as any);
    mockPostMessage.mockClear();

    sendCommand({ type: "TICK_DAY" });

    const tickCompleted = getMessagesOfType("TICK_COMPLETED");
    const worldUpdated = getMessagesOfType("WORLD_UPDATED");
    expect(tickCompleted.length).toBe(1);
    expect(worldUpdated.length).toBe(1);
  });

  it("TICK_MULTIPLE_DAYS emits both TICK_COMPLETED and WORLD_UPDATED", () => {
    sendCommand({ type: "START_WORLD", seed: "test-helper2", playerHeyaId: "h1" } as any);
    mockPostMessage.mockClear();

    sendCommand({ type: "TICK_MULTIPLE_DAYS", days: 3 });

    const tickCompleted = getMessagesOfType("TICK_COMPLETED");
    const worldUpdated = getMessagesOfType("WORLD_UPDATED");
    expect(tickCompleted.length).toBe(1);
    expect(worldUpdated.length).toBe(1);
  });

  it("AUTO_SIM_DAYS emits both TICK_COMPLETED and WORLD_UPDATED", () => {
    sendCommand({ type: "START_WORLD", seed: "test-helper3", playerHeyaId: "h1" } as any);
    mockPostMessage.mockClear();

    sendCommand({ type: "AUTO_SIM_DAYS", days: 10 });

    const tickCompleted = getMessagesOfType("TICK_COMPLETED");
    const worldUpdated = getMessagesOfType("WORLD_UPDATED");
    expect(tickCompleted.length).toBe(1);
    expect(worldUpdated.length).toBe(1);
  });
});
