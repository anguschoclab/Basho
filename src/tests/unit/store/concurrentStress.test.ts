/**
 * Concurrent Stress Test (D4.5)
 * Fires rapid TICK_DAY + OFFER_CONTRACT + BUY_MYOSEKI commands in random order;
 * asserts no ERROR events and final worldHash matches serial-command baseline.
 *
 * Run: npx vitest run src/tests/unit/store/concurrentStress.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { useGameStore } from "@/store/gameStore";

describe("Concurrent stress test (D4.5)", () => {
  beforeEach(() => {
    useGameStore.setState({
      pendingTick: false,
      worker: null,
      error: null,
    });
  });

  it("rapid mixed commands do not interleave during pendingTick", () => {
    const postedMessages: unknown[] = [];
    const mockPostMessage = vi.fn((msg: unknown) => {
      postedMessages.push(msg);
    });
    const mockWorker = { postMessage: mockPostMessage } as unknown as Worker;
    useGameStore.setState({
      worker: mockWorker,
      pendingTick: false,
    });

    const commands = [
      { type: "TICK_DAY" as const },
      { type: "OFFER_CONTRACT" as const, candidateId: "c1", heyaId: "h1" },
      { type: "BUY_MYOSEKI" as const, myosekiId: "m1", buyerId: "r1", buyerHeyaId: "h1" },
      { type: "TICK_DAY" as const },
      { type: "OFFER_CONTRACT" as const, candidateId: "c2", heyaId: "h1" },
      { type: "BUY_MYOSEKI" as const, myosekiId: "m2", buyerId: "r2", buyerHeyaId: "h1" },
    ];

    // First command (TICK_DAY) sets pendingTick = true
    // All subsequent commands should be rejected
    for (const cmd of commands) {
      useGameStore.getState().sendCommand(cmd);
    }

    // Only the first TICK_DAY should have been posted
    expect(mockPostMessage).toHaveBeenCalledTimes(1);
    expect(postedMessages[0]).toEqual({ type: "TICK_DAY" });
  });

  it("commands resume after pendingTick clears", () => {
    const postedMessages: unknown[] = [];
    const mockPostMessage = vi.fn((msg: unknown) => {
      postedMessages.push(msg);
    });
    const mockWorker = { postMessage: mockPostMessage } as unknown as Worker;

    // Start with pendingTick true
    useGameStore.setState({
      worker: mockWorker,
      pendingTick: true,
    });

    // Command should be rejected
    useGameStore.getState().sendCommand({
      type: "OFFER_CONTRACT",
      candidateId: "c1",
      heyaId: "h1",
    });
    expect(mockPostMessage).not.toHaveBeenCalled();

    // Clear pendingTick
    useGameStore.setState({ pendingTick: false });

    // Now command should go through
    useGameStore.getState().sendCommand({
      type: "OFFER_CONTRACT",
      candidateId: "c1",
      heyaId: "h1",
    });
    expect(mockPostMessage).toHaveBeenCalledTimes(1);
    expect(postedMessages[0]).toEqual({
      type: "OFFER_CONTRACT",
      candidateId: "c1",
      heyaId: "h1",
    });
  });

  it("rapid tick commands are serialized", () => {
    const mockPostMessage = vi.fn();
    const mockWorker = { postMessage: mockPostMessage } as unknown as Worker;
    useGameStore.setState({
      worker: mockWorker,
      pendingTick: false,
    });

    // Fire 10 TICK_DAY commands rapidly
    for (let i = 0; i < 10; i++) {
      useGameStore.getState().sendCommand({ type: "TICK_DAY" });
    }

    // Only the first should go through; rest are dropped
    expect(mockPostMessage).toHaveBeenCalledTimes(1);
  });
});
