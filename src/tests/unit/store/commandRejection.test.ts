/**
 * commandRejection.test.ts
 *
 * Regression tests for silent command drops (audit WS3-04 / WS5-03 / WS9).
 *
 * When `pendingTick` is set, `sendCommand` drops every non-pause command with
 * only a console warning. A `LOAD_WORLD` issued mid-sim is silently dropped
 * on the worker side while the reducer has already swapped the world — the
 * in-flight tick's WORLD_UPDATED then reverts the user's load. The fix makes
 * rejection observable: sendCommand reports it (return value) and stores a
 * user-facing notice so the UI can surface it.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useGameStore } from "@/store/gameStore";
import { MockFactory } from "../../helpers/utils/MockFactory";

describe("sendCommand rejection feedback", () => {
  beforeEach(() => {
    useGameStore.setState({
      pendingTick: false,
      worker: null,
      error: null,
      isSimulating: false,
    });
  });

  it("returns false and records a user-visible notice when a command is dropped mid-tick", () => {
    const mockPostMessage = vi.fn();
    useGameStore.setState({
      worker: { postMessage: mockPostMessage } as any,
      pendingTick: true,
    });

    const accepted = useGameStore
      .getState()
      .sendCommand({ type: "LOAD_WORLD", world: MockFactory.createWorld({}) });

    expect(accepted).toBe(false);
    expect(mockPostMessage).not.toHaveBeenCalled();
    // The store must surface the rejection so UI can render it — silent
    // console.warn is how the load-revert bug went unnoticed.
    const notice = useGameStore.getState().commandRejected;
    expect(typeof notice === "string" && notice.length > 0).toBe(true);
    expect(notice).toContain("LOAD_WORLD");
  });

  it("returns true and posts the command when no tick is pending", () => {
    const mockPostMessage = vi.fn();
    useGameStore.setState({
      worker: { postMessage: mockPostMessage } as any,
      pendingTick: false,
    });

    const accepted = useGameStore
      .getState()
      .sendCommand({ type: "LOAD_WORLD", world: MockFactory.createWorld({}) });

    expect(accepted).toBe(true);
    expect(mockPostMessage).toHaveBeenCalled();
  });

  it("PAUSE_SIM still passes through mid-tick (returns true)", () => {
    const mockPostMessage = vi.fn();
    useGameStore.setState({
      worker: { postMessage: mockPostMessage } as any,
      pendingTick: true,
    });

    const accepted = useGameStore.getState().sendCommand({ type: "PAUSE_SIM" });
    expect(accepted).toBe(true);
    expect(mockPostMessage).toHaveBeenCalled();
  });

  it("a worker runtime error clears pendingTick and surfaces the failure", () => {
    // initWorker wires onmessage but never onerror — a worker crash leaves
    // pendingTick true forever and silently drops every later command.
    let fakeWorker: {
      onmessage: ((e: MessageEvent) => void) | null;
      onerror: ((e: Event) => void) | null;
      postMessage: ReturnType<typeof vi.fn>;
      terminate: ReturnType<typeof vi.fn>;
    };
    vi.stubGlobal(
      "Worker",
      // `new Worker(...)` requires a constructable — a function returning an
      // object works (the returned object wins over `this`).
      function () {
        fakeWorker = {
          onmessage: null,
          onerror: null,
          postMessage: vi.fn(),
          terminate: vi.fn(),
        };
        return fakeWorker;
      }
    );
    try {
      useGameStore.setState({ worker: null, pendingTick: true, isSimulating: true });
      useGameStore.getState().initWorker();

      fakeWorker!.onerror?.(new Event("error"));

      const s = useGameStore.getState();
      expect(s.pendingTick).toBe(false);
      expect(s.isSimulating).toBe(false);
      expect(s.error).toBeTruthy();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
