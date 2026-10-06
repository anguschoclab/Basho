import { describe, it, expect } from "vitest";
import { getH2HReport } from "@/engine/h2h";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { H2H_MAX_RECENT_MEETINGS } from "@/constants/engine/generation";

describe("getH2HReport", () => {
  it("builds a report with total wins for both rikishi and sorted recent meetings", () => {
    const rA = MockFactory.createRikishi({
      id: "a1",
      history: [
        { year: 2024, day: 15, bashoId: "basho-1", opponentId: "b1", win: true, kimarite: "yorikiri", boutId: "x" },
        { year: 2024, day: 14, bashoId: "basho-2", opponentId: "c1", win: false, kimarite: "oshidashi", boutId: "y" },
        { year: 2025, day: 1, bashoId: "basho-3", opponentId: "b1", win: false, kimarite: "hatakikomi", boutId: "z" }
      ]
    });

    const rB = MockFactory.createRikishi({
      id: "b1",
      history: [
        { year: 2024, day: 15, bashoId: "basho-1", opponentId: "a1", win: false, kimarite: "yorikiri", boutId: "x" },
        { year: 2025, day: 1, bashoId: "basho-3", opponentId: "a1", win: true, kimarite: "hatakikomi", boutId: "z" }
      ]
    });

    const report = getH2HReport(rA, rB);

    expect(report.aId).toBe("a1");
    expect(report.bId).toBe("b1");
    expect(report.aWins).toBe(1);
    expect(report.bWins).toBe(1);
    expect(report.totalMeetings).toBe(2);

    expect(report.recentMeetings).toHaveLength(2);
    // Newest first
    expect(report.recentMeetings[0]).toEqual({
      bashoId: "basho-3",
      year: 2025,
      day: 1,
      winnerId: "b1",
      kimarite: "hatakikomi"
    });
    expect(report.recentMeetings[1]).toEqual({
      bashoId: "basho-1",
      year: 2024,
      day: 15,
      winnerId: "a1",
      kimarite: "yorikiri"
    });
  });

  it("limits recent meetings to H2H_MAX_RECENT_MEETINGS", () => {
    const historyA = [];
    const historyB = [];

    for (let i = 0; i < 10; i++) {
      historyA.push({
        year: 2020 + i,
        day: 1,
        bashoId: `basho-${i}`,
        opponentId: "b1",
        win: i % 2 === 0,
        kimarite: "yorikiri",
        boutId: `bout-${i}`
      });
      historyB.push({
        year: 2020 + i,
        day: 1,
        bashoId: `basho-${i}`,
        opponentId: "a1",
        win: i % 2 !== 0,
        kimarite: "yorikiri",
        boutId: `bout-${i}`
      });
    }

    const rA = MockFactory.createRikishi({ id: "a1", history: historyA });
    const rB = MockFactory.createRikishi({ id: "b1", history: historyB });

    const report = getH2HReport(rA, rB);

    expect(report.totalMeetings).toBe(10);
    expect(report.recentMeetings).toHaveLength(H2H_MAX_RECENT_MEETINGS);
    expect(report.recentMeetings[0].year).toBe(2029); // newest first
  });

  it("handles rikishi with no history gracefully", () => {
    const rA = MockFactory.createRikishi({ id: "a1", history: undefined });
    const rB = MockFactory.createRikishi({ id: "b1", history: [] });

    const report = getH2HReport(rA, rB);

    expect(report.aWins).toBe(0);
    expect(report.bWins).toBe(0);
    expect(report.totalMeetings).toBe(0);
    expect(report.recentMeetings).toHaveLength(0);
  });
});
