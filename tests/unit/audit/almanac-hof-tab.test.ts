/**
 * T0.5 — the Almanac Hall-of-Fame tab must route to the real
 * `/records/hall-of-fame` page instead of a placeholder card.
 */
import { describe, it, expect } from "vitest";
import { join } from "path";
import { readSrcFile } from "@tests/helpers/fsScan";

const ROOT = join(__dirname, "../../../");

describe("AlmanacTabs — Hall of Fame tab", () => {
  it("links to the real /records/hall-of-fame route", () => {
    const tabs = readSrcFile("components/almanac/AlmanacTabs.tsx");
    expect(tabs).toContain('"/records/hall-of-fame"');
  });

  it("renders no placeholder 'Expansion in Progress' badge", () => {
    const tabs = readSrcFile("components/almanac/AlmanacTabs.tsx");
    expect(tabs).not.toContain("Expansion in Progress");
    expect(tabs).not.toContain("Reserved for the greatest legends");
  });
});
