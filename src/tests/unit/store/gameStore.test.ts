import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useGameStore } from "@/store/gameStore";
import type { EngineEvent } from "@/engine/worker/types";
import type { WorldState } from "@/engine/types/world";

// Mock Worker constructor — returns a mock we can emit events through.
// The store's initWorker() will call `new Worker(url, opts)`, which invokes
// this mock, returning mockWorkerObj. The store then sets onmessage on it.
const mockWorkerObj: {
  onmessage: ((e: MessageEvent<EngineEvent>) => void) | null;
  postMessage: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
} = {
  onmessage: null,
  postMessage: vi.fn(),
  terminate: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

class MockWorkerCtor {
  onmessage = mockWorkerObj.onmessage;
  postMessage = mockWorkerObj.postMessage;
  terminate = mockWorkerObj.terminate;
  addEventListener = mockWorkerObj.addEventListener;
  removeEventListener = mockWorkerObj.removeEventListener;
  constructor() {
    return mockWorkerObj;
  }
}
vi.stubGlobal("Worker", MockWorkerCtor);

describe("gameStore - pendingTick lifecycle", () => {
  beforeEach(() => {
    useGameStore.setState({
      digest: null,
      workerWorld: null,
      worldVersion: 0,
      pendingTick: false,
      isSimulating: false,
      progress: null,
      error: null,
      showTour: false,
      dismissedTourReason: null,
      worker: null,
      onWorldUpdated: null,
    });
    mockWorkerObj.onmessage = null;
    mockWorkerObj.postMessage = vi.fn();
  });

  afterEach(() => {
    useGameStore.setState({ worker: null });
  });

  // Call initWorker so the store wires up its real onmessage handler on our mock worker
  function initAndGetWorker() {
    useGameStore.getState().initWorker();
    return mockWorkerObj;
  }

  function emit(worker: typeof mockWorkerObj, event: EngineEvent) {
    worker.onmessage?.({ data: event } as MessageEvent<EngineEvent>);
  }

  it("TICK_DAY sets pendingTick to true", () => {
    initAndGetWorker();

    useGameStore.getState().sendCommand({ type: "TICK_DAY" });

    expect(useGameStore.getState().pendingTick).toBe(true);
  });

  it("TICK_COMPLETED clears pendingTick", () => {
    const mockWorker = initAndGetWorker();
    useGameStore.setState({ pendingTick: true, isSimulating: true });

    emit(mockWorker, {
      type: "TICK_COMPLETED",
      digest: { mockDigest: true } as any,
    });

    expect(useGameStore.getState().pendingTick).toBe(false);
    expect(useGameStore.getState().isSimulating).toBe(false);
  });

  it("ERROR clears pendingTick", () => {
    const mockWorker = initAndGetWorker();
    useGameStore.setState({ pendingTick: true, isSimulating: true });

    emit(mockWorker, {
      type: "ERROR",
      message: "Test error",
    });

    expect(useGameStore.getState().pendingTick).toBe(false);
    expect(useGameStore.getState().isSimulating).toBe(false);
    expect(useGameStore.getState().error).toBe("Test error");
  });

  it("WORLD_UPDATED clears pendingTick", () => {
    const mockWorker = initAndGetWorker();
    useGameStore.setState({ pendingTick: true });

    emit(mockWorker, {
      type: "WORLD_UPDATED",
      world: { id: "test" } as WorldState,
      version: 1,
    });

    expect(useGameStore.getState().pendingTick).toBe(false);
  });

  it("second TICK_DAY is dropped while pendingTick is true", () => {
    const mockWorker = initAndGetWorker();
    useGameStore.setState({ pendingTick: true });

    useGameStore.getState().sendCommand({ type: "TICK_DAY" });

    expect(mockWorker.postMessage).not.toHaveBeenCalled();
  });

  it("TICK_COMPLETED then TICK_DAY succeeds (not dropped)", () => {
    const mockWorker = initAndGetWorker();
    useGameStore.setState({ pendingTick: true });

    emit(mockWorker, {
      type: "TICK_COMPLETED",
      digest: { mockDigest: true } as any,
    });

    expect(useGameStore.getState().pendingTick).toBe(false);

    useGameStore.getState().sendCommand({ type: "TICK_DAY" });

    expect(mockWorker.postMessage).toHaveBeenCalledWith({ type: "TICK_DAY" });
    expect(useGameStore.getState().pendingTick).toBe(true);
  });
});
