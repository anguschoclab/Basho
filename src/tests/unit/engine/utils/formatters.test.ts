import { describe, it, expect } from "vitest";
import type { EngineEvent } from "@/engine/types/events";
import {
  formatStance,
  formatSaveDate,
  formatEventTime,
  formatFinePenalty,
} from "@/engine/utils/formatters";

describe("formatStance", () => {
  it("returns em-dash for null", () => {
    expect(formatStance(null)).toBe("—");
  });

  it("returns em-dash for undefined", () => {
    expect(formatStance(undefined)).toBe("—");
  });

  it("returns em-dash for empty string", () => {
    expect(formatStance("")).toBe("—");
  });

  it("returns em-dash for number", () => {
    expect(formatStance(123)).toBe("—");
  });

  it("returns em-dash for empty array", () => {
    expect(formatStance([])).toBe("—");
  });

  it("returns em-dash for boolean", () => {
    expect(formatStance(false)).toBe("—");
  });

  it("capitalizes a single lowercase word", () => {
    expect(formatStance("migiyotsu")).toBe("Migiyotsu");
  });

  it("replaces hyphens with spaces in hyphenated stance", () => {
    expect(formatStance("migi-yotsu")).toBe("Migi yotsu");
  });

  it("handles multiple hyphens", () => {
    expect(formatStance("a-b-c")).toBe("A b c");
  });

  it("preserves case of remaining characters when first char is already uppercase", () => {
    expect(formatStance("MIGI")).toBe("MIGI");
  });

  it("does not trim whitespace-only strings", () => {
    expect(formatStance("  ")).toBe("  ");
  });

  it("uses custom toString on objects", () => {
    expect(formatStance({ toString: () => "hi" })).toBe("Hi");
  });

  it("returns [object Object] for plain empty object", () => {
    expect(formatStance({})).toBe("[object Object]");
  });
});

describe("formatSaveDate", () => {
  it("formats a valid ISO date string", () => {
    const result = formatSaveDate("2024-01-15T10:30:00Z");
    expect(result).toMatch(/^[A-Z][a-z]{2} \d+/);
  });

  it("returns 'Invalid Date' for an unparseable string", () => {
    expect(formatSaveDate("not-a-date")).toBe("Invalid Date");
  });

  it("returns 'Invalid Date' for empty string", () => {
    expect(formatSaveDate("")).toBe("Invalid Date");
  });

  it("does not throw for any string input", () => {
    expect(() => formatSaveDate("garbage")).not.toThrow();
  });

  it("formats a full ISO timestamp with time components", () => {
    const result = formatSaveDate("2024-06-15T14:30:00Z");
    expect(result).toMatch(/:\d{2}/);
  });
});

describe("formatEventTime", () => {
  const mk = (over: Partial<EngineEvent> = {}): EngineEvent =>
    ({ week: 1, ...over }) as unknown as EngineEvent;

  it("returns B{n} D{d} when day and bashoNumber are both defined", () => {
    expect(formatEventTime(mk({ week: 5, bashoNumber: 3, day: 15 }))).toBe("B3 D15");
  });

  it("returns W{week} when only bashoNumber is defined", () => {
    expect(formatEventTime(mk({ week: 7, bashoNumber: 2 }))).toBe("W7");
  });

  it("returns W{week} when only day is defined", () => {
    expect(formatEventTime(mk({ week: 9, day: 10 }))).toBe("W9");
  });

  it("returns W{week} when neither day nor bashoNumber is defined", () => {
    expect(formatEventTime(mk({ week: 4 }))).toBe("W4");
  });

  it("treats day: 0 as defined (returns B{n} D0)", () => {
    expect(formatEventTime(mk({ week: 1, bashoNumber: 1, day: 0 }))).toBe("B1 D0");
  });

  it("uses bashoNumber 6 (max valid)", () => {
    expect(formatEventTime(mk({ week: 1, bashoNumber: 6, day: 1 }))).toBe("B6 D1");
  });
});

describe("formatFinePenalty", () => {
  it("returns 'Severe fine' at 10,000,000 boundary", () => {
    expect(formatFinePenalty(10_000_000)).toBe("Severe fine");
  });

  it("returns 'Severe fine' above 10M", () => {
    expect(formatFinePenalty(50_000_000)).toBe("Severe fine");
  });

  it("returns 'Significant fine' just below 10M", () => {
    expect(formatFinePenalty(9_999_999)).toBe("Significant fine");
  });

  it("returns 'Significant fine' at 3,000,000 boundary", () => {
    expect(formatFinePenalty(3_000_000)).toBe("Significant fine");
  });

  it("returns 'Moderate fine' just below 3M", () => {
    expect(formatFinePenalty(2_999_999)).toBe("Moderate fine");
  });

  it("returns 'Moderate fine' at 500,000 boundary", () => {
    expect(formatFinePenalty(500_000)).toBe("Moderate fine");
  });

  it("returns 'Minor fine' just below 500k", () => {
    expect(formatFinePenalty(499_999)).toBe("Minor fine");
  });

  it("returns 'Minor fine' for zero", () => {
    expect(formatFinePenalty(0)).toBe("Minor fine");
  });

  it("returns 'Minor fine' for negative amount", () => {
    expect(formatFinePenalty(-1_000_000)).toBe("Minor fine");
  });
});
