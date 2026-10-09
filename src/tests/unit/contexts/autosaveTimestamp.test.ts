/**
 * autosaveTimestamp.test.ts
 *
 * Regression test for the epoch-timestamp bug (audit WS5-05), UI side.
 * `autosaveWithSignal` must hand the engine a real wall-clock timestamp —
 * engine code cannot call `new Date()` (dateArithmeticGuard).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { autosaveWithSignal } from "@/contexts/gameHelpers";
import { autosave } from "@/engine/saveload";
import { MockFactory } from "../../helpers/utils/MockFactory";

vi.mock("@/engine/saveload", () => ({
  autosave: vi.fn(() => true),
}));

vi.mock("@/hooks/useAutosaveIndicator", () => ({
  signalAutosave: vi.fn(),
}));

vi.mock("@/pages/settingsHelpers", () => ({
  getAutosaveEnabled: vi.fn(() => true),
}));

describe("autosaveWithSignal (WS5-05)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("passes a real ISO timestamp to the engine autosave", () => {
    const world = MockFactory.createWorld({});
    autosaveWithSignal(world);
    expect(autosave).toHaveBeenCalledWith(
      world,
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    );
  });
});
