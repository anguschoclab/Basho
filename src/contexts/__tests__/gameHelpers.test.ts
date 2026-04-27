/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { autosaveWithSignal } from "../gameHelpers";
import { getAutosaveEnabled } from "../../pages/settingsHelpers";
import { autosave, saveGame } from "../../engine/saveload";

// Mock dependencies
vi.mock("../../pages/settingsHelpers", () => ({
  getAutosaveEnabled: vi.fn(),
}));

vi.mock("../../engine/saveload", () => ({
  saveGame: vi.fn(),
  autosave: vi.fn(() => true),
}));

const mockGetAutosaveEnabled = vi.mocked(getAutosaveEnabled);
const mockSaveGame = vi.mocked(saveGame);
const mockAutosave = vi.mocked(autosave);

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
