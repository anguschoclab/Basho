import { describe, it, expect, vi, beforeEach } from "vitest";
import { autosaveWithSignal } from "../gameHelpers";
import { getAutosaveEnabled } from "../../pages/SettingsPage";
import { generateSaveData, performAutosave } from "../../engine/saveload";
import { WorldState } from "../../engine/types/save";

// Mock dependencies
vi.mock("../../pages/SettingsPage", () => ({
  getAutosaveEnabled: vi.fn(),
}));

vi.mock("../../engine/saveload", () => ({
  generateSaveData: vi.fn(),
  performAutosave: vi.fn(),
}));

describe("gameHelpers", () => {
  describe("autosaveWithSignal", () => {
    const mockWorld = { version: 1 } as WorldState;
    const mockSaveData = { world: mockWorld };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("returns false and does not save if autosave is disabled", () => {
      vi.mocked(getAutosaveEnabled).mockReturnValue(false);

      const result = autosaveWithSignal(mockWorld);

      expect(result).toBe(false);
      expect(generateSaveData).not.toHaveBeenCalled();
      expect(performAutosave).not.toHaveBeenCalled();
    });

    it("generates save data and performs autosave when enabled", () => {
      vi.mocked(getAutosaveEnabled).mockReturnValue(true);
      vi.mocked(generateSaveData).mockReturnValue(mockSaveData);

      const result = autosaveWithSignal(mockWorld);

      expect(result).toBe(true);
      expect(generateSaveData).toHaveBeenCalledWith(mockWorld);
      expect(performAutosave).toHaveBeenCalledWith(mockSaveData);
    });
  });
});
