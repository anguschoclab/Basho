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
  it("returns empty array if no history", () => {
    const mockWorld: Partial<WorldState> = { history: [] } as any;
    expect(formatMetaTrends(mockWorld as WorldState)).toEqual([]);
  });

  it("includes the real era tone from world.meta on each data point", () => {
    const mockWorld: Partial<WorldState> = {
      meta: { tone: "explosive", drift: {} },
      globalKimariteStats: {},
      history: [
        { bashoName: "hatsu", year: 2024 } as any,
        { bashoName: "haru", year: 2024 } as any,
      ],
    } as any;

    const result = formatMetaTrends(mockWorld as WorldState);
    expect(result).toHaveLength(2);
    expect(result[0].tone).toBe("explosive");
    expect(result[1].tone).toBe("explosive");
  });

  it("reflects push-family dominance when tone is explosive", () => {
    const mockWorld: Partial<WorldState> = {
      meta: { tone: "explosive", drift: {} },
      globalKimariteStats: { oshidashi: 60, yorikiri: 40 },
      history: [{ bashoName: "hatsu", year: 2024 } as any],
    } as any;

    const result = formatMetaTrends(mockWorld as WorldState);
    expect(result).toHaveLength(1);
    // oshi (push) should dominate when stats have more push moves
    expect(result[0].oshi).toBeGreaterThan(result[0].yotsu);
    expect(result[0].oshi).toBeGreaterThan(result[0].hybrid);
  });

  it("reflects belt-family dominance when tone is classic", () => {
    const mockWorld: Partial<WorldState> = {
      meta: { tone: "classic", drift: {} },
      globalKimariteStats: { yorikiri: 50, uwatenage: 30, oshidashi: 20 },
      history: [{ bashoName: "hatsu", year: 2024 } as any],
    } as any;

    const result = formatMetaTrends(mockWorld as WorldState);
    expect(result).toHaveLength(1);
    // yotsu (belt) should dominate when tone is classic
    expect(result[0].yotsu).toBeGreaterThan(result[0].oshi);
  });

  it("computes family percentages from globalKimariteStats, not fabricated constants", () => {
    const mockWorld: Partial<WorldState> = {
      meta: { tone: "explosive", drift: {} },
      globalKimariteStats: { yorikiri: 100, oshidashi: 100, uwatenage: 0 },
      history: [{ bashoName: "hatsu", year: 2024 } as any],
    } as any;

    const result = formatMetaTrends(mockWorld as WorldState);
    expect(result).toHaveLength(1);
    // 100 push + 100 belt = 200 total → oshi=50, yotsu=50
    // NOT the fabricated 50/25/25
    expect(result[0].oshi).toBe(50);
    expect(result[0].yotsu).toBe(50);
    expect(result[0].hybrid).toBe(0);
  });

  it("exposes top drifted kimarite from world.meta.drift", () => {
    const mockWorld: Partial<WorldState> = {
      meta: {
        tone: "explosive",
        drift: { yorikiri: 1.5, oshidashi: 1.3, uwatenage: 0.8, tsukidashi: 1.1 },
      },
      globalKimariteStats: {},
      history: [{ bashoName: "hatsu", year: 2024 } as any],
    } as any;

    const result = formatMetaTrends(mockWorld as WorldState);
    expect(result).toHaveLength(1);
    expect(result[0].topDrift).toBeDefined();
    expect(result[0].topDrift.length).toBeGreaterThan(0);
    // Highest drift value should be first
    expect(result[0].topDrift[0].id).toBe("yorikiri");
    expect(result[0].topDrift[0].value).toBe(1.5);
  });

  it("formats basho label as first-letter + 2-digit year", () => {
    const mockWorld: Partial<WorldState> = {
      meta: { tone: "classic", drift: {} },
      globalKimariteStats: {},
      history: [{ bashoName: "hatsu", year: 2024 } as any],
    } as any;

    const result = formatMetaTrends(mockWorld as WorldState);
    expect(result[0].basho).toBe("H24");
  });

  it("returns at most 6 data points", () => {
    const history = [];
    for (let i = 0; i < 10; i++) {
      history.push({ bashoName: "hatsu", year: 2020 + i } as any);
    }
    const mockWorld: Partial<WorldState> = {
      meta: { tone: "classic", drift: {} },
      globalKimariteStats: {},
      history,
    } as any;

    const result = formatMetaTrends(mockWorld as WorldState);
    expect(result).toHaveLength(6);
  });
});
