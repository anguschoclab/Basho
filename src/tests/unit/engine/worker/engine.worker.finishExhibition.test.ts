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

describe("engine.worker — FINISH_EXHIBITION", () => {
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

  it("FINISH_EXHIBITION sets flag, completed=true, and currentStep=DONE in one WORLD_UPDATED", async () => {
    const world = makeWorldWithTutorial();
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "FINISH_EXHIBITION",
      flag: "finishedExhibition",
      step: "FIRST_BASHO_STARTED",
    });

    const updated = getWorldUpdated();
    expect(updated).toBeDefined();
    const ts = updated!.tutorialState;
    expect(ts).toBeDefined();
    expect(ts!.completed).toBe(true);
    expect(ts!.currentStep).toBe("DONE");
    expect(ts!.flags.finishedExhibition).toBe(true);
  });

  it("FINISH_EXHIBITION emits exactly one WORLD_UPDATED (batched, not three)", async () => {
    const world = makeWorldWithTutorial();
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "FINISH_EXHIBITION",
      flag: "finishedExhibition",
      step: "FIRST_BASHO_STARTED",
    });

    const worldUpdatedCalls = mockPostMessage.mock.calls.filter(
      (c) => (c[0] as { type?: string })?.type === "WORLD_UPDATED"
    );
    expect(worldUpdatedCalls).toHaveLength(1);
  });

  it("FINISH_EXHIBITION creates default tutorialState if missing", async () => {
    const world = makeMockWorld({} as any);
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "FINISH_EXHIBITION",
      flag: "finishedExhibition",
      step: "FIRST_BASHO_STARTED",
    });

    const updated = getWorldUpdated();
    expect(updated).toBeDefined();
    expect(updated!.tutorialState?.completed).toBe(true);
    expect(updated!.tutorialState?.currentStep).toBe("DONE");
    expect(updated!.tutorialState?.flags.finishedExhibition).toBe(true);
  });

  it("FINISH_EXHIBITION preserves existing flags", async () => {
    const world = makeWorldWithTutorial({
      ...createDefaultTutorialState(),
      flags: {
        ...createDefaultTutorialState().flags,
        seenStaminaTooltip: true,
        seenGripTooltip: true,
      },
    });
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "FINISH_EXHIBITION",
      flag: "finishedExhibition",
      step: "FIRST_BASHO_STARTED",
    });

    const updated = getWorldUpdated();
    expect(updated).toBeDefined();
    expect(updated!.tutorialState?.flags.seenStaminaTooltip).toBe(true);
    expect(updated!.tutorialState?.flags.seenGripTooltip).toBe(true);
    expect(updated!.tutorialState?.flags.finishedExhibition).toBe(true);
  });

  it("tour-race regression: checkTourTrigger does not see FIRST_BASHO_STARTED after FINISH_EXHIBITION", async () => {
    // Simulate what gameStore.checkTourTrigger does:
    // It reads world.tutorialState.currentStep from the WORLD_UPDATED payload.
    // After FINISH_EXHIBITION, currentStep is "DONE", not "FIRST_BASHO_STARTED",
    // so the tour trigger condition (step === "FIRST_BASHO_STARTED" && isInterim)
    // is never satisfied.
    const world = makeWorldWithTutorial();
    await triggerMessage({ type: "LOAD_WORLD", world });
    vi.clearAllMocks();

    await triggerMessage({
      type: "FINISH_EXHIBITION",
      flag: "finishedExhibition",
      step: "FIRST_BASHO_STARTED",
    });

    const updated = getWorldUpdated();
    expect(updated).toBeDefined();
    const step = updated!.tutorialState?.currentStep;
    // checkTourTrigger only triggers when step === "FIRST_BASHO_STARTED"
    expect(step).not.toBe("FIRST_BASHO_STARTED");
    expect(step).toBe("DONE");
  });
});
