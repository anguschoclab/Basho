/**
 * useTrainingState.test.tsx
 * =========================
 * V17-F14 — the hook cached world.trainingState once at mount and never
 * resynced on world/playerHeyaId change, leaving stale UI after LOAD_WORLD.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTrainingState } from "@/hooks/useTrainingState";
import { createDefaultTrainingState } from "@/presenters/uiDigest";
import type { WorldState } from "@/presenters/uiDigest";

const sendCommand = vi.fn();
vi.mock("@/state/stores/gameStore", () => ({
  useGameStore: (sel: (s: { sendCommand: typeof sendCommand }) => unknown) => sel({ sendCommand }),
}));

function worldWithTraining(heyaId: string, intensity: "conservative" | "intensive"): WorldState {
  const ts = createDefaultTrainingState(heyaId);
  ts.activeProfile = { ...ts.activeProfile, intensity };
  return {
    trainingState: new Map([[heyaId, ts]]),
  } as unknown as WorldState;
}

describe("useTrainingState", () => {
  beforeEach(() => sendCommand.mockClear());

  it("resyncs when the world instance changes (LOAD_WORLD / engine tick)", () => {
    const w1 = worldWithTraining("h1", "conservative");
    const w2 = worldWithTraining("h1", "intensive");
    const { result, rerender } = renderHook(({ world }) => useTrainingState(world, "h1"), {
      initialProps: { world: w1 },
    });
    expect(result.current.trainingState.activeProfile.intensity).toBe("conservative");
    rerender({ world: w2 });
    expect(result.current.trainingState.activeProfile.intensity).toBe("intensive");
  });

  it("resyncs when playerHeyaId changes", () => {
    const tsA = createDefaultTrainingState("hA");
    tsA.activeProfile = { ...tsA.activeProfile, intensity: "conservative" };
    const tsB = createDefaultTrainingState("hB");
    tsB.activeProfile = { ...tsB.activeProfile, intensity: "intensive" };
    const world = {
      trainingState: new Map([
        ["hA", tsA],
        ["hB", tsB],
      ]),
    } as unknown as WorldState;
    const { result, rerender } = renderHook(({ heyaId }) => useTrainingState(world, heyaId), {
      initialProps: { heyaId: "hA" },
    });
    expect(result.current.trainingState.activeProfile.intensity).toBe("conservative");
    rerender({ heyaId: "hB" });
    expect(result.current.trainingState.activeProfile.intensity).toBe("intensive");
  });
});
