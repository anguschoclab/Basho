import { describe, it, expect } from "vitest";
import { formatRadarData } from "@/presenters/uiFormatters";
import { mockRikishi } from "../engine/utils";

describe("formatRadarData", () => {
  it("maps zero stats to tier 1, not tier 3", () => {
    const r = mockRikishi("zero-stats", {
      power: 0,
      speed: 0,
      technique: 0,
      momentum: 0,
      condition: 0,
    });

    const radar = formatRadarData(r);

    for (const entry of radar) {
      expect(entry.A).toBe(1);
    }
  });

  it("maps mid-range stats (~50) to tier 3", () => {
    const r = mockRikishi("mid-stats", {
      power: 50,
      speed: 50,
      technique: 50,
      momentum: 50,
      condition: 50,
    });

    const radar = formatRadarData(r);

    for (const entry of radar) {
      expect(entry.A).toBe(3);
    }
  });
});
