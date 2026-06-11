import { describe, it, expect, beforeEach } from "vitest";
import { updateH2H, generateH2HCommentary, getH2HReport } from "../h2h";
import { MockFactory } from "../../test/utils/MockFactory";
import type { MatchResultLog } from "../types/records";
import type { BoutResult } from "../types/basho";
import type { H2HRecord } from "../types/records";
import { applyImpact } from "../core/ImpactResolver";
import { makeMockWorld } from "./utils";
import { resetImpactTimestampCounter } from "../core/StateImpact";

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

describe("h2h.test.ts - win counting", () => {
  it("returns zeroed report when neither has faced the other", () => {
    const a = MockFactory.createRikishi({ id: "a", history: [] });
    const b = MockFactory.createRikishi({ id: "b", history: [] });

    const report = getH2HReport(a, b);

    expect(report.aId).toBe("a");
    expect(report.bId).toBe("b");
    expect(report.aWins).toBe(0);
    expect(report.bWins).toBe(0);
    expect(report.totalMeetings).toBe(0);
    expect(report.recentMeetings).toHaveLength(0);
  });

  it("counts wins for A correctly", () => {
    const a = MockFactory.createRikishi({
      id: "a",
      history: [
        makeLog("b", true, { day: 1 }),
        makeLog("b", true, { day: 5 }),
        makeLog("b", false, { day: 9 }),
      ],
    });
    const b = MockFactory.createRikishi({
      id: "b",
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
    const a = MockFactory.createRikishi({
      id: "a",
      history: [makeLog("b", false), makeLog("b", false)],
    });
    const b = MockFactory.createRikishi({
      id: "b",
      history: [makeLog("a", true), makeLog("a", true)],
    });

    const report = getH2HReport(a, b);

    expect(report.aWins).toBe(0);
    expect(report.bWins).toBe(2);
  });

  it("ignores history entries against unrelated opponents", () => {
    const a = MockFactory.createRikishi({
      id: "a",
      history: [
        makeLog("b", true),
        makeLog("c", false), // against someone else
        makeLog("d", true), // against someone else
      ],
    });
    const b = MockFactory.createRikishi({
      id: "b",
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

describe("h2h.test.ts - recent meetings ordering", () => {
  it("returns recent meetings sorted newest-first by year then day", () => {
    const a = MockFactory.createRikishi({
      id: "a",
      history: [
        makeLog("b", true, { year: 2024, day: 1, bashoId: "2024-01" }),
        makeLog("b", false, { year: 2025, day: 15, bashoId: "2025-01" }),
        makeLog("b", true, { year: 2024, day: 9, bashoId: "2024-03" }),
      ],
    });
    const b = MockFactory.createRikishi({ id: "b", history: [] });

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
    const a = MockFactory.createRikishi({ id: "a", history });
    const b = MockFactory.createRikishi({ id: "b", history: [] });

    const { recentMeetings } = getH2HReport(a, b);

    expect(recentMeetings).toHaveLength(5);
  });

  it("sets winnerId correctly for each meeting", () => {
    const a = MockFactory.createRikishi({
      id: "a",
      history: [
        makeLog("b", true, { year: 2025, day: 3 }),
        makeLog("b", false, { year: 2025, day: 1 }),
      ],
    });
    const b = MockFactory.createRikishi({ id: "b", history: [] });

    const { recentMeetings } = getH2HReport(a, b);

    expect(recentMeetings[0].winnerId).toBe("a"); // a won on day 3 (newer)
    expect(recentMeetings[1].winnerId).toBe("b"); // b won on day 1
  });

  it("records kimarite from MatchResultLog", () => {
    const a = MockFactory.createRikishi({
      id: "a",
      history: [makeLog("b", true, { kimarite: "uwatenage" })],
    });
    const b = MockFactory.createRikishi({ id: "b", history: [] });

    const { recentMeetings } = getH2HReport(a, b);

    expect(recentMeetings[0].kimarite).toBe("uwatenage");
  });
});

// ---------------------------------------------------------------------------
// updateH2H — record mutation
// ---------------------------------------------------------------------------

describe("updateH2H", () => {
  it("increments winner.h2h[loser.id].wins and sets lastMatch", () => {
    const winner = MockFactory.createRikishi({ id: "w" });
    const loser = MockFactory.createRikishi({ id: "l" });
    const result = { boutId: "b-1", kimarite: "yorikiri" } as unknown as BoutResult;

    const impact = updateH2H(winner, loser, result, "basho-2025-01", 2025, 7);
    if (impact.entities?.rikishiUpdates) {
      const updateW = impact.entities.rikishiUpdates.get("w");
      const updateL = impact.entities.rikishiUpdates.get("l");
      if (updateW?.h2h) winner.h2h = { ...winner.h2h, ...updateW.h2h };
      if (updateL?.h2h) loser.h2h = { ...loser.h2h, ...updateL.h2h };
    }

    const rec = winner.h2h["l"];
    expect(rec).toBeDefined();
    expect(rec.wins).toBe(1);
    expect(rec.losses).toBe(0);
    expect(rec.lastMatch?.winnerId).toBe("w");
    expect(rec.lastMatch?.kimarite).toBe("yorikiri");
  });

  it("increments loser.h2h[winner.id].losses", () => {
    const winner = MockFactory.createRikishi({ id: "w" });
    const loser = MockFactory.createRikishi({ id: "l" });
    const result = { boutId: "b-1", kimarite: "yorikiri" } as unknown as BoutResult;

    const impact = updateH2H(winner, loser, result, "basho-2025-01", 2025, 8);
    if (impact.entities?.rikishiUpdates) {
      const updateW = impact.entities.rikishiUpdates.get("w");
      const updateL = impact.entities.rikishiUpdates.get("l");
      if (updateW?.h2h) winner.h2h = { ...winner.h2h, ...updateW.h2h };
      if (updateL?.h2h) loser.h2h = { ...loser.h2h, ...updateL.h2h };
    }

    const rec = loser.h2h["w"];
    expect(rec).toBeDefined();
    expect(rec.losses).toBe(1);
    expect(rec.wins).toBe(0);
  });

  it("accumulates on repeated calls", () => {
    const a = MockFactory.createRikishi({ id: "a" });
    const b = MockFactory.createRikishi({ id: "b" });
    const r = { boutId: "b-1", kimarite: "yorikiri" } as unknown as BoutResult;

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

    expect(a.h2h["b"].wins).toBe(2);
    expect(a.h2h["b"].losses).toBe(1);
    expect(b.h2h["a"].wins).toBe(1);
    expect(b.h2h["a"].losses).toBe(2);
  });

  beforeEach(() => {
    resetImpactTimestampCounter();
  });

  // Streak logic
  it("continues a positive winning streak for the winner", () => {
    const winner = MockFactory.createRikishi({
      id: "w",
      h2h: {
        l: { wins: 2, losses: 0, streak: 2, lastMatch: null },
      },
    });
    const loser = MockFactory.createRikishi({
      id: "l",
      h2h: {
        w: { wins: 0, losses: 2, streak: -2, lastMatch: null },
      },
    });
    const result = { boutId: "b-1", kimarite: "yorikiri" } as unknown as BoutResult;

    const impact = updateH2H(winner, loser, result, "basho-2025-01", 2025, 7);
    const updateW = impact.entities?.rikishiUpdates?.get("w");
    const updateL = impact.entities?.rikishiUpdates?.get("l");

    expect(updateW?.h2h?.["l"]?.wins).toBe(3);
    expect(updateW?.h2h?.["l"]?.streak).toBe(3);
    expect(updateL?.h2h?.["w"]?.losses).toBe(3);
    expect(updateL?.h2h?.["w"]?.streak).toBe(-3);
  });

  it("resets a negative streak to 1 when the winner wins", () => {
    const winner = MockFactory.createRikishi({
      id: "w",
      h2h: {
        l: { wins: 0, losses: 3, streak: -3, lastMatch: null },
      },
    });
    const loser = MockFactory.createRikishi({ id: "l" });
    const result = { boutId: "b-1", kimarite: "yorikiri" } as unknown as BoutResult;

    const impact = updateH2H(winner, loser, result, "basho-2025-01", 2025, 7);
    const updateW = impact.entities?.rikishiUpdates?.get("w");

    expect(updateW?.h2h?.["l"]?.wins).toBe(1);
    expect(updateW?.h2h?.["l"]?.streak).toBe(1);
  });

  it("resets a positive streak to -1 when the loser loses", () => {
    const winner = MockFactory.createRikishi({ id: "w" });
    const loser = MockFactory.createRikishi({
      id: "l",
      h2h: {
        w: { wins: 4, losses: 0, streak: 4, lastMatch: null },
      },
    });
    const result = { boutId: "b-1", kimarite: "yorikiri" } as unknown as BoutResult;

    const impact = updateH2H(winner, loser, result, "basho-2025-01", 2025, 7);
    const updateL = impact.entities?.rikishiUpdates?.get("l");

    expect(updateL?.h2h?.["w"]?.losses).toBe(1);
    expect(updateL?.h2h?.["w"]?.streak).toBe(-1);
  });

  it("starts streak at 1 / -1 from a zero baseline", () => {
    const winner = MockFactory.createRikishi({
      id: "w",
      h2h: {
        l: { wins: 0, losses: 0, streak: 0, lastMatch: null },
      },
    });
    const loser = MockFactory.createRikishi({
      id: "l",
      h2h: {
        w: { wins: 0, losses: 0, streak: 0, lastMatch: null },
      },
    });
    const result = { boutId: "b-1", kimarite: "yorikiri" } as unknown as BoutResult;

    const impact = updateH2H(winner, loser, result, "basho-2025-01", 2025, 7);
    const updateW = impact.entities?.rikishiUpdates?.get("w");
    const updateL = impact.entities?.rikishiUpdates?.get("l");

    expect(updateW?.h2h?.["l"]?.streak).toBe(1);
    expect(updateL?.h2h?.["w"]?.streak).toBe(-1);
  });

  // Record preservation & metadata
  it("preserves unrelated h2h entries for both rikishi", () => {
    const winner = MockFactory.createRikishi({
      id: "w",
      h2h: {
        other: { wins: 5, losses: 2, streak: 1, lastMatch: null },
      },
    });
    const loser = MockFactory.createRikishi({
      id: "l",
      h2h: {
        another: { wins: 3, losses: 1, streak: 2, lastMatch: null },
      },
    });
    const result = { boutId: "b-1", kimarite: "yorikiri" } as unknown as BoutResult;

    const impact = updateH2H(winner, loser, result, "basho-2025-01", 2025, 7);
    const updateW = impact.entities?.rikishiUpdates?.get("w");
    const updateL = impact.entities?.rikishiUpdates?.get("l");

    expect(updateW?.h2h?.["other"]).toBeDefined();
    expect(updateW?.h2h?.["other"]?.wins).toBe(5);
    expect(updateL?.h2h?.["another"]).toBeDefined();
    expect(updateL?.h2h?.["another"]?.wins).toBe(3);
  });

  it("populates lastMatch with bashoId, year, and day", () => {
    const winner = MockFactory.createRikishi({ id: "w" });
    const loser = MockFactory.createRikishi({ id: "l" });
    const result = { boutId: "b-1", kimarite: "oshidashi" } as unknown as BoutResult;

    const impact = updateH2H(winner, loser, result, "natsu-2025", 2025, 12);
    const updateW = impact.entities?.rikishiUpdates?.get("w");

    expect(updateW?.h2h?.["l"]?.lastMatch).toEqual({
      winnerId: "w",
      kimarite: "oshidashi",
      bashoId: "natsu-2025",
      year: 2025,
      day: 12,
    });
  });

  // Impact contract & resolver
  it("returns a StateImpact with exactly two rikishiUpdates entries and no side-effects", () => {
    const winner = MockFactory.createRikishi({ id: "w" });
    const loser = MockFactory.createRikishi({ id: "l" });
    const result = { boutId: "b-1", kimarite: "yorikiri" } as unknown as BoutResult;

    const impact = updateH2H(winner, loser, result, "basho-2025-01", 2025, 7);

    expect(impact.metadata?.source).toBe("updateH2H");
    expect(impact.entities?.rikishiUpdates?.size).toBe(2);
    expect(impact.events).toBeUndefined();
    expect(impact.collections).toBeUndefined();
    expect(impact.deletedEntities).toBeUndefined();
    expect(impact.arrayAppends).toBeUndefined();
  });

  it("correctly resolves via applyImpact", () => {
    const winner = MockFactory.createRikishi({ id: "w" });
    const loser = MockFactory.createRikishi({ id: "l" });
    const world = makeMockWorld({
      rikishi: new Map([
        ["w", winner],
        ["l", loser],
      ]),
    });
    const result = { boutId: "b-1", kimarite: "tsukiotoshi" } as unknown as BoutResult;

    const impact = updateH2H(winner, loser, result, "aki-2025", 2025, 9);
    const updatedWorld = applyImpact(world, impact);

    const resolvedWinner = updatedWorld.rikishi.get("w");
    const resolvedLoser = updatedWorld.rikishi.get("l");

    expect(resolvedWinner?.h2h?.["l"]?.wins).toBe(1);
    expect(resolvedWinner?.h2h?.["l"]?.streak).toBe(1);
    expect(resolvedWinner?.h2h?.["l"]?.lastMatch?.kimarite).toBe("tsukiotoshi");
    expect(resolvedLoser?.h2h?.["w"]?.losses).toBe(1);
    expect(resolvedLoser?.h2h?.["w"]?.streak).toBe(-1);
  });

  // Edge cases
  it("handles rikishi with undefined h2h maps", () => {
    const winner = MockFactory.createRikishi({ id: "w", h2h: undefined as unknown as Record<string, H2HRecord> });
    const loser = MockFactory.createRikishi({ id: "l", h2h: undefined as unknown as Record<string, H2HRecord> });
    const result = { boutId: "b-1", kimarite: "yorikiri" } as unknown as BoutResult;

    const impact = updateH2H(winner, loser, result, "basho-2025-01", 2025, 7);
    const updateW = impact.entities?.rikishiUpdates?.get("w");
    const updateL = impact.entities?.rikishiUpdates?.get("l");

    expect(updateW?.h2h?.["l"]?.wins).toBe(1);
    expect(updateL?.h2h?.["w"]?.losses).toBe(1);
  });

  it("handles an existing empty opponent record (all zeros)", () => {
    const winner = MockFactory.createRikishi({
      id: "w",
      h2h: {
        l: { wins: 0, losses: 0, streak: 0, lastMatch: null },
      },
    });
    const loser = MockFactory.createRikishi({
      id: "l",
      h2h: {
        w: { wins: 0, losses: 0, streak: 0, lastMatch: null },
      },
    });
    const result = { boutId: "b-1", kimarite: "yorikiri" } as unknown as BoutResult;

    const impact = updateH2H(winner, loser, result, "basho-2025-01", 2025, 7);
    const updateW = impact.entities?.rikishiUpdates?.get("w");
    const updateL = impact.entities?.rikishiUpdates?.get("l");

    expect(updateW?.h2h?.["l"]?.wins).toBe(1);
    expect(updateW?.h2h?.["l"]?.streak).toBe(1);
    expect(updateL?.h2h?.["w"]?.losses).toBe(1);
    expect(updateL?.h2h?.["w"]?.streak).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// generateH2HCommentary — smoke tests
// ---------------------------------------------------------------------------

describe("generateH2HCommentary", () => {
  it("returns a non-empty string for first meeting", () => {
    const a = MockFactory.createRikishi({ id: "a", h2h: {} });
    const b = MockFactory.createRikishi({ id: "b", h2h: {} });

    const text = generateH2HCommentary(a, b);

    expect(typeof text).toBe("string");
    expect(text.length).toBeGreaterThan(0);
  });

  it("returns a non-empty string for established rivalry", () => {
    const a = MockFactory.createRikishi({
      id: "a",
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
    const b = MockFactory.createRikishi({ id: "b" });

    const text = generateH2HCommentary(a, b);

    expect(typeof text).toBe("string");
    expect(text.length).toBeGreaterThan(0);
  });

  it("is deterministic for identical inputs", () => {
    const a = MockFactory.createRikishi({
      id: "a",
      h2h: {
        b: { wins: 5, losses: 5, streak: 0, lastMatch: null },
      },
    });
    const b = MockFactory.createRikishi({ id: "b" });

    expect(generateH2HCommentary(a, b)).toBe(generateH2HCommentary(a, b));
  });
});
