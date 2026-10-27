import { describe, it, expect } from "vitest";
import { buildLowerDivisionSwiss } from "@/engine/matchmaking/index";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { BashoState } from "@/engine/types/basho";
import type { Rikishi } from "@/engine/types/rikishi";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setStandings(
  basho: BashoState,
  records: Record<string, { wins: number; losses: number }>
) {
  for (const [id, record] of Object.entries(records)) {
    basho.standings.set(id, record);
  }
}

function mk(id: string, overrides: Partial<Rikishi> = {}): Rikishi {
  return MockFactory.createRikishi({
    id,
    division: "makushita",
    rank: "makushita",
    ...overrides,
  });
}

const OPTS = { seed: "test-lower-swiss", division: "makushita" as const };

// ---------------------------------------------------------------------------
// Pool filtering
// ---------------------------------------------------------------------------

describe("buildLowerDivisionSwiss — pool filtering", () => {
  it("excludes kyujo, injured, retired, and other-division rikishi", () => {
    const active1 = mk("mk-1", { rankNumber: 1 });
    const active2 = mk("mk-2", { rankNumber: 2 });
    const kyujo = mk("mk-3", { isKyujo: true });
    const injured = mk("mk-4", { injured: true });
    const retired = mk("mk-5", { isRetired: true });
    const makuuchi = MockFactory.createRikishi({ id: "mk-6", division: "makuuchi" });

    const basho = MockFactory.createBasho({ day: 1 });
    const pairings = buildLowerDivisionSwiss(
      basho,
      [active1, active2, kyujo, injured, retired, makuuchi],
      OPTS
    );

    expect(pairings).toHaveLength(1);
    expect([pairings[0].eastId, pairings[0].westId].sort()).toEqual(["mk-1", "mk-2"]);
  });
});

// ---------------------------------------------------------------------------
// Phase dispatch
// ---------------------------------------------------------------------------

describe("buildLowerDivisionSwiss — phase dispatch", () => {
  it("tags rank-proximity pairings on day 1", () => {
    const r1 = mk("mk-1", { rankNumber: 1 });
    const r2 = mk("mk-2", { rankNumber: 2 });

    const basho = MockFactory.createBasho({ day: 1 });
    const pairings = buildLowerDivisionSwiss(basho, [r1, r2], OPTS);

    expect(pairings).toHaveLength(1);
    expect(pairings[0].reasons).toContain("rank_proximity");
  });

  it("pairs same-record rikishi within win buckets on day 4", () => {
    const a1 = mk("a1", { rankNumber: 1 });
    const a2 = mk("a2", { rankNumber: 2 });
    const b1 = mk("b1", { rankNumber: 3 });
    const b2 = mk("b2", { rankNumber: 4 });

    const basho = MockFactory.createBasho({ day: 4 });
    setStandings(basho, {
      a1: { wins: 2, losses: 1 },
      a2: { wins: 2, losses: 1 },
      b1: { wins: 1, losses: 2 },
      b2: { wins: 1, losses: 2 },
    });

    const pairings = buildLowerDivisionSwiss(basho, [a1, a2, b1, b2], OPTS);
    const keys = pairings.map((p) => [p.eastId, p.westId].sort().join("-"));

    expect(keys).toContain("a1-a2");
    expect(keys).toContain("b1-b2");
  });
});

// ---------------------------------------------------------------------------
// Drama labels (applyLowerDivisionDramaLabels)
// ---------------------------------------------------------------------------

describe("buildLowerDivisionSwiss — drama labels", () => {
  it("labels a day-7 3-3 bout as kachi_koshi_priority + drama_make_or_break", () => {
    const r1 = mk("mk-1", { rankNumber: 1 });
    const r2 = mk("mk-2", { rankNumber: 2 });

    const basho = MockFactory.createBasho({ day: 7 });
    setStandings(basho, {
      "mk-1": { wins: 3, losses: 3 },
      "mk-2": { wins: 3, losses: 3 },
    });

    const pairings = buildLowerDivisionSwiss(basho, [r1, r2], OPTS);

    expect(pairings).toHaveLength(1);
    expect(pairings[0].reasons).toContain("kachi_koshi_priority");
    expect(pairings[0].reasons).toContain("drama_make_or_break");
  });

  it("labels a day-5 contender matchup as drama_yusho_decider", () => {
    const r1 = mk("mk-1", { rankNumber: 1 });
    const r2 = mk("mk-2", { rankNumber: 2 });

    const basho = MockFactory.createBasho({ day: 5 });
    setStandings(basho, {
      "mk-1": { wins: 4, losses: 0 },
      "mk-2": { wins: 4, losses: 0 },
    });

    const pairings = buildLowerDivisionSwiss(basho, [r1, r2], OPTS);

    expect(pairings).toHaveLength(1);
    expect(pairings[0].reasons).toContain("drama_yusho_decider");
  });

  it("appends no drama_ label when no drama context applies", () => {
    const r1 = mk("mk-1", { rankNumber: 10 });
    const r2 = mk("mk-2", { rankNumber: 11 });

    const basho = MockFactory.createBasho({ day: 1 });
    const pairings = buildLowerDivisionSwiss(basho, [r1, r2], OPTS);

    expect(pairings).toHaveLength(1);
    expect(pairings[0].reasons.some((r) => r.startsWith("drama_"))).toBe(false);
  });
});
