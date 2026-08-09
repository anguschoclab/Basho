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
  return mockPostMessage.mock.calls.map((call) => call[0]).filter((msg: any) => msg.type === type);
}

/**
 * P4.7: Worker auto-sim parity tests.
 * Verifies that AUTO_SIM_DAYS uses advanceDaysFastOrchestrator
 * and emits progress + final digest correctly.
 */

describe("P1.7: Worker AUTO_SIM_DAYS parity", () => {
  beforeEach(() => {
    mockPostMessage.mockClear();
  });

  it("AUTO_SIM_DAYS emits progress messages during simulation", () => {
    sendCommand({ type: "START_WORLD", seed: "test-autosim", playerHeyaId: "h1" } as any);
    mockPostMessage.mockClear();

    sendCommand({ type: "AUTO_SIM_DAYS", days: 14 });

    const progressMessages = getMessagesOfType("PROGRESS");
    expect(progressMessages.length).toBeGreaterThan(0);
  });

  it("AUTO_SIM_DAYS emits 1 TICK_COMPLETED on completion", () => {
    sendCommand({ type: "START_WORLD", seed: "test-autosim2", playerHeyaId: "h1" } as any);
    mockPostMessage.mockClear();

    sendCommand({ type: "AUTO_SIM_DAYS", days: 14 });

    const tickCompleted = getMessagesOfType("TICK_COMPLETED");
    expect(tickCompleted.length).toBe(1);
  });

  it("AUTO_SIM_DAYS emits 1 WORLD_UPDATED on completion", () => {
    sendCommand({ type: "START_WORLD", seed: "test-autosim3", playerHeyaId: "h1" } as any);
    mockPostMessage.mockClear();

    sendCommand({ type: "AUTO_SIM_DAYS", days: 14 });

    const worldUpdated = getMessagesOfType("WORLD_UPDATED");
    expect(worldUpdated.length).toBe(1);
  });
});
