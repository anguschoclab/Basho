/**
 * primitiveTokens.test.tsx
 * ========================
 * Source-level contract: UI components must use semantic color tokens and
 * never raw white/black utilities or hardcoded numeric hsl() literals.
 * Complements the designScan CSV gate by asserting directly on source.
 */

import { describe, it, expect } from "vitest";
import { join, relative } from "path";
import { readFileSync } from "fs";
import { SRC, findFiles } from "@tests/helpers/fsScan";

const SCAN_DIRS = ["components", "pages", "contexts"];

const RAW_WHITE_BLACK = /\b(?:text|bg|border|ring|divide|from|to|via)-(?:white|black)\b/;
const NUMERIC_HSL = /hsl\(\s*\d/; // hsl(var(--x)) is fine; hsl(44 …) is not

// Sanctioned literal-color home for canvas/SVG drawing code.
const EXEMPT = new Set(["src/constants/ui/drawingPalette.ts"]);

const files = SCAN_DIRS.flatMap((d) => findFiles(join(SRC, d), { exts: [".tsx"] })).filter(
  (f) => !EXEMPT.has(relative(join(SRC, ".."), f))
);

describe("primitive token usage", () => {
  it("scans a meaningful number of files", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("no .tsx file uses raw white/black utilities", () => {
    const offenders = files
      .filter((f) => RAW_WHITE_BLACK.test(readFileSync(f, "utf8")))
      .map((f) => relative(SRC, f));
    expect(offenders).toEqual([]);
  });

  it("no .tsx file uses hardcoded numeric hsl() literals", () => {
    const offenders = files
      .filter((f) => NUMERIC_HSL.test(readFileSync(f, "utf8")))
      .map((f) => relative(SRC, f));
    expect(offenders).toEqual([]);
  });
});
