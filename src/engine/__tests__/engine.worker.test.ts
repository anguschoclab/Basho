import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the self object for Web Worker environment before importing the worker
const mockPostMessage = vi.fn();
// @ts-ignore
globalThis.self = {
  postMessage: mockPostMessage,
  onmessage: null,
};

// Mock other dependencies
vi.mock("../../presenters/uiDigest", () => ({
  buildWeeklyDigest: vi.fn((world) => ({
    mockDigest: true,
    worldSeed: world?.seed,
  })),
}));

vi.mock("../systems/generation/WorldFactory", () => ({
  generateInitialWorld: vi.fn((seed) => ({ mockWorld: true, seed })),
}));

vi.mock("../tick/tickOrchestrator", () => ({
  tickOrchestrator: vi.fn((world) => ({ ...world, ticked: true })),
  cloneWorldForTick: vi.fn((world) => world),
}));

// Import the worker script which will attach to globalThis.self.onmessage
await import("../worker/engine.worker.ts");

describe("engine.worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle START_WORLD command", async () => {
    const startCmd = {
      data: {
        type: "START_WORLD",
        seed: "test-seed",
        playerHeyaId: "heya-123",
      },
    };

    // @ts-ignore
    await globalThis.self.onmessage(startCmd);

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: "TICK_COMPLETED",
      digest: {
        mockDigest: true,
        worldSeed: "test-seed",
      },
    });
  });

  it("should handle LOAD_WORLD command", async () => {
    const loadCmd = {
      data: {
        type: "LOAD_WORLD",
        world: {
          mockWorld: true,
          seed: "loaded-seed",
        },
      },
    };

    // @ts-ignore
    await globalThis.self.onmessage(loadCmd);

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: "TICK_COMPLETED",
      digest: {
        mockDigest: true,
        worldSeed: "loaded-seed",
      },
    });
  });

  it("should handle TICK_DAY command", async () => {
    // First load a world
    const loadCmd = {
      data: {
        type: "LOAD_WORLD",
        world: {
          mockWorld: true,
          seed: "tick-seed",
        },
      },
    };
    // @ts-ignore
    await globalThis.self.onmessage(loadCmd);
    vi.clearAllMocks();

    const tickCmd = {
      data: {
        type: "TICK_DAY",
      },
    };

    // @ts-ignore
    await globalThis.self.onmessage(tickCmd);

    // Since tickOrchestrator is mocked to return { ...world, ticked: true }
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: "TICK_COMPLETED",
      digest: {
        mockDigest: true,
        worldSeed: "tick-seed", // the seed is preserved by the tick mock
      },
    });
  });

  it("should handle AUTO_SIM_DAYS command", async () => {
    // First load a world
    const loadCmd = {
      data: {
        type: "LOAD_WORLD",
        world: {
          mockWorld: true,
          seed: "auto-sim-seed",
        },
      },
    };
    // @ts-ignore
    await globalThis.self.onmessage(loadCmd);
    vi.clearAllMocks();

    const autoSimCmd = {
      data: {
        type: "AUTO_SIM_DAYS",
        days: 10,
      },
    };

    // @ts-ignore
    await globalThis.self.onmessage(autoSimCmd);

    // It should emit progress at day 1 (index 0) and day 6 (index 5)
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: "PROGRESS",
      message: "Simulating day 1 of 10...",
      current: 1,
      total: 10,
    });

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: "PROGRESS",
      message: "Simulating day 6 of 10...",
      current: 6,
      total: 10,
    });

    // It should emit digest at the end
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: "TICK_COMPLETED",
      digest: {
        mockDigest: true,
        worldSeed: "auto-sim-seed",
      },
    });

    // It should return the updated world
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: "WORLD_UPDATED",
      world: expect.objectContaining({
        mockWorld: true,
        seed: "auto-sim-seed",
        ticked: true,
      }),
    });
  });

  it("should handle GET_DIGEST command", async () => {
    // First load a world
    const loadCmd = {
      data: {
        type: "LOAD_WORLD",
        world: {
          mockWorld: true,
          seed: "digest-seed",
        },
      },
    };
    // @ts-ignore
    await globalThis.self.onmessage(loadCmd);
    vi.clearAllMocks();

    const digestCmd = {
      data: {
        type: "GET_DIGEST",
      },
    };

    // @ts-ignore
    await globalThis.self.onmessage(digestCmd);

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: "TICK_COMPLETED",
      digest: {
        mockDigest: true,
        worldSeed: "digest-seed",
      },
    });
  });

  it("should handle invalid commands by logging a warning", async () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    const invalidCmd = {
      data: {
        type: "INVALID_COMMAND",
      },
    };

    // @ts-ignore
    await globalThis.self.onmessage(invalidCmd);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "[Worker] Unknown command: INVALID_COMMAND",
    );
    consoleWarnSpy.mockRestore();
  });

  it("should handle generic errors", async () => {
    // We mock the generateInitialWorld to throw an error for this specific test
    const { generateInitialWorld } =
      await import("../systems/generation/WorldFactory");
    (generateInitialWorld as any).mockImplementationOnce(() => {
      throw new Error("Test error message");
    });

    const errorCmd = {
      data: {
        type: "START_WORLD",
        seed: "error-seed",
      },
    };

    // @ts-ignore
    await globalThis.self.onmessage(errorCmd);

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: "ERROR",
      message: "Test error message",
    });
  });

  it("should handle error without message property gracefully", async () => {
    const { generateInitialWorld } =
      await import("../systems/generation/WorldFactory");
    (generateInitialWorld as any).mockImplementationOnce(() => {
      throw "String error instead of Error object";
    });

    const errorCmd = {
      data: {
        type: "START_WORLD",
        seed: "error-seed",
      },
    };

    // @ts-ignore
    await globalThis.self.onmessage(errorCmd);

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: "ERROR",
      message: "Unknown engine error",
    });
  });
});
