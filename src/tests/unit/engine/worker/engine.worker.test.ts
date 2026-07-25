import { describe, it, expect, vi, beforeEach, afterAll, type Mock } from "vitest";
import { MockFactory } from "../../../helpers/utils/MockFactory";
import type { EngineCommand, EngineEvent } from "@/engine/worker/types";
import type { UIDigest } from "@/presenters/uiDigest";
import { logger } from "@/engine/utils/Logger";

// Save original globals to restore after tests finish and avoid polluting globals
const originalSelf = globalThis.self;
const originalPostMessage = globalThis.postMessage;
const originalOnmessage = globalThis.onmessage;

const mockPostMessage = vi.fn();

// Mock the self object for Web Worker environment before importing the worker
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

  if (originalSelf === undefined) {
    delete (globalThis as any).self;
  } else {
    mockGlobal.self = originalSelf;
  }
});

// Mock other dependencies
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

// Import the worker script which will attach to globalThis.self.onmessage
await import("@/engine/worker/engine.worker");

describe("engine.worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const triggerMessage = async (data: EngineCommand) => {
    if (mockGlobal.onmessage) {
      await mockGlobal.onmessage({ data } as MessageEvent<EngineCommand>);
    }
  };

  it("should handle START_WORLD command", async () => {
    await triggerMessage({
      type: "START_WORLD",
      seed: "test-seed",
      playerHeyaId: "heya-123",
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "TICK_COMPLETED",
        digest: {
          mockDigest: true,
          worldSeed: "test-seed",
        } as unknown as UIDigest,
      })
    );
  });

  it("should handle LOAD_WORLD command", async () => {
    const world = MockFactory.createWorld({ seed: "loaded-seed" });
    await triggerMessage({
      type: "LOAD_WORLD",
      world,
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "TICK_COMPLETED",
        digest: {
          mockDigest: true,
          worldSeed: "loaded-seed",
        } as unknown as UIDigest,
      })
    );
  });

  it("should handle TICK_DAY command", async () => {
    // First load a world
    const world = MockFactory.createWorld({ seed: "tick-seed" });
    await triggerMessage({
      type: "LOAD_WORLD",
      world,
    });
    vi.clearAllMocks();

    await triggerMessage({
      type: "TICK_DAY",
    });

    // Since tickOrchestrator is mocked to return { ...world, ticked: true }
    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "TICK_COMPLETED",
        digest: {
          mockDigest: true,
          worldSeed: "tick-seed",
        } as unknown as UIDigest,
      })
    );
  });

  it("should emit WORLD_UPDATED after TICK_DAY (sync world to main thread)", async () => {
    const world = MockFactory.createWorld({ seed: "tick-sync-seed" });
    await triggerMessage({
      type: "LOAD_WORLD",
      world,
    });
    vi.clearAllMocks();

    await triggerMessage({
      type: "TICK_DAY",
    });

    // TICK_DAY should also sync the world back to the main thread
    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "WORLD_UPDATED",
        world: expect.objectContaining({
          seed: "tick-sync-seed",
          ticked: true,
        }),
      })
    );
  });

  it("should handle AUTO_SIM_DAYS command", async () => {
    // First load a world
    const world = MockFactory.createWorld({ seed: "auto-sim-seed" });
    await triggerMessage({
      type: "LOAD_WORLD",
      world,
    });
    vi.clearAllMocks();

    await triggerMessage({
      type: "AUTO_SIM_DAYS",
      days: 10,
    });

    // It should emit progress at day 7 (first chunk) and day 10 (final chunk)
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: "PROGRESS",
      message: "Simulating day 7 of 10...",
      current: 7,
      total: 10,
    });

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: "PROGRESS",
      message: "Simulating day 10 of 10...",
      current: 10,
      total: 10,
    });

    // It should emit digest at the end
    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "TICK_COMPLETED",
        digest: {
          mockDigest: true,
          worldSeed: "auto-sim-seed",
        } as unknown as UIDigest,
      })
    );

    // It should return the updated world
    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "WORLD_UPDATED",
        world: expect.objectContaining({
          seed: "auto-sim-seed",
          ticked: true,
        }),
      })
    );
  });

  it("should handle AUTO_SIM_DAYS with chunked progress (P1.7)", async () => {
    const world = MockFactory.createWorld({ seed: "auto-sim-chunk-seed" });
    await triggerMessage({
      type: "LOAD_WORLD",
      world,
    });
    vi.clearAllMocks();

    await triggerMessage({
      type: "AUTO_SIM_DAYS",
      days: 14,
    });

    // With chunk=7, days=14: progress at day 7 (i=0) and day 14 (i=7)
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: "PROGRESS",
      message: "Simulating day 7 of 14...",
      current: 7,
      total: 14,
    });
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: "PROGRESS",
      message: "Simulating day 14 of 14...",
      current: 14,
      total: 14,
    });
  });

  it("should handle GET_DIGEST command", async () => {
    // First load a world
    const world = MockFactory.createWorld({ seed: "digest-seed" });
    await triggerMessage({
      type: "LOAD_WORLD",
      world,
    });
    vi.clearAllMocks();

    await triggerMessage({
      type: "GET_DIGEST",
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "TICK_COMPLETED",
        digest: {
          mockDigest: true,
          worldSeed: "digest-seed",
        } as unknown as UIDigest,
      })
    );
  });

  it("should handle invalid commands by logging a warning", async () => {
    const consoleWarnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

    await triggerMessage({
      type: "INVALID_COMMAND",
    } as unknown as EngineCommand);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Unknown command: INVALID_COMMAND",
      "Worker",
      undefined
    );
    consoleWarnSpy.mockRestore();
  });

  it("should handle generic errors", async () => {
    // We mock the generateInitialWorld to throw an error for this specific test
    const { generateInitialWorld } = await import("@/engine/systems/generation/WorldFactory");
    (generateInitialWorld as Mock).mockImplementationOnce(() => {
      throw new Error("Test error message");
    });

    await triggerMessage({
      type: "START_WORLD",
      seed: "error-seed",
    });

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: "ERROR",
      message: "Test error message",
    });
  });

  it("should handle error without message property gracefully", async () => {
    const { generateInitialWorld } = await import("@/engine/systems/generation/WorldFactory");
    (generateInitialWorld as Mock).mockImplementationOnce(() => {
      throw "String error instead of Error object";
    });

    await triggerMessage({
      type: "START_WORLD",
      seed: "error-seed",
    });

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: "ERROR",
      message: "Unknown engine error",
    });
  });
});
