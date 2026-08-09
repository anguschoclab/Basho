import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { makeMockWorld } from "../utils";
import type { EngineCommand, EngineEvent } from "@/engine/worker/types";
import type { WorldState } from "@/engine/types/world";
import { createDefaultTutorialState } from "@/engine/types/tutorial";

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

function makeWorldWithTutorial(tutorialState: any = createDefaultTutorialState()): WorldState {
  return makeMockWorld({ tutorialState } as any);
}

describe("engine.worker — ADVANCE_TUTORIAL_STEP / SET_TUTORIAL_FLAG / COMPLETE_TUTORIAL", () => {
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

  it("ADVANCE_TUTORIAL_STEP updates currentStep on existing tutorialState", async () => {
    const world = makeWorldWithTutorial();
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({ type: "ADVANCE_TUTORIAL_STEP", step: "FIRST_BASHO_STARTED" });

    const updated = getWorldUpdated();
    expect(updated).toBeDefined();
    expect(updated!.tutorialState?.currentStep).toBe("FIRST_BASHO_STARTED");
    expect(updated!.tutorialState?.completed).toBe(false);
  });

  it("ADVANCE_TUTORIAL_STEP creates default tutorialState if missing", async () => {
    const world = makeMockWorld({} as any);
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({ type: "ADVANCE_TUTORIAL_STEP", step: "TOUR_BANZUKE" });

    const updated = getWorldUpdated();
    expect(updated).toBeDefined();
    expect(updated!.tutorialState?.currentStep).toBe("TOUR_BANZUKE");
  });

  it("ADVANCE_TUTORIAL_STEP emits WORLD_UPDATED", async () => {
    const world = makeWorldWithTutorial();
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({ type: "ADVANCE_TUTORIAL_STEP", step: "TOUR_RIVALRIES" });

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "WORLD_UPDATED" })
    );
  });

  it("SET_TUTORIAL_FLAG sets flag to true on existing tutorialState", async () => {
    const world = makeWorldWithTutorial();
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({ type: "SET_TUTORIAL_FLAG", flag: "seenStaminaTooltip" });

    const updated = getWorldUpdated();
    expect(updated).toBeDefined();
    expect(updated!.tutorialState?.flags.seenStaminaTooltip).toBe(true);
  });

  it("SET_TUTORIAL_FLAG is a no-op when tutorialState is missing", async () => {
    const world = makeMockWorld({} as any);
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({ type: "SET_TUTORIAL_FLAG", flag: "seenGripTooltip" });

    // No tutorialState → no change
    const updated = getWorldUpdated();
    if (updated) {
      expect(updated.tutorialState?.flags?.seenGripTooltip).toBeUndefined();
    }
  });

  it("SET_TUTORIAL_FLAG emits WORLD_UPDATED", async () => {
    const world = makeWorldWithTutorial();
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({ type: "SET_TUTORIAL_FLAG", flag: "seenMomentumTooltip" });

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "WORLD_UPDATED" })
    );
  });
});
