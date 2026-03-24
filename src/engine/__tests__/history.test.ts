import { describe, it, expect, beforeEach } from "vitest";
import { generateCareerSnapshot, recordMilestones, runHistoryUpdates } from "../history";
import { WorldState } from "../types/world";

describe("History Engine", () => {
  let mockWorld: WorldState;

  beforeEach(() => {
    mockWorld = {
      year: 2025,
      calendar: { year: 2025, month: 1 },
      currentBashoName: "hatsu",
      rikishi: new Map(),
      history: [
        { id: "basho-1", yusho: "r1", junYusho: ["r2"], shukunsho: "r3" }
      ]
    } as any;
  });

  it("should generate a correct CareerSnapshot", () => {
    const r1 = { 
      id: "r1", 
      rank: "maegashira", 
      division: "makuuchi", 
      rankNumber: 1, 
      side: "east",
      currentBashoWins: 13,
      currentBashoLosses: 2,
      weight: 155,
      momentum: 3
    } as any;

    const snap = generateCareerSnapshot(mockWorld, r1);

    expect(snap.bashoId).toBe("basho-1");
    expect(snap.isYusho).toBe(true);
    expect(snap.wins).toBe(13);
    expect(snap.rank).toBe("maegashira");
  });

  it("should detect yusho milestone", () => {
    const r1 = { id: "r1", shikona: "Rikishi A", milestones: [] } as any;
    recordMilestones(mockWorld, r1);

    expect(r1.milestones).toHaveLength(1);
    expect(r1.milestones[0].type).toBe("yusho");
  });

  it("should record milestones for career wins", () => {
    const r1 = { id: "other-rikishi", careerWins: 100, milestones: [] } as any;
    recordMilestones(mockWorld, r1);

    expect(r1.milestones).toHaveLength(1);
    expect(r1.milestones[0].title).toBe("100 Career Wins");
  });

  it("should update history for all rikishi", () => {
    mockWorld.rikishi.set("r1", { id: "r1", careerHistory: [] } as any);
    mockWorld.rikishi.set("r2", { id: "r2", careerHistory: [] } as any);

    runHistoryUpdates(mockWorld);

    expect(mockWorld.rikishi.get("r1")?.careerHistory).toHaveLength(1);
    expect(mockWorld.rikishi.get("r2")?.careerHistory).toHaveLength(1);
  });
});
