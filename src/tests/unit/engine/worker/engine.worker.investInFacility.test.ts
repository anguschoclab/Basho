import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { MockFactory } from "../../../helpers/utils/MockFactory";
import type { EngineCommand, EngineEvent } from "@/engine/worker/types";

// Save original globals to restore after tests finish
const originalSelf = globalThis.self;
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
  if (originalSelf === undefined) {
    delete (globalThis as any).self;
  } else {
    mockGlobal.self = originalSelf;
  }
});

// Mock dependencies same as engine.worker.test.ts
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

// Import the worker script which attaches to globalThis.self.onmessage
await import("@/engine/worker/engine.worker");

describe("engine.worker — INVEST_IN_FACILITY", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const triggerMessage = async (data: EngineCommand) => {
    if (mockGlobal.onmessage) {
      await mockGlobal.onmessage({ data } as MessageEvent<EngineCommand>);
    }
  };

  const HEYA_ID = "heya-player";
  const BASE_FUNDS = 10_000_000;
  const BASE_LEVEL = 10;

  function createWorldWithHeya(
    funds: number = BASE_FUNDS,
    level: number = BASE_LEVEL
  ) {
    const heya = MockFactory.createHeya(HEYA_ID, {
      funds,
      facilities: { training: level, recovery: level, nutrition: level },
    });
    return MockFactory.createWorld({
      seed: "invest-test",
      playerHeyaId: HEYA_ID,
      heyas: new Map([[HEYA_ID, heya]]),
    });
  }

  function getWorldUpdated() {
    const call = mockPostMessage.mock.calls.find(
      (c) => (c[0] as { type?: string })?.type === "WORLD_UPDATED"
    );
    return call ? ((call[0] as { world: any }).world as any) : undefined;
  }

  it("should deduct real upgradeCost()-scaled total and increment facilities[axis]", async () => {
    const world = createWorldWithHeya();
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "INVEST_IN_FACILITY",
      heyaId: HEYA_ID,
      axis: "training",
      points: 5,
    });

    const updated = getWorldUpdated();
    expect(updated).toBeDefined();
    const heya = updated.heyas.get(HEYA_ID);

    // 5 points from level 10: all below threshold 40 → 5 × 200,000 = 1,000,000
    const expectedCost = 5 * 200_000;
    expect(heya.funds).toBe(BASE_FUNDS - expectedCost);
    expect(heya.facilities.training).toBe(BASE_LEVEL + 5);
  });

  it("should NOT use fabricated points * 100 cost", async () => {
    const world = createWorldWithHeya();
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "INVEST_IN_FACILITY",
      heyaId: HEYA_ID,
      axis: "training",
      points: 5,
    });

    const updated = getWorldUpdated();
    expect(updated).toBeDefined();
    const heya = updated.heyas.get(HEYA_ID);

    // Real cost is 1,000,000 — fabricated cost would be 500
    expect(heya.funds).not.toBe(BASE_FUNDS - 500);
  });

  it("should use level-scaled cost at level 40+ (1.5× multiplier)", async () => {
    const world = createWorldWithHeya(50_000_000, 40);
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "INVEST_IN_FACILITY",
      heyaId: HEYA_ID,
      axis: "training",
      points: 5,
    });

    const updated = getWorldUpdated();
    expect(updated).toBeDefined();
    const heya = updated.heyas.get(HEYA_ID);

    // 5 points from level 40: all at 1.5× → 5 × 300,000 = 1,500,000
    const expectedCost = 5 * 300_000;
    expect(heya.funds).toBe(50_000_000 - expectedCost);
    expect(heya.facilities.training).toBe(45);
  });

  it("should leave funds and level unchanged when heya has insufficient funds", async () => {
    const world = createWorldWithHeya(100_000, BASE_LEVEL);
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "INVEST_IN_FACILITY",
      heyaId: HEYA_ID,
      axis: "training",
      points: 5,
    });

    // World may or may not be emitted (empty impact), but if it is,
    // funds and level must be unchanged.
    const updated = getWorldUpdated();
    if (updated) {
      const heya = updated.heyas.get(HEYA_ID);
      expect(heya.funds).toBe(100_000);
      expect(heya.facilities.training).toBe(BASE_LEVEL);
    }
  });

  it("should emit WORLD_UPDATED after successful investment", async () => {
    const world = createWorldWithHeya();
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "INVEST_IN_FACILITY",
      heyaId: HEYA_ID,
      axis: "recovery",
      points: 1,
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "WORLD_UPDATED" })
    );
  });

  it("should handle +1 point upgrade correctly", async () => {
    const world = createWorldWithHeya();
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "INVEST_IN_FACILITY",
      heyaId: HEYA_ID,
      axis: "nutrition",
      points: 1,
    });

    const updated = getWorldUpdated();
    expect(updated).toBeDefined();
    const heya = updated.heyas.get(HEYA_ID);

    // 1 point from level 10: 200,000
    expect(heya.funds).toBe(BASE_FUNDS - 200_000);
    expect(heya.facilities.nutrition).toBe(BASE_LEVEL + 1);
  });
});
