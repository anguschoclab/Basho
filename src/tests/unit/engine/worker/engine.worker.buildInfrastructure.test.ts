import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { MockFactory } from "../../../helpers/utils/MockFactory";
import type { EngineCommand, EngineEvent } from "@/engine/worker/types";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import { FACILITY_REGISTRY } from "@/engine/types/infrastructure";
import { CONSTRUCTION_COST_LEVEL_MULTIPLIER } from "@/constants/engine/economyExtended";

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

describe("engine.worker — BUILD_INFRASTRUCTURE", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const triggerMessage = async (data: EngineCommand) => {
    if (mockGlobal.onmessage) {
      await mockGlobal.onmessage({ data } as MessageEvent<EngineCommand>);
    }
  };

  const HEYA_ID = "heya-player";
  const BASE_FUNDS = 100_000_000;

  function createWorldWithHeya(
    funds: number = BASE_FUNDS,
    infrastructure?: Heya["infrastructure"],
    constructionQueue?: Heya["constructionQueue"]
  ): WorldState {
    const heya = MockFactory.createHeya(HEYA_ID, {
      funds,
      infrastructure,
      constructionQueue,
    });
    return MockFactory.createWorld({
      seed: "build-infra-test",
      playerHeyaId: HEYA_ID,
      heyas: new Map([[HEYA_ID, heya]]),
    });
  }

  function getWorldUpdated(): WorldState | undefined {
    const call = mockPostMessage.mock.calls.find(
      (c) => (c[0] as { type?: string })?.type === "WORLD_UPDATED"
    );
    return call ? ((call[0] as { world: WorldState }).world as WorldState) : undefined;
  }

  it("should deduct funds and add to constructionQueue on valid build", async () => {
    const world = createWorldWithHeya();
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "BUILD_INFRASTRUCTURE",
      heyaId: HEYA_ID,
      facilityId: "weights_room",
    });

    const updated = getWorldUpdated();
    expect(updated).toBeDefined();
    const heya = updated!.heyas.get(HEYA_ID)!;

    const def = FACILITY_REGISTRY.weights_room;
    const expectedCost = def.baseCost; // level 0 → nextLevel 1 → cost = baseCost * (1 + 0 * mult) = baseCost
    expect(heya!.funds).toBe(BASE_FUNDS - expectedCost);
    expect(heya!.constructionQueue).toHaveLength(1);
    expect(heya!.constructionQueue![0].facilityId).toBe("weights_room");
    expect(heya!.constructionQueue![0].level).toBe(1);
  });

  it("should emit WORLD_UPDATED after successful construction start", async () => {
    const world = createWorldWithHeya();
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "BUILD_INFRASTRUCTURE",
      heyaId: HEYA_ID,
      facilityId: "media_studio",
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "WORLD_UPDATED" })
    );
  });

  it("should leave funds unchanged when insufficient funds", async () => {
    const world = createWorldWithHeya(1_000_000); // Not enough for any facility
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "BUILD_INFRASTRUCTURE",
      heyaId: HEYA_ID,
      facilityId: "weights_room",
    });

    // Empty impact → no WORLD_UPDATED or unchanged world
    const updated = getWorldUpdated();
    if (updated) {
      const heya = updated.heyas.get(HEYA_ID)!;
      expect(heya.funds).toBe(1_000_000);
      expect(heya.constructionQueue ?? []).toHaveLength(0);
    }
  });

  it("should not add to queue when facility already under construction", async () => {
    const world = createWorldWithHeya(BASE_FUNDS, {
      weights_room: { level: 0, status: "under_construction" },
    });
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "BUILD_INFRASTRUCTURE",
      heyaId: HEYA_ID,
      facilityId: "weights_room",
    });

    const updated = getWorldUpdated();
    if (updated) {
      const heya = updated.heyas.get(HEYA_ID)!;
      // Should not add another queue entry
      expect(heya.constructionQueue ?? []).toHaveLength(0);
      expect(heya.funds).toBe(BASE_FUNDS);
    }
  });

  it("should scale cost with level for existing infrastructure", async () => {
    const world = createWorldWithHeya(BASE_FUNDS, {
      weights_room: { level: 2, status: "active" },
    });
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "BUILD_INFRASTRUCTURE",
      heyaId: HEYA_ID,
      facilityId: "weights_room",
    });

    const updated = getWorldUpdated();
    expect(updated).toBeDefined();
    const heya = updated!.heyas.get(HEYA_ID)!;

    const def = FACILITY_REGISTRY.weights_room;
    const nextLevel = 3;
    const expectedCost = def.baseCost * (1 + (nextLevel - 1) * CONSTRUCTION_COST_LEVEL_MULTIPLIER);
    expect(heya.funds).toBe(BASE_FUNDS - expectedCost);
    expect(heya.constructionQueue![0].level).toBe(nextLevel);
  });

  it("should return empty impact for non-existent heya", async () => {
    const world = createWorldWithHeya();
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "BUILD_INFRASTRUCTURE",
      heyaId: "non-existent",
      facilityId: "weights_room",
    });

    // No WORLD_UPDATED for invalid heya
    const updated = getWorldUpdated();
    if (updated) {
      // If emitted, heya should be unchanged
      const heya = updated.heyas.get(HEYA_ID)!;
      expect(heya.funds).toBe(BASE_FUNDS);
    }
  });
});
