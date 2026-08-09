import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { mockRikishi, makeMockWorld, makeMockHeya } from "../utils";
import type { EngineCommand, EngineEvent } from "@/engine/worker/types";
import type { WorldState } from "@/engine/types/world";
import { assignSparringPair } from "@/engine/systems/training/SparringService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";

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
  generateInitialWorld: vi.fn((seed) => makeMockWorld({ seed })),
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

function makeWorldWithRikishi(): WorldState {
  const a = mockRikishi("r1", { heyaId: "h1", rank: "makushita" });
  const b = mockRikishi("r2", { heyaId: "h1", rank: "makushita" });
  const rikishi = new Map([
    [a.id, a],
    [b.id, b],
  ]);
  const heya = makeMockHeya("h1", { rikishiIds: Array.from(rikishi.keys()) });
  return makeMockWorld({
    rikishi,
    heyas: new Map([["h1", heya]]),
    sparringPairs: new Map(),
    week: 5,
  });
}

describe("engine.worker — ADD_SPARRING_PAIR / REMOVE_SPARRING_PAIR", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const triggerMessage = async (data: EngineCommand) => {
    if (mockGlobal.onmessage) {
      await mockGlobal.onmessage({ data } as MessageEvent<EngineCommand>);
    }
  };

  function getWorldUpdated(): WorldState | undefined {
    const call = mockPostMessage.mock.calls.find(
      (c) => (c[0] as { type?: string })?.type === "WORLD_UPDATED"
    );
    return call ? ((call[0] as { world: WorldState }).world as WorldState) : undefined;
  }

  it("ADD_SPARRING_PAIR adds pair to world.sparringPairs using currentWorld.week", async () => {
    const world = makeWorldWithRikishi();
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "ADD_SPARRING_PAIR",
      heyaId: "h1",
      aId: "r1",
      bId: "r2",
    });

    const updated = getWorldUpdated();
    expect(updated).toBeDefined();
    const sparringState = updated!.sparringPairs?.get("h1");
    expect(sparringState).toBeDefined();
    // makePairKey sorts IDs and joins with |
    const pairs = sparringState!.pairs;
    const pair = pairs["r1|r2"];
    expect(pair).toBeDefined();
    expect(pair.aId).toBe("r1");
    expect(pair.bId).toBe("r2");
    expect(pair.establishedWeek).toBe(5); // currentWorld.week
  });

  it("ADD_SPARRING_PAIR emits WORLD_UPDATED", async () => {
    const world = makeWorldWithRikishi();
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "ADD_SPARRING_PAIR",
      heyaId: "h1",
      aId: "r1",
      bId: "r2",
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "WORLD_UPDATED" })
    );
  });

  it("ADD_SPARRING_PAIR with non-existent rikishi is a no-op", async () => {
    const world = makeWorldWithRikishi();
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "ADD_SPARRING_PAIR",
      heyaId: "h1",
      aId: "non-existent",
      bId: "r2",
    });

    const updated = getWorldUpdated();
    if (updated) {
      const sparringState = updated.sparringPairs?.get("h1");
      expect(sparringState?.pairs ?? {}).toEqual({});
    }
  });

  it("REMOVE_SPARRING_PAIR removes existing pair", async () => {
    const world = makeWorldWithRikishi();
    // First assign a pair
    const assignImpact = assignSparringPair(world, "h1", "r1", "r2", 5);
    const assignedWorld = resolveImpacts(world, [assignImpact]);
    await triggerMessage({ type: "LOAD_WORLD", world: assignedWorld });
    vi.clearAllMocks();

    await triggerMessage({
      type: "REMOVE_SPARRING_PAIR",
      heyaId: "h1",
      aId: "r1",
      bId: "r2",
    });

    const updated = getWorldUpdated();
    expect(updated).toBeDefined();
    const sparringState = updated!.sparringPairs?.get("h1");
    const pairs = sparringState?.pairs ?? {};
    expect(Object.keys(pairs)).toHaveLength(0);
  });

  it("REMOVE_SPARRING_PAIR emits WORLD_UPDATED", async () => {
    const world = makeWorldWithRikishi();
    const assignImpact = assignSparringPair(world, "h1", "r1", "r2", 5);
    const assignedWorld = resolveImpacts(world, [assignImpact]);
    await triggerMessage({ type: "LOAD_WORLD", world: assignedWorld });
    vi.clearAllMocks();

    await triggerMessage({
      type: "REMOVE_SPARRING_PAIR",
      heyaId: "h1",
      aId: "r1",
      bId: "r2",
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "WORLD_UPDATED" })
    );
  });

  it("REMOVE_SPARRING_PAIR on non-existent pair is a no-op", async () => {
    const world = makeWorldWithRikishi();
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "REMOVE_SPARRING_PAIR",
      heyaId: "h1",
      aId: "r1",
      bId: "r2",
    });

    // removeSparringPair returns empty impact when no pair exists
    const updated = getWorldUpdated();
    if (updated) {
      const sparringState = updated.sparringPairs?.get("h1");
      expect(sparringState?.pairs ?? {}).toEqual({});
    }
  });
});
