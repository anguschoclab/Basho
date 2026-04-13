import { describe, it, expect, vi, beforeEach } from "vitest";
import { autosaveWithSignal } from "../gameHelpers";
import { getAutosaveEnabled } from "../../pages/SettingsPage";
import { autosave, saveGame } from "../../engine/saveload";
import { WorldState } from "../../engine/types/world";

// Mock dependencies
const mockGetAutosaveEnabled = vi.fn();
const mockSaveGame = vi.fn();
const mockAutosave = vi.fn(() => true);

vi.mock("../../pages/SettingsPage", () => ({
  getAutosaveEnabled: mockGetAutosaveEnabled,
}));

vi.mock("../../engine/saveload", () => ({
  saveGame: mockSaveGame,
  autosave: mockAutosave,
}));

describe("gameHelpers", () => {
  describe("autosaveWithSignal", () => {
    const mockWorld = { version: 1 } as any;
    const mockSaveData = { world: mockWorld };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("returns false and does not save if autosave is disabled", () => {
      mockGetAutosaveEnabled.mockReturnValue(false);

      const result = autosaveWithSignal(mockWorld);

      expect(result).toBe(false);
      expect(mockSaveGame).not.toHaveBeenCalled();
      expect(mockAutosave).not.toHaveBeenCalled();
    });

    it("generates save data and performs autosave when enabled", () => {
      mockGetAutosaveEnabled.mockReturnValue(true);

      const result = autosaveWithSignal(mockWorld);

      expect(result).toBe(true);
      expect(mockAutosave).toHaveBeenCalledWith(mockWorld);
    });
  });
});
