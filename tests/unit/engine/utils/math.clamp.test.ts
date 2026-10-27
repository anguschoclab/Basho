import { describe, it, expect } from "vitest";
import { clamp, clampInt, clamp01 } from "@/engine/utils/math";

describe("clamp", () => {
  it("returns value when within range", () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });

  it("clamps to upper bound", () => {
    expect(clamp(150, 0, 100)).toBe(100);
  });

  it("clamps to lower bound", () => {
    expect(clamp(-10, 0, 100)).toBe(0);
  });

  it("works with fractional range", () => {
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });

  it("handles lo === hi", () => {
    expect(clamp(10, 5, 5)).toBe(5);
  });

  it("handles negative ranges", () => {
    expect(clamp(-15, -20, -10)).toBe(-15);
    expect(clamp(-25, -20, -10)).toBe(-20);
    expect(clamp(-5, -20, -10)).toBe(-10);
  });

  it("handles zero correctly", () => {
    expect(clamp(0, 0, 100)).toBe(0);
  });

  it("propagates NaN", () => {
    expect(clamp(NaN, 0, 100)).toBeNaN();
  });
});

describe("clampInt", () => {
  it("truncates fractional values", () => {
    expect(clampInt(5.7, 0, 100)).toBe(5);
  });

  it("clamps to upper bound after truncation", () => {
    expect(clampInt(150.9, 0, 100)).toBe(100);
  });

  it("clamps to lower bound after truncation", () => {
    expect(clampInt(-10.5, 0, 100)).toBe(0);
  });

  it("handles negative ranges", () => {
    expect(clampInt(-15.5, -20, -10)).toBe(-15);
  });
});

describe("clamp01", () => {
  it("returns value when within [0,1]", () => {
    expect(clamp01(0.5)).toBe(0.5);
  });

  it("clamps to 1", () => {
    expect(clamp01(1.5)).toBe(1);
  });

  it("clamps to 0", () => {
    expect(clamp01(-0.5)).toBe(0);
  });

  it("handles boundary values", () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(1)).toBe(1);
  });
});
