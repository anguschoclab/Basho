import { describe, it, expect, vi } from "vitest";
import { safeCall } from "../../../../src/engine/utils/safe";

describe("Safe Utilities", () => {
  describe("safeCall", () => {
    it("should execute the function if it does not throw", () => {
      const fn = vi.fn();
      safeCall(fn);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should catch errors and not throw", () => {
      const fn = vi.fn(() => {
        throw new Error("Test error");
      });

      // Spy on console.warn to prevent cluttering the test output
      // and to verify it was called
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      expect(() => safeCall(fn)).not.toThrow();
      expect(fn).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Recovered from error in secondary system:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
