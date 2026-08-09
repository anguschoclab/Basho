import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const source = readFileSync(join(__dirname, "../../../engine/myosekiMarket.ts"), "utf-8");

describe("myosekiMarket.ts uses imported constants (not hardcoded)", () => {
  it("imports from constants/engine/economic", () => {
    expect(source).toMatch(/constants\/engine\/economic/);
  });

  it("imports MYOSEKI_TOTAL_COUNT", () => {
    expect(source).toContain("MYOSEKI_TOTAL_COUNT");
  });

  it("imports MYOSEKI_BASE_ASKING_PRICE", () => {
    expect(source).toContain("MYOSEKI_BASE_ASKING_PRICE");
  });

  it("imports MYOSEKI_MAX_ASKING_PRICE", () => {
    expect(source).toContain("MYOSEKI_MAX_ASKING_PRICE");
  });

  it("imports MYOSEKI_GENERATION_BASE_PRICES", () => {
    expect(source).toContain("MYOSEKI_GENERATION_BASE_PRICES");
  });

  it("does not hardcode TOTAL_MYOSEKI = 105", () => {
    expect(source).not.toMatch(/TOTAL_MYOSEKI\s*=\s*105/);
  });

  it("does not hardcode BASE_ASKING_PRICE = 150_000_000", () => {
    expect(source).not.toMatch(/BASE_ASKING_PRICE\s*=\s*150_000_000/);
  });

  it("does not hardcode MAX_ASKING_PRICE = 350_000_000", () => {
    expect(source).not.toMatch(/MAX_ASKING_PRICE\s*=\s*350_000_000/);
  });

  it("does not hardcode prestige tier prices inline", () => {
    expect(source).not.toMatch(/prestigeTier === "elite"\s*\?\s*250_000_000/);
  });
});
