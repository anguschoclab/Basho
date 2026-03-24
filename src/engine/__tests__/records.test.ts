import { describe, it, expect, beforeEach } from "vitest";
import { onBashoEnded, onRikishiRetired, ensureRecordsState } from "../records";
import { WorldState } from "../types/world";

describe("Records Engine", () => {
  let mockWorld: WorldState;

  beforeEach(() => {
    mockWorld = {
      calendar: { year: 2025, month: 1 },
      rikishi: new Map(),
      history: [],
      records: {
        allTime: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
        active: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] }
      }
    } as any;
  });

  it("should update career wins leaderboard", () => {
    const r1 = { id: "r1", shikona: "Rikishi A", careerWins: 100, isRetired: false } as any;
    const r2 = { id: "r2", shikona: "Rikishi B", careerWins: 150, isRetired: false } as any;
    
    mockWorld.rikishi.set("r1", r1);
    mockWorld.rikishi.set("r2", r2);

    onBashoEnded(mockWorld);

    expect(mockWorld.records.allTime.careerWins[0].rikishiId).toBe("r2");
    expect(mockWorld.records.allTime.careerWins[0].value).toBe(150);
    expect(mockWorld.records.active.careerWins[0].rikishiId).toBe("r2");
  });

  it("should handle rikishi retirement", () => {
    const r1 = { id: "r1", shikona: "Rikishi A", careerWins: 200, isRetired: false } as any;
    mockWorld.rikishi.set("r1", r1);

    onBashoEnded(mockWorld);
    expect(mockWorld.records.active.careerWins).toHaveLength(1);

    onRikishiRetired(mockWorld, "r1");
    expect(mockWorld.records.active.careerWins).toHaveLength(0);
    expect(mockWorld.records.allTime.careerWins).toHaveLength(1);
    expect(mockWorld.records.allTime.careerWins[0].rikishiId).toBe("r1");
  });

  it("should track makuuchi wins separately", () => {
    const r1 = { id: "r1", shikona: "Rikishi A", makuuchiWins: 50, division: "makuuchi" } as any;
    mockWorld.rikishi.set("r1", r1);

    onBashoEnded(mockWorld);

    expect(mockWorld.records.allTime.makuuchiWins[0].value).toBe(50);
  });

  it("should only keep Top 10", () => {
    for (let i = 1; i <= 15; i++) {
      mockWorld.rikishi.set(`r${i}`, { id: `r${i}`, shikona: `Rikishi ${i}`, careerWins: i * 10 } as any);
    }

    onBashoEnded(mockWorld);

    expect(mockWorld.records.allTime.careerWins).toHaveLength(10);
    expect(mockWorld.records.allTime.careerWins[0].value).toBe(150);
    expect(mockWorld.records.allTime.careerWins[9].value).toBe(60);
  });
});
