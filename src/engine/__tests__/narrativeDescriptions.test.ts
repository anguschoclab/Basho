import { describe, it, expect } from "vitest";
import { describeAttribute } from "../narrativeDescriptions";

describe("describeAttribute", () => {
  it("returns 'Exceptional' for values >= 90", () => {
    expect(describeAttribute(90)).toBe("Exceptional");
    expect(describeAttribute(95)).toBe("Exceptional");
    expect(describeAttribute(100)).toBe("Exceptional");
  });

  it("returns 'Outstanding' for values >= 75 and < 90", () => {
    expect(describeAttribute(75)).toBe("Outstanding");
    expect(describeAttribute(85)).toBe("Outstanding");
    expect(describeAttribute(89.9)).toBe("Outstanding");
  });

  it("returns 'Strong' for values >= 60 and < 75", () => {
    expect(describeAttribute(60)).toBe("Strong");
    expect(describeAttribute(70)).toBe("Strong");
    expect(describeAttribute(74.9)).toBe("Strong");
  });

  it("returns 'Capable' for values >= 45 and < 60", () => {
    expect(describeAttribute(45)).toBe("Capable");
    expect(describeAttribute(50)).toBe("Capable");
    expect(describeAttribute(59.9)).toBe("Capable");
  });

  it("returns 'Developing' for values >= 30 and < 45", () => {
    expect(describeAttribute(30)).toBe("Developing");
    expect(describeAttribute(40)).toBe("Developing");
    expect(describeAttribute(44.9)).toBe("Developing");
  });

  it("returns 'Limited' for values >= 15 and < 30", () => {
    expect(describeAttribute(15)).toBe("Limited");
    expect(describeAttribute(20)).toBe("Limited");
    expect(describeAttribute(29.9)).toBe("Limited");
  });

  it("returns 'Struggling' for values < 15", () => {
    expect(describeAttribute(14.9)).toBe("Struggling");
    expect(describeAttribute(10)).toBe("Struggling");
    expect(describeAttribute(0)).toBe("Struggling");
  });

  it("handles out of bounds cleanly (clamps to 0-100)", () => {
    expect(describeAttribute(101)).toBe("Exceptional"); // Clamps to 100
    expect(describeAttribute(150)).toBe("Exceptional"); // Clamps to 100
    expect(describeAttribute(-1)).toBe("Struggling");  // Clamps to 0
    expect(describeAttribute(-50)).toBe("Struggling"); // Clamps to 0
  });

  it("handles NaN and non-finite values safely", () => {
    // Number.isFinite(NaN) is false -> safe returns 0 -> "Struggling"
    expect(describeAttribute(NaN)).toBe("Struggling");
    // Number.isFinite(Infinity) is false -> safe returns 0 -> "Struggling"
    expect(describeAttribute(Infinity)).toBe("Struggling");
    // Number.isFinite(-Infinity) is false -> safe returns 0 -> "Struggling"
    expect(describeAttribute(-Infinity)).toBe("Struggling");
  });

  it("handles string numbers cleanly", () => {
    // Number("95") is 95 -> safe returns 95 -> "Exceptional"
    // @ts-expect-error Testing bad input
    expect(describeAttribute("95")).toBe("Exceptional");
    // Number("invalid") is NaN -> safe returns 0 -> "Struggling"
    // @ts-expect-error Testing bad input
    expect(describeAttribute("invalid")).toBe("Struggling");
  });
});
