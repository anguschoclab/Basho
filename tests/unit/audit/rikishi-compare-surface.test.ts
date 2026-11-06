/**
 * T2.2 — rikishi compare surface: page exists, route registered,
 * renders h2h from real rikishi.h2h records (not fabricated).
 */
import { describe, it, expect } from "vitest";
import { readSrcFile } from "@tests/helpers/fsScan";

describe("RikishiComparePage surface (T2.2)", () => {
  it("route /rikishi/compare is registered before the param route", () => {
    const routes = readSrcFile("app/routes.tsx");
    expect(routes).toContain('"/rikishi/compare"');
    expect(routes.indexOf("rikishiCompareRoute")).toBeLessThan(
      routes.lastIndexOf("rikishiIdRoute")
    );
  });

  it("page reads real h2h records and rikishi stats", () => {
    const page = readSrcFile("pages/RikishiComparePage.tsx");
    expect(page).toContain(".h2h?.[");
    expect(page).toContain("a.stats[key]");
    expect(page).toContain("careerRecord");
  });
});
