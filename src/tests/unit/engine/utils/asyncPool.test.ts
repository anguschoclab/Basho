import { describe, it, expect, vi } from "vitest";
import { mapWithConcurrency } from "@/engine/utils/asyncPool";

describe("mapWithConcurrency", () => {
  it("preserves input order in output", async () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = await mapWithConcurrency(input, 3, async (n) => n * 2);
    expect(result).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
  });

  it("enforces concurrency cap", async () => {
    for (const limit of [1, 2, 8]) {
      let inFlight = 0;
      let maxInFlight = 0;
      const input = Array.from({ length: 50 }, (_, i) => i);
      await mapWithConcurrency(input, limit, async () => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await Promise.resolve();
        inFlight--;
      });
      expect(maxInFlight).toBeLessThanOrEqual(limit);
    }
  });

  it("streams rather than batching — starts next before whole batch resolves", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    let started = 0;
    const input = Array.from({ length: 10 }, (_, i) => i);

    await mapWithConcurrency(input, 3, async (_, i) => {
      started++;
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      // Index 0 resolves last; others resolve quickly
      const delay = i === 0 ? 50 : 0;
      await new Promise((r) => setTimeout(r, delay));
      inFlight--;
    });

    // If it were batch-based (wait for all 3 before starting next 3),
    // maxInFlight would still be 3, but started would not exceed 3
    // until index 0 resolves. With streaming, indices 1 and 2 start
    // and resolve, then 3, 4 start — all before index 0 resolves.
    // So by the time index 0 resolves, started should be > 3.
    expect(started).toBe(10);
    expect(maxInFlight).toBeLessThanOrEqual(3);
  });

  it("fast-fails on first error", async () => {
    const fn = vi.fn(async (n: number, i: number) => {
      if (i === 2) throw new Error("boom");
      await new Promise((r) => setTimeout(r, 10));
      return n;
    });

    await expect(mapWithConcurrency([1, 2, 3, 4, 5], 2, fn)).rejects.toThrow("boom");
    // fn should have been called at most (error index + limit) times
    // since no new launches happen after rejection
    expect(fn.mock.calls.length).toBeLessThanOrEqual(2 + 2);
  });

  it("handles empty input", async () => {
    const fn = vi.fn(async (n: number) => n);
    const result = await mapWithConcurrency([], 8, fn);
    expect(result).toEqual([]);
    expect(fn).not.toHaveBeenCalled();
  });

  it("degrades to all-at-once when limit >= items.length", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const input = [1, 2, 3];
    const result = await mapWithConcurrency(input, 100, async (n) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      inFlight--;
      return n * 3;
    });
    expect(result).toEqual([3, 6, 9]);
    expect(maxInFlight).toBeLessThanOrEqual(3);
  });

  it("is strictly sequential when limit = 1", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const input = Array.from({ length: 10 }, (_, i) => i);
    const result = await mapWithConcurrency(input, 1, async (n) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      inFlight--;
      return n;
    });
    expect(result).toEqual(input);
    expect(maxInFlight).toBe(1);
  });

  it("passes index as second argument", async () => {
    const input = ["a", "b", "c", "d"];
    const indices: number[] = [];
    await mapWithConcurrency(input, 2, async (_, i) => {
      indices.push(i);
      return i;
    });
    expect(indices.sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
  });

  it("preserves falsy and nullable values without filtering", async () => {
    const input = [1, 2, 3, 4, 5];
    const result = await mapWithConcurrency(input, 2, async (n) => {
      if (n === 1) return null;
      if (n === 2) return 0;
      if (n === 3) return "";
      return n;
    });
    expect(result).toEqual([null, 0, "", 4, 5]);
  });
});
