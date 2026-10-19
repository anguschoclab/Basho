/**
 * promotionColors.test.ts
 * =======================
 * Rank tier colors must be token-derived (hsl(var(--…))) rather than
 * hardcoded hue/sat/light literals.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const PROMOTION_SRC = join(__dirname, "../../../constants/ui/promotion.ts");
const NUMERIC_HSL = /hsl\(\s*\d/;

describe("promotion tier colors", () => {
  const src = readFileSync(PROMOTION_SRC, "utf8");

  it("uses no hardcoded numeric hsl() literals", () => {
    expect(NUMERIC_HSL.test(src)).toBe(false);
  });

  it("derives rank colors from semantic tokens", () => {
    const colorProps = [...src.matchAll(/color:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(colorProps.length).toBeGreaterThanOrEqual(5);
    for (const c of colorProps) {
      expect(c).toMatch(/^hsl\(var\(--[a-z-]+/);
    }
  });
});
