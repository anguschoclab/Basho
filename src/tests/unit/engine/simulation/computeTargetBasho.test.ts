import { describe, it, expect } from "vitest";
import { computeTargetBasho } from "@/engine/simulation/AutoSimService";
import type { SimDuration } from "@/engine/simulation/AutoSimService";

describe("computeTargetBasho", () => {
  it("converts days to basho (15 days per basho)", () => {
    expect(computeTargetBasho({ type: "days", count: 15 })).toBe(1);
    expect(computeTargetBasho({ type: "days", count: 30 })).toBe(2);
    expect(computeTargetBasho({ type: "days", count: 7 })).toBe(1);
    expect(computeTargetBasho({ type: "days", count: 0 })).toBe(0);
  });

  it("converts weeks to basho (9 weeks per basho)", () => {
    expect(computeTargetBasho({ type: "weeks", count: 9 })).toBe(1);
    expect(computeTargetBasho({ type: "weeks", count: 18 })).toBe(2);
    expect(computeTargetBasho({ type: "weeks", count: 5 })).toBe(1);
    expect(computeTargetBasho({ type: "weeks", count: 0 })).toBe(0);
  });

  it("converts months to basho (2 months per basho)", () => {
    expect(computeTargetBasho({ type: "months", count: 2 })).toBe(1);
    expect(computeTargetBasho({ type: "months", count: 4 })).toBe(2);
    expect(computeTargetBasho({ type: "months", count: 1 })).toBe(1);
    expect(computeTargetBasho({ type: "months", count: 0 })).toBe(0);
  });

  it("converts basho count directly", () => {
    expect(computeTargetBasho({ type: "basho", count: 5 })).toBe(5);
    expect(computeTargetBasho({ type: "basho", count: 1 })).toBe(1);
    expect(computeTargetBasho({ type: "basho", count: 0 })).toBe(0);
  });

  it("converts years to basho (6 basho per year)", () => {
    expect(computeTargetBasho({ type: "years", count: 1 })).toBe(6);
    expect(computeTargetBasho({ type: "years", count: 2 })).toBe(12);
    expect(computeTargetBasho({ type: "years", count: 0 })).toBe(0);
  });

  it("returns 600 for untilEvent (100-year cap)", () => {
    expect(computeTargetBasho({ type: "untilEvent", count: 0 } as unknown as SimDuration)).toBe(600);
  });
});
