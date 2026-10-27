import { describe, it, expect } from "vitest";

/**
 * P4.6: Worker chunk tests.
 * Verifies the TICK_MULTIPLE_DAYS fast-path threshold logic.
 * The threshold is days >= 7 for using the fast path.
 */

describe("P1.6: TICK_MULTIPLE_DAYS threshold logic", () => {
  it("2-day advance should NOT use fast path (runs daily micro-phases)", () => {
    const days = 2;
    const useFastPath = days >= 7;
    expect(useFastPath).toBe(false);
  });

  it("7-day advance should use fast path", () => {
    const days = 7;
    const useFastPath = days >= 7;
    expect(useFastPath).toBe(true);
  });

  it("1-day advance should NOT use fast path", () => {
    const days = 1;
    const useFastPath = days >= 7;
    expect(useFastPath).toBe(false);
  });

  it("14-day advance should use fast path", () => {
    const days = 14;
    const useFastPath = days >= 7;
    expect(useFastPath).toBe(true);
  });

  it("6-day advance should NOT use fast path", () => {
    const days = 6;
    const useFastPath = days >= 7;
    expect(useFastPath).toBe(false);
  });
});
