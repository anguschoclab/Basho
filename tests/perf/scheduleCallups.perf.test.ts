/**
 * Performance benchmark for planDivisionCallups on a dense match card.
 *
 * The hachiban-zumo (8th-bout) filler scan once re-read every resolved match
 * for each lower-division candidate — ~430 rikishi × ~3,500 matches ≈ 1.5M
 * comparisons per call. `matchDayIndex` now builds the participant set and
 * per-rikishi bout counts in one O(matches) pass; this test pins the call
 * inside a budget the old shape could not meet.
 *
 * Run via: npm run test:perf
 */
import { describe, it, expect } from "vitest";
import { planDivisionCallups } from "@/engine/calendar/schedule";
import { mockRikishi, makeMockBasho, makeMockWorld } from "@tests/unit/engine/utils";
import type { Rikishi } from "@/engine/types/rikishi";
import type { WorldState } from "@/engine/types/world";
import type { MatchSchedule } from "@/engine/types/basho";

const LOWER_DIVISIONS = ["makushita", "sandanme", "jonidan", "jonokuchi"] as const;

function mkDivision(
  division: Rikishi["division"],
  id: string,
  rankNumber: number,
  side: "east" | "west" = "east"
): Rikishi {
  return mockRikishi(id, {
    division,
    rank: division as Rikishi["rank"],
    rankNumber,
    side,
  });
}

function buildWorld(rikishiList: Rikishi[]): WorldState {
  const world = makeMockWorld({ seed: "callups-perf" });
  for (const r of rikishiList) world.rikishi.set(r.id, r);
  return world;
}

/** A realistic late-basho card: every past pairing resolved. */
function denseMatchCard(roster: Rikishi[], daysElapsed: number): MatchSchedule[] {
  const matches: MatchSchedule[] = [];
  for (let day = 1; day <= daysElapsed; day++) {
    for (let i = 0; i + 1 < roster.length; i += 2) {
      matches.push({
        eastRikishiId: roster[i].id,
        westRikishiId: roster[i + 1].id,
        day,
        result: { winner: "east", kimarite: "yorikiri" },
      } as unknown as MatchSchedule);
    }
  }
  return matches;
}

describe("planDivisionCallups — dense-card performance", () => {
  it("day-8 hachiban-zumo scan stays O(matches) on a full lower-division card", () => {
    // ~600-rikishi league, ~430 of them in lower divisions.
    const roster: Rikishi[] = [];
    for (const div of LOWER_DIVISIONS) {
      for (let i = 1; i <= 107; i++) {
        roster.push(mkDivision(div, `${div}-${i}`, i, i % 2 ? "west" : "east"));
      }
    }
    const world = buildWorld(roster);
    // 7 elapsed days × ~214 pairings ≈ 3,500 resolved matches.
    const basho = makeMockBasho({ day: 8, matches: denseMatchCard(roster, 7) });
    expect(basho.matches.length).toBeGreaterThan(1400);

    const t0 = performance.now();
    const plan = planDivisionCallups({
      world,
      basho,
      day: 8,
      divisions: [...LOWER_DIVISIONS],
    });
    const elapsed = performance.now() - t0;

    expect(plan).toBeDefined();
    // The pre-index shape cost ~1.5M comparisons (seconds on CI). One pass
    // over ~3.5k matches plus one roster scan is single-digit ms; the budget
    // stays generous enough to ignore machine noise while still failing any
    // regression to per-candidate rescans.
    expect(elapsed).toBeLessThan(500);
  });
});
