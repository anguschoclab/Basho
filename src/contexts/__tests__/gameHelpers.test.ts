import { describe, it, expect, vi, beforeEach } from "vitest";
import { autosaveWithSignal } from "../gameHelpers";
import { getAutosaveEnabled } from "../../pages/SettingsPage";
import { autosave, saveGame } from "../../engine/saveload";
import { WorldState } from "../../engine/types/world";

vi.mock("../../pages/SettingsPage", () => ({
  getAutosaveEnabled: vi.fn(),
}));

vi.mock("../../engine/saveload", () => ({
  saveGame: vi.fn(),
  autosave: vi.fn(() => true),
}));

describe("gameHelpers", () => {
  describe("autosaveWithSignal", () => {
    const mockWorld = { version: 1 } as any;
    const mockSaveData = { world: mockWorld };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("returns false and does not save if autosave is disabled", () => {
      vi.mocked(getAutosaveEnabled).mockReturnValue(false);

      const result = autosaveWithSignal(mockWorld);

      expect(result).toBe(false);
      expect(vi.mocked(saveGame)).not.toHaveBeenCalled();
      expect(vi.mocked(autosave)).not.toHaveBeenCalled();
    });

    it("generates save data and performs autosave when enabled", () => {
      vi.mocked(getAutosaveEnabled).mockReturnValue(true);

      const result = autosaveWithSignal(mockWorld);

      expect(result).toBe(true);
      expect(vi.mocked(autosave)).toHaveBeenCalledWith(mockWorld);
    });
  });
});
