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

function worldWithTraining(heyaId: string, intensity: "low" | "high"): WorldState {
  const ts = createDefaultTrainingState(heyaId);
  ts.activeProfile = { ...ts.activeProfile, intensity };
  return {
    trainingState: new Map([[heyaId, ts]]),
  } as unknown as WorldState;
}

describe("useTrainingState", () => {
  beforeEach(() => sendCommand.mockClear());

  it("resyncs when the world instance changes (LOAD_WORLD / engine tick)", () => {
    const w1 = worldWithTraining("h1", "low");
    const w2 = worldWithTraining("h1", "high");
    const { result, rerender } = renderHook(({ world }) => useTrainingState(world, "h1"), {
      initialProps: { world: w1 },
    });
    expect(result.current.trainingState.activeProfile.intensity).toBe("low");
    rerender({ world: w2 });
    expect(result.current.trainingState.activeProfile.intensity).toBe("high");
  });

  it("resyncs when playerHeyaId changes", () => {
    const tsA = createDefaultTrainingState("hA");
    tsA.activeProfile = { ...tsA.activeProfile, intensity: "low" };
    const tsB = createDefaultTrainingState("hB");
    tsB.activeProfile = { ...tsB.activeProfile, intensity: "high" };
    const world = {
      trainingState: new Map([
        ["hA", tsA],
        ["hB", tsB],
      ]),
    } as unknown as WorldState;
    const { result, rerender } = renderHook(({ heyaId }) => useTrainingState(world, heyaId), {
      initialProps: { heyaId: "hA" },
    });
    expect(result.current.trainingState.activeProfile.intensity).toBe("low");
    rerender({ heyaId: "hB" });
    expect(result.current.trainingState.activeProfile.intensity).toBe("high");
  });
});
