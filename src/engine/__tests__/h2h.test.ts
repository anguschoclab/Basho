/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from "vitest";
import { updateH2H, generateH2HCommentary, getH2HReport } from "../h2h";
import { mockRikishi } from "./utils";
import type { MatchResultLog } from "../types/records";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLog(
  opponentId: string,
  win: boolean,
  opts: Partial<MatchResultLog> = {}
): MatchResultLog {
  return {
    opponentId,
    win,
    kimarite: "yorikiri",
    bashoId: "2025-01",
    day: 1,
    year: 2025,
    ...opts,
  };
}

// ---------------------------------------------------------------------------
// getH2HReport — win counting
// ---------------------------------------------------------------------------

describe("getH2HReport — win counting", () => {
  it("returns zeroed report when neither has faced the other", () => {
    const a = mockRikishi("a", { history: [] });
    const b = mockRikishi("b", { history: [] });

    const report = getH2HReport(a, b);

    expect(report.aId).toBe("a");
    expect(report.bId).toBe("b");
    expect(report.aWins).toBe(0);
    expect(report.bWins).toBe(0);
    expect(report.totalMeetings).toBe(0);
    expect(report.recentMeetings).toHaveLength(0);
  });

  it("counts wins for A correctly", () => {
    const a = mockRikishi("a", {
      history: [
        makeLog("b", true, { day: 1 }),
        makeLog("b", true, { day: 5 }),
        makeLog("b", false, { day: 9 }),
      ],
    });
    const b = mockRikishi("b", {
      history: [
        makeLog("a", false, { day: 1 }),
        makeLog("a", false, { day: 5 }),
        makeLog("a", true, { day: 9 }),
      ],
    });

    const report = getH2HReport(a, b);

    expect(report.aWins).toBe(2);
    expect(report.bWins).toBe(1);
    expect(report.totalMeetings).toBe(3);
  });

  it("counts wins for B when B dominates", () => {
    const a = mockRikishi("a", {
      history: [makeLog("b", false), makeLog("b", false)],
    });
    const b = mockRikishi("b", {
      history: [makeLog("a", true), makeLog("a", true)],
    });

    const report = getH2HReport(a, b);

    expect(report.aWins).toBe(0);
    expect(report.bWins).toBe(2);
  });

  it("ignores history entries against unrelated opponents", () => {
    const a = mockRikishi("a", {
      history: [
        makeLog("b", true),
        makeLog("c", false), // against someone else
        makeLog("d", true), // against someone else
      ],
    });
    const b = mockRikishi("b", {
      history: [makeLog("a", false)],
    });

    const report = getH2HReport(a, b);

    expect(report.aWins).toBe(1);
    expect(report.bWins).toBe(0);
    expect(report.totalMeetings).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getH2HReport — recent meetings ordering
// ---------------------------------------------------------------------------

describe("getH2HReport — recent meetings ordering", () => {
  it("returns recent meetings sorted newest-first by year then day", () => {
    const a = mockRikishi("a", {
      history: [
        makeLog("b", true, { year: 2024, day: 1, bashoId: "2024-01" }),
        makeLog("b", false, { year: 2025, day: 15, bashoId: "2025-01" }),
        makeLog("b", true, { year: 2024, day: 9, bashoId: "2024-03" }),
      ],
    });
    const b = mockRikishi("b", { history: [] });

    const { recentMeetings } = getH2HReport(a, b);

    expect(recentMeetings[0].year).toBe(2025);
    expect(recentMeetings[0].day).toBe(15);
    expect(recentMeetings[1].year).toBe(2024);
    expect(recentMeetings[1].day).toBe(9);
    expect(recentMeetings[2].year).toBe(2024);
    expect(recentMeetings[2].day).toBe(1);
  });

  it("caps recent meetings at 5 entries", () => {
    const history: MatchResultLog[] = Array.from({ length: 10 }, (_, i) =>
      makeLog("b", i % 2 === 0, { year: 2020 + i, day: 1, bashoId: `${2020 + i}-01` })
    );
    const a = mockRikishi("a", { history });
    const b = mockRikishi("b", { history: [] });

    const { recentMeetings } = getH2HReport(a, b);

    expect(recentMeetings).toHaveLength(5);
  });

  it("sets winnerId correctly for each meeting", () => {
    const a = mockRikishi("a", {
      history: [
        makeLog("b", true, { year: 2025, day: 3 }),
        makeLog("b", false, { year: 2025, day: 1 }),
      ],
    });
    const b = mockRikishi("b", { history: [] });

    const { recentMeetings } = getH2HReport(a, b);

    expect(recentMeetings[0].winnerId).toBe("a"); // a won on day 3 (newer)
    expect(recentMeetings[1].winnerId).toBe("b"); // b won on day 1
  });

  it("records kimarite from MatchResultLog", () => {
    const a = mockRikishi("a", {
      history: [makeLog("b", true, { kimarite: "uwatenage" })],
    });
    const b = mockRikishi("b", { history: [] });

    const { recentMeetings } = getH2HReport(a, b);

    expect(recentMeetings[0].kimarite).toBe("uwatenage");
  });
});

// ---------------------------------------------------------------------------
// updateH2H — record mutation
// ---------------------------------------------------------------------------

describe("updateH2H", () => {
  it("increments winner.h2h[loser.id].wins and sets lastMatch", () => {
    const winner = mockRikishi("w");
    const loser = mockRikishi("l");
    const result = { boutId: "b-1", kimarite: "yorikiri" } as any;

    const impact = updateH2H(winner, loser, result, "basho-2025-01", 2025, 7);
    if (impact.entities?.rikishiUpdates) {
      const updateW = impact.entities.rikishiUpdates.get("w");
      const updateL = impact.entities.rikishiUpdates.get("l");
      if (updateW?.h2h) winner.h2h = { ...winner.h2h, ...updateW.h2h };
      if (updateL?.h2h) loser.h2h = { ...loser.h2h, ...updateL.h2h };
    }

    expect(winner.h2h!["l"].wins).toBe(1);
    expect(winner.h2h!["l"].losses).toBe(0);
    expect(winner.h2h!["l"].lastMatch?.winnerId).toBe("w");
    expect(winner.h2h!["l"].lastMatch?.kimarite).toBe("yorikiri");
  });

  it("increments winner.h2h[loser.id].wins", () => {
    const winner = mockRikishi("w");
    const loser = mockRikishi("l");
    const result = { boutId: "b-1", kimarite: "oshidashi" } as any;

    const impact = updateH2H(winner, loser, result, "basho-2025-01", 2025, 8);
    if (impact.entities?.rikishiUpdates) {
      const updateW = impact.entities.rikishiUpdates.get("w");
      const updateL = impact.entities.rikishiUpdates.get("l");
      if (updateW?.h2h) winner.h2h = { ...winner.h2h, ...updateW.h2h };
      if (updateL?.h2h) loser.h2h = { ...loser.h2h, ...updateL.h2h };
    }

    expect(winner.h2h!["l"].wins).toBe(1);
    expect(winner.h2h!["l"].losses).toBe(0);
  });

  it("increments loser.h2h[winner.id].losses", () => {
    const winner = mockRikishi("w");
    const loser = mockRikishi("l");
    const result = { boutId: "b-1", kimarite: "yorikiri" } as any;

    const impact = updateH2H(winner, loser, result, "basho-2025-01", 2025, 8);
    if (impact.entities?.rikishiUpdates) {
      const updateW = impact.entities.rikishiUpdates.get("w");
      const updateL = impact.entities.rikishiUpdates.get("l");
      if (updateW?.h2h) winner.h2h = { ...winner.h2h, ...updateW.h2h };
      if (updateL?.h2h) loser.h2h = { ...loser.h2h, ...updateL.h2h };
    }

    expect(loser.h2h!["w"].losses).toBe(1);
    expect(loser.h2h!["w"].wins).toBe(0);
  });

  it("accumulates on repeated calls", () => {
    const a = mockRikishi("a");
    const b = mockRikishi("b");
    const r = { boutId: "b-1", kimarite: "yorikiri" } as any;

    const impact1 = updateH2H(a, b, r, "2025-01", 2025, 1);
    if (impact1.entities?.rikishiUpdates) {
      const updateA = impact1.entities.rikishiUpdates.get("a");
      const updateB = impact1.entities.rikishiUpdates.get("b");
      if (updateA?.h2h) a.h2h = { ...a.h2h, ...updateA.h2h };
      if (updateB?.h2h) b.h2h = { ...b.h2h, ...updateB.h2h };
    }

    const impact2 = updateH2H(b, a, r, "2025-03", 2025, 5);
    if (impact2.entities?.rikishiUpdates) {
      const updateA = impact2.entities.rikishiUpdates.get("a");
      const updateB = impact2.entities.rikishiUpdates.get("b");
      if (updateA?.h2h) a.h2h = { ...a.h2h, ...updateA.h2h };
      if (updateB?.h2h) b.h2h = { ...b.h2h, ...updateB.h2h };
    }

    const impact3 = updateH2H(a, b, r, "2025-05", 2025, 3);
    if (impact3.entities?.rikishiUpdates) {
      const updateA = impact3.entities.rikishiUpdates.get("a");
      const updateB = impact3.entities.rikishiUpdates.get("b");
      if (updateA?.h2h) a.h2h = { ...a.h2h, ...updateA.h2h };
      if (updateB?.h2h) b.h2h = { ...b.h2h, ...updateB.h2h };
    }

    expect(a.h2h!["b"].wins).toBe(2);
    expect(a.h2h!["b"].losses).toBe(1);
    expect(b.h2h!["a"].wins).toBe(1);
    expect(b.h2h!["a"].losses).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// generateH2HCommentary — smoke tests
// ---------------------------------------------------------------------------

describe("generateH2HCommentary", () => {
  it("returns a non-empty string for first meeting", () => {
    const a = mockRikishi("a", { h2h: {} });
    const b = mockRikishi("b", { h2h: {} });

    const text = generateH2HCommentary(a, b);

    expect(typeof text).toBe("string");
    expect(text.length).toBeGreaterThan(0);
  });

  it("returns a non-empty string for established rivalry", () => {
    const a = mockRikishi("a", {
      h2h: {
        b: {
          wins: 8,
          losses: 3,
          streak: 3,
          lastMatch: {
            winnerId: "a",
            kimarite: "yorikiri",
            bashoId: "2025-01",
            day: 14,
            year: 2025,
          },
        },
      },
    });
    const b = mockRikishi("b");

    const text = generateH2HCommentary(a, b);

    expect(typeof text).toBe("string");
    expect(text.length).toBeGreaterThan(0);
  });

  it("is deterministic for identical inputs", () => {
    const a = mockRikishi("a", {
      h2h: {
        b: { wins: 5, losses: 5, streak: 0, lastMatch: null },
      },
    });
    const b = mockRikishi("b");

    expect(generateH2HCommentary(a, b)).toBe(generateH2HCommentary(a, b));
  });
});
