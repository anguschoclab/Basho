/**
 * bashoProjections.standings.test.ts
 *
 * Equivalence pins for projectBashoUIDigest standings:
 *  - top-10 slice ordered by wins desc / losses asc / rank tiebreak
 *  - projectRikishi must only run for the displayed entries (the perf fix
 *    this file guards: previously every makuuchi rikishi was projected
 *    before the top-10 slice)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { projectBashoUIDigest } from "@/presenters/projections/bashoProjections";
import { projectRikishi } from "@/presenters/rikishi/index";
import { makeMockWorld, mockRikishi, makeMockBasho } from "@tests/unit/engine/utils";
import type { Rikishi } from "@/engine/types/rikishi";

vi.mock("@/presenters/rikishi/index", () => ({
  projectRikishi: vi.fn((r: Rikishi) => ({
    id: r.id,
    shikona: r.shikona,
    heyaId: r.heyaId,
    rank: r.rank,
    side: r.side,
    rankNumber: r.rankNumber ?? 1,
  })),
}));

/** 12 makuuchi rikishi with distinct records (wins 0..11). */
function makeStandingsWorld() {
  const rikishi = new Map<string, Rikishi>();
  for (let i = 0; i < 12; i++) {
    const r = mockRikishi(`r${i}`, {
      heyaId: "h1",
      rankNumber: i + 1,
      currentBashoRecord: { wins: i, losses: 15 - i },
    });
    rikishi.set(`r${i}`, r);
  }
  return makeMockWorld({
    rikishi,
    currentBasho: makeMockBasho({ day: 1, matches: [] }),
  });
}

describe("projectBashoUIDigest — standings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a top-10 slice ordered by wins descending", () => {
    const digest = projectBashoUIDigest(makeStandingsWorld());
    expect(digest).not.toBeNull();
    expect(digest!.standings).toHaveLength(10);
    expect(digest!.standings.map((s) => s.wins)).toEqual([11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
    expect(digest!.standings[0].rikishi.id).toBe("r11");
    expect(digest!.standings[9].rikishi.id).toBe("r2");
  });

  it("breaks identical records by rank (higher rank first)", () => {
    const rikishi = new Map<string, Rikishi>([
      ["y1", mockRikishi("y1", { heyaId: "h1", rank: "yokozuna", currentBashoRecord: { wins: 8, losses: 7 } })],
      ["m1", mockRikishi("m1", { heyaId: "h1", rank: "maegashira", rankNumber: 1, currentBashoRecord: { wins: 8, losses: 7 } })],
    ]);
    const world = makeMockWorld({
      rikishi,
      currentBasho: makeMockBasho({ day: 1, matches: [] }),
    });
    const digest = projectBashoUIDigest(world);
    expect(digest!.standings.map((s) => s.rikishi.id)).toEqual(["y1", "m1"]);
  });

  it("projects rikishi only for the displayed top-10 entries", () => {
    projectBashoUIDigest(makeStandingsWorld());
    // 12 makuuchi exist but only 10 are displayed — the slice must happen
    // before projection, so projectRikishi runs at most 10 times.
    expect(vi.mocked(projectRikishi).mock.calls.length).toBeLessThanOrEqual(10);
  });
});
