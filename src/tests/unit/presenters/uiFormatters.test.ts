import { describe, it, expect } from "vitest";
import { formatRadarData, formatMetaTrends } from "@/presenters/uiFormatters";
import { mockRikishi } from "../engine/utils";
import type { Rikishi } from "@/engine/types/rikishi";
import type { WorldState } from "@/engine/types/world";

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

  it("maps high stats (90+) to tier 5 with C5 labels", () => {
    const mockRikishiHigh: Partial<Rikishi> = {
      id: "r1",
      stats: {
        power: 90,
        speed: 70,
        technique: 50,
        balance: 60,
        stamina: 80,
        aggression: 85,
        experience: 50,
      } as any,
      momentum: 50,
      condition: 50,
    };

    const result = formatRadarData(mockRikishiHigh as Rikishi);
    expect(result).toHaveLength(5);
    expect(result[0].subject).toBe("Power");
    expect(result[0].A).toBe(5);
  });
});

describe("formatMetaTrends", () => {
  it("formats world history into stacked components totaling 100%", () => {
    const mockWorld: Partial<WorldState> = {
      history: [
        { bashoName: "hatsu", year: 2024, metaBias: "oshi" } as any,
        { bashoName: "haru", year: 2024, metaBias: "yotsu" } as any,
      ],
    } as any;

    const result = formatMetaTrends(mockWorld as WorldState);
    expect(result).toHaveLength(2);
    expect(result[0].basho).toBe("H24");
    expect(result[0].oshi + result[0].yotsu + result[0].hybrid).toBe(100);

    expect(result[0].oshi).toBeGreaterThan(result[0].yotsu);
  });

  it("returns empty array if no history", () => {
    const mockWorld: Partial<WorldState> = { history: [] } as any;
    expect(formatMetaTrends(mockWorld as WorldState)).toEqual([]);
  });
});
