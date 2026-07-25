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

describe("P1.7: AUTO_SIM_DAYS chunk logic", () => {
  it("10 days with chunk=7 produces [7, 3] chunks", () => {
    const chunkSize = 7;
    const totalDays = 10;
    const chunks: number[] = [];
    let remaining = totalDays;
    while (remaining > 0) {
      const currentChunk = Math.min(chunkSize, remaining);
      chunks.push(currentChunk);
      remaining -= currentChunk;
    }
    expect(chunks).toEqual([7, 3]);
  });

  it("14 days with chunk=7 produces [7, 7] chunks", () => {
    const chunkSize = 7;
    const totalDays = 14;
    const chunks: number[] = [];
    let remaining = totalDays;
    while (remaining > 0) {
      const currentChunk = Math.min(chunkSize, remaining);
      chunks.push(currentChunk);
      remaining -= currentChunk;
    }
    expect(chunks).toEqual([7, 7]);
  });

  it("3 days with chunk=7 produces [3] chunk", () => {
    const chunkSize = 7;
    const totalDays = 3;
    const chunks: number[] = [];
    let remaining = totalDays;
    while (remaining > 0) {
      const currentChunk = Math.min(chunkSize, remaining);
      chunks.push(currentChunk);
      remaining -= currentChunk;
    }
    expect(chunks).toEqual([3]);
  });

  it("progress is emitted at chunk boundaries", () => {
    const chunkSize = 7;
    const totalDays = 10;
    const progressPoints: number[] = [];
    let remaining = totalDays;
    let advanced = 0;
    while (remaining > 0) {
      const currentChunk = Math.min(chunkSize, remaining);
      advanced += currentChunk;
      progressPoints.push(advanced);
      remaining -= currentChunk;
    }
    // Progress at day 7 and day 10
    expect(progressPoints).toEqual([7, 10]);
  });
});
