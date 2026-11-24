import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { autosaveWithSignal } from "@/state/game/gameHelpers";
import { getAutosaveEnabled } from "@/pages/settingsHelpers";
import { autosave, saveGame } from "@/engine/persistence/saveload";

// Mock dependencies
vi.mock("@/pages/settingsHelpers", () => ({
  getAutosaveEnabled: vi.fn(),
}));

vi.mock("@/engine/persistence/saveload", () => ({
  saveGame: vi.fn(),
  autosave: vi.fn(() => true),
}));

const mockGetAutosaveEnabled = getAutosaveEnabled as Mock;
const mockSaveGame = saveGame as Mock;
const mockAutosave = autosave as Mock;

describe("gameHelpers", () => {
  describe("autosaveWithSignal", () => {
    const mkWorld = (tag: string) => ({ version: "1.0.0", tag }) as any;

    beforeEach(() => {
      vi.useFakeTimers();
      vi.clearAllMocks();
      mockGetAutosaveEnabled.mockReturnValue(true);
    });

    afterEach(() => {
      // Let the 2s save-lock idle timer fire so module-level saveInProgress
      // resets between tests, THEN clear anything newly scheduled.
      vi.advanceTimersByTime(3000);
      vi.clearAllTimers();
      vi.useRealTimers();
    });

    it("returns false and does not save if autosave is disabled", () => {
      mockGetAutosaveEnabled.mockReturnValue(false);

      const result = autosaveWithSignal(mkWorld("a"));

      expect(result).toBe(false);
      expect(mockSaveGame).not.toHaveBeenCalled();
      expect(mockAutosave).not.toHaveBeenCalled();
      vi.advanceTimersByTime(30_000);
      expect(mockAutosave).not.toHaveBeenCalled();
    });

    it("debounces: does not serialize synchronously, saves the latest world after the settle window", () => {
      const w1 = mkWorld("first");
      const w2 = mkWorld("last");

      expect(autosaveWithSignal(w1)).toBe(true);
      vi.advanceTimersByTime(500);
      expect(autosaveWithSignal(w2)).toBe(true);
      expect(mockAutosave).not.toHaveBeenCalled();

      // 1s into w2's window — not yet settled.
      vi.advanceTimersByTime(1000);
      expect(mockAutosave).not.toHaveBeenCalled();

      // Settle window (1.5s after the last call) — one save, latest world wins.
      vi.advanceTimersByTime(500);
      expect(mockAutosave).toHaveBeenCalledTimes(1);
      expect(mockAutosave).toHaveBeenCalledWith(
        w2,
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)
      );
    });

    it("coalesces a rapid burst into a single save", () => {
      const worlds = [mkWorld("w1"), mkWorld("w2"), mkWorld("w3"), mkWorld("w4")];
      for (const w of worlds) {
        autosaveWithSignal(w);
        vi.advanceTimersByTime(300);
      }
      vi.advanceTimersByTime(1500);

      expect(mockAutosave).toHaveBeenCalledTimes(1);
      expect(mockAutosave).toHaveBeenLastCalledWith(worlds[3], expect.any(String));
    });

    it("still saves periodically under continuous churn (staleness cap)", () => {
      // Calls every ~1s keep resetting the debounce; the cap forces a flush.
      for (let i = 0; i < 30; i++) {
        autosaveWithSignal(mkWorld(`churn-${i}`));
        vi.advanceTimersByTime(1000);
      }
      expect(mockAutosave.mock.calls.length).toBeGreaterThanOrEqual(1);

      const callsAfterFirstCap = mockAutosave.mock.calls.length;
      // Churn another 30s — at least one more save must land (never starved).
      for (let i = 30; i < 60; i++) {
        autosaveWithSignal(mkWorld(`churn-${i}`));
        vi.advanceTimersByTime(1000);
      }
      expect(mockAutosave.mock.calls.length).toBeGreaterThanOrEqual(callsAfterFirstCap + 1);
    });

    it("immediate option saves synchronously and supersedes a pending debounce", () => {
      const w1 = mkWorld("stale");
      const w2 = mkWorld("explicit");
      autosaveWithSignal(w1);

      const result = autosaveWithSignal(w2, { immediate: true });

      expect(result).toBe(true);
      expect(mockAutosave).toHaveBeenCalledTimes(1);
      expect(mockAutosave).toHaveBeenCalledWith(w2, expect.any(String));

      // The superseded w1 debounce must not fire a second save.
      vi.advanceTimersByTime(5000);
      expect(mockAutosave).toHaveBeenCalledTimes(1);
    });
  });
});
