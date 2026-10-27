import { describe, it, expect } from "vitest";
import { formatCurrency } from "@/engine/utils/formatters";

describe("formatCurrency", () => {
  it("formats with ja-JP locale by default (full-width ￥)", () => {
    const result = formatCurrency(1000000);
    expect(result).toContain("￥");
    expect(result).not.toContain("¥");
  });

  it("formats with en-US locale (half-width ¥)", () => {
    const result = formatCurrency(1000000, "en-US");
    expect(result).toContain("¥");
    expect(result).not.toContain("￥");
  });

  it("handles zero", () => {
    expect(formatCurrency(0)).toContain("￥");
    expect(formatCurrency(0, "en-US")).toContain("¥");
  });

  it("handles negative amounts", () => {
    const result = formatCurrency(-500);
    expect(result).toContain("￥");
    expect(result).toMatch(/500/);
  });

  it("formats large amounts with grouping", () => {
    const result = formatCurrency(100000000);
    expect(result).toContain("￥");
    expect(result).toMatch(/100,000,000/);
  });

  it("does not include fractional digits", () => {
    const result = formatCurrency(1234.56);
    expect(result).not.toMatch(/\.\d/);
  });

  it("en-US and ja-JP produce same numeric grouping", () => {
    const en = formatCurrency(1234567, "en-US").replace(/[¥￥]/g, "");
    const ja = formatCurrency(1234567, "ja-JP").replace(/[¥￥]/g, "");
    expect(en).toBe(ja);
  });
});
