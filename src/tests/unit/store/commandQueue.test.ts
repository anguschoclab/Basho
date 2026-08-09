/**
 * Command Queue Tests (B4.1.3)
 * Verifies that non-tick commands are rejected while a tick is in progress.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { useGameStore } from "@/store/gameStore";

describe("Command queue (B4.1.3)", () => {
  beforeEach(() => {
    // Reset store state
    useGameStore.setState({
      pendingTick: false,
      worker: null,
      error: null,
    });
  });

  it("sendCommand rejects non-tick commands when pendingTick is true", () => {
    // Set up a mock worker
    const mockPostMessage = vi.fn();
    const mockWorker = { postMessage: mockPostMessage } as any;
    useGameStore.setState({
      worker: mockWorker,
      pendingTick: true,
    });

    // Try to send a non-tick command
    useGameStore
      .getState()
      .sendCommand({ type: "OFFER_CONTRACT", candidateId: "c1", heyaId: "h1" });

    // Should not post the message — command should be rejected
    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it("sendCommand allows non-tick commands when pendingTick is false", () => {
    const mockPostMessage = vi.fn();
    const mockWorker = { postMessage: mockPostMessage } as any;
    useGameStore.setState({
      worker: mockWorker,
      pendingTick: false,
    });

    useGameStore
      .getState()
      .sendCommand({ type: "OFFER_CONTRACT", candidateId: "c1", heyaId: "h1" });

    expect(mockPostMessage).toHaveBeenCalled();
  });

  it("sendCommand allows tick commands when pendingTick is false", () => {
    const mockPostMessage = vi.fn();
    const mockWorker = { postMessage: mockPostMessage } as any;
    useGameStore.setState({
      worker: mockWorker,
      pendingTick: false,
    });

    useGameStore.getState().sendCommand({ type: "TICK_DAY" });
    expect(mockPostMessage).toHaveBeenCalled();
  });

  it("sendCommand rejects tick commands when pendingTick is true (existing behavior)", () => {
    const mockPostMessage = vi.fn();
    const mockWorker = { postMessage: mockPostMessage } as any;
    useGameStore.setState({
      worker: mockWorker,
      pendingTick: true,
    });

    useGameStore.getState().sendCommand({ type: "TICK_DAY" });
    expect(mockPostMessage).not.toHaveBeenCalled();
  });
});
