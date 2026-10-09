/**
 * Golden-master characterization for flat-file exports that Phase-2 moves into
 * their sibling directories (lifecycle.ts → lifecycle/, shikona.ts → shikona/):
 *   checkRetirement, _generateRookie, generateShikona, generateRikishiName,
 *   generateOyakataName
 * Plus banzuke.ts non-barrel exports (compareBanzuke, computeVariableSanyakuCounts).
 *
 * Written BEFORE the moves; must pass unchanged after (import paths will be
 * updated to the new module locations in the same commit as the move).
 */
import { describe, it, expect } from "vitest";
import { checkRetirement, _generateRookie } from "@/engine/lifecycle";
import {
  generateShikona,
  generateRikishiName,
  generateOyakataName,
} from "@/engine/shikona";
import { compareBanzuke, computeVariableSanyakuCounts } from "@/engine/banzuke";
import { SeededRNG } from "@/engine/rng";
import { makeMockWorld, mockRikishi, makeMockHeya } from "./utils";
import type { Rikishi } from "@/engine/types/rikishi";
import type { BanzukeEntry, BashoPerformance } from "@/engine/types/banzuke";

describe("checkRetirement — golden master", () => {
  const cases: Array<[
    label: string,
    birthYear: number,
    overrides: Partial<Rikishi>,
  ]> = [
    ["young-healthy", 2005, {}],
    ["young-career-injury", 2005, { injured: true, injuryWeeksRemaining: 60, injuryStatus: { severity: "serious" } as never }],
    ["age-27", 1999, {}],
    ["age-30-decline", 1996, {}],
    ["age-35", 1991, {}],
    ["age-40", 1986, {}],
    ["yokozuna-33", 1993, { rank: "yokozuna" }],
    ["intai-announced", 1995, { intaiAnnouncementWeek: 1 } as Partial<Rikishi>],
  ];
  for (const [label, birthYear, ov] of cases) {
    it(`${label}`, () => {
      const r = mockRikishi(`r-${label}`, { birthYear, ...ov });
      expect(checkRetirement(r, 2026, "seed-A")).toMatchSnapshot();
      expect(checkRetirement(r, 2026, "seed-B")).toMatchSnapshot();
    });
  }
});

describe("_generateRookie — golden master", () => {
  it("across ranks/seeds/heyas", () => {
    const heya = makeMockHeya("heya-1");
    const world = makeMockWorld({ heyas: new Map([["heya-1", heya]]) });
    const out: unknown[] = [];
    for (const year of [2026, 2027]) {
      for (const rank of ["jonokuchi", "makushita"] as const) {
        for (const heyaId of [undefined, "heya-1"]) {
          const r = _generateRookie(world, year, rank, heyaId);
          out.push({
            year,
            rank,
            heyaId,
            id: r.id,
            shikona: r.shikona,
            archetype: r.combatProfile?.archetype,
            division: r.division,
            stats: r.stats,
            birthYear: r.birthYear,
          });
        }
      }
    }
    expect(out).toMatchSnapshot();
  });
});

describe("shikona.ts names — golden master", () => {
  it("generateShikona across configs", () => {
    const out = [
      generateShikona("s1"),
      generateShikona("s2", { heyaId: "heya-1" }),
      generateShikona("s3", { heyaPrefix: "Isegahama" }),
      generateShikona("s4", { nationality: "MN" }),
      generateShikona("s5", { rank: "yokozuna" }),
      generateShikona("s1", { rng: new SeededRNG("fixed") }),
    ];
    expect(out).toMatchSnapshot();
  });

  it("generateRikishiName / generateOyakataName seeded", () => {
    expect([
      generateRikishiName("n1"),
      generateRikishiName("n2"),
      generateOyakataName("o1"),
      generateOyakataName("o2"),
      generateRikishiName("n1", new SeededRNG("alt")),
    ]).toMatchSnapshot();
  });
});

describe("banzuke.ts flat exports — golden master", () => {
  function entry(id: string, rank: string, rankNumber: number | undefined, side: "east" | "west", division = "makuuchi"): BanzukeEntry {
    return { rikishiId: id, position: { rank, rankNumber, side }, division } as never;
  }
  function snap(ids: string[], ranks: Array<[string, number | undefined, "east" | "west"]>, division = "makuuchi") {
    return {
      divisions: {
        [division]: {
          assignments: ids.map((id, i) => ({
            rikishiId: id,
            position: { rank: ranks[i][0], rankNumber: ranks[i][1], side: ranks[i][2] },
          })),
        },
      },
    } as never;
  }

  it("compareBanzuke movement classification", () => {
    const prev = snap(["r1", "r2", "r3"], [["maegashira", 1, "east"], ["maegashira", 2, "east"], ["maegashira", 3, "east"]]);
    const curr = snap(["r1", "r2", "r4"], [["komusubi", undefined, "east"], ["maegashira", 5, "west"], ["maegashira", 1, "east"]]);
    const rikishiMap = new Map([
      ["r1", mockRikishi("r1")],
      ["r2", mockRikishi("r2")],
      ["r4", mockRikishi("r4")],
    ]);
    expect(compareBanzuke(curr as never, prev as never, rikishiMap)).toMatchSnapshot();
    expect(compareBanzuke(curr as never, null, rikishiMap)).toMatchSnapshot();
  });

  it("computeVariableSanyakuCounts", () => {
    const entries = [
      entry("y1", "yokozuna", undefined, "east"),
      entry("o1", "ozeki", undefined, "east"),
      entry("o2", "ozeki", undefined, "west"),
      entry("s1", "sekiwake", undefined, "east"),
      entry("k1", "komusubi", undefined, "east"),
      entry("m1", "maegashira", 1, "east"),
    ];
    const perf = new Map<string, BashoPerformance>([
      ["o1", { rikishiId: "o1", wins: 13, losses: 2, absences: 0, promoteToYokozuna: true } as never],
      ["s1", { rikishiId: "s1", wins: 12, losses: 3, absences: 0 } as never],
      ["k1", { rikishiId: "k1", wins: 9, losses: 6, absences: 0 } as never],
      ["m1", { rikishiId: "m1", wins: 14, losses: 1, absences: 0 } as never],
    ]);
    expect(computeVariableSanyakuCounts(entries, perf, new Set(["o2"]))).toMatchSnapshot();
  });
});
