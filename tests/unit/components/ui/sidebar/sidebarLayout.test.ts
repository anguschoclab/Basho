/**
 * sidebarLayout.test.ts
 * =====================
 * Regression guard: the sidebar spacer and fixed container must use the
 * Tailwind v4 `w-(--var)` syntax. The v3 `w-[--var]` bracket form compiles
 * to nothing, which collapsed the spacer to 0px and made the sidebar
 * overlay page content on every route.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { SRC } from "@tests/helpers/fsScan";

const CORE = join(SRC, "components/ui/sidebar/core.tsx");
const MENU = join(SRC, "components/ui/sidebar/menu.tsx");

const V3_BRACKET_VAR = /\b(?:w|max-w|min-w|h|max-h|min-h)-\[--[a-z-]+\]/;

describe("sidebar layout width utilities", () => {
  it("sidebar core uses v4 var syntax, not v3 bracket vars", () => {
    const src = readFileSync(CORE, "utf8");
    expect(V3_BRACKET_VAR.test(src)).toBe(false);
    expect(src).toContain("w-(--sidebar-width)");
    expect(src).toContain("w-(--sidebar-width-icon)");
  });

  it("sidebar menu uses v4 var syntax for skeleton width", () => {
    const src = readFileSync(MENU, "utf8");
    expect(V3_BRACKET_VAR.test(src)).toBe(false);
  });

  it("no deprecated theme(spacing.*) calls inside class strings", () => {
    const src = readFileSync(CORE, "utf8") + readFileSync(MENU, "utf8");
    expect(src).not.toMatch(/theme\(spacing/);
  });
});
