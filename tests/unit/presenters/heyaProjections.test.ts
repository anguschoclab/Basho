/**
 * heyaProjections.test.ts
 *
 * Equivalence pins for projectHeyaData / projectHeyaRosterWithAge:
 * roster resolution, age calculation, dangling-id skip, and deduplication.
 */
import { describe, it, expect, vi } from "vitest";
import {
  projectHeyaData,
  projectHeyaRosterWithAge,
  projectStableBashoForm,
} from "@/presenters/projections/heyaProjections";
import { makeMockWorld, mockRikishi, makeMockHeya } from "@tests/unit/engine/utils";
import type { Rikishi } from "@/engine/types/rikishi";
import type { Oyakata } from "@/engine/types/oyakata";
import type { CareerSnapshot } from "@/engine/types/history";

vi.mock("@/presenters/rikishi/index", () => ({
  projectRikishi: vi.fn((r: Rikishi) => ({ id: r.id, shikona: r.shikona })),
}));

function makeFixtureWorld() {
  const r1 = mockRikishi("r1", { heyaId: "h1", birthYear: 1995 });
  const r2 = mockRikishi("r2", { heyaId: "h1", birthYear: 2000 });
  return makeMockWorld({
    rikishi: new Map([
      ["r1", r1],
      ["r2", r2],
    ]),
    heyas: new Map([["h1", makeMockHeya("h1", { rikishiIds: ["r1", "r2"], oyakataId: "o1" })]]),
    oyakata: new Map([["o1", { id: "o1", quirks: ["strict"], traits: { patience: 3 } } as unknown as Oyakata]]),
    year: 2025,
  });
}

describe("projectHeyaRosterWithAge", () => {
  it("projects the roster with ages from world.year - birthYear", () => {
    const result = projectHeyaRosterWithAge(makeFixtureWorld(), "h1");
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ rikishi: { id: "r1", shikona: "Wrestler-r1" }, age: 30 });
    expect(result[1]).toEqual({ rikishi: { id: "r2", shikona: "Wrestler-r2" }, age: 25 });
  });

  it("skips roster ids that do not resolve", () => {
    const world = makeFixtureWorld();
    world.heyas.get("h1")!.rikishiIds = ["r1", "ghost"];
    const result = projectHeyaRosterWithAge(world, "h1");
    expect(result.map((e) => e.rikishi.id)).toEqual(["r1"]);
  });

  it("does not produce duplicate entries for duplicate rikishiIds", () => {
    const world = makeFixtureWorld();
    world.heyas.get("h1")!.rikishiIds = ["r1", "r1", "r2"];
    const result = projectHeyaRosterWithAge(world, "h1");
    expect(result.map((e) => e.rikishi.id)).toEqual(["r1", "r2"]);
  });

  it("returns [] for a missing heya", () => {
    expect(projectHeyaRosterWithAge(makeFixtureWorld(), "nope")).toEqual([]);
  });
});

describe("projectHeyaData", () => {
  it("returns heya, oyakata, quirks, and traits", () => {
    const data = projectHeyaData(makeFixtureWorld(), "h1");
    expect(data?.heya.id).toBe("h1");
    expect(data?.oyakata?.id).toBe("o1");
    expect(data?.oyakataQuirks).toEqual(["strict"]);
    expect(data?.oyakataTraits).toEqual({ patience: 3 });
  });

  it("returns null for a missing heya", () => {
    expect(projectHeyaData(makeFixtureWorld(), "nope")).toBeNull();
  });
});

function snap(overrides: Partial<CareerSnapshot> = {}): CareerSnapshot {
  return {
    id: `snap-${overrides.bashoId ?? "hatsu-2025"}`,
    bashoId: "hatsu-2025",
    year: 2025,
    month: 1,
    bashoName: "hatsu",
    rank: "maegashira",
    division: "makuuchi",
    rankNumber: 5,
    side: "east",
    wins: 8,
    losses: 7,
    absences: 0,
    isYusho: false,
    isJunYusho: false,
    specialPrizes: { shukunsho: false, kantosho: false, ginosho: false },
    weight: 140,
    momentum: 0,
    ...overrides,
  };
}

describe("projectStableBashoForm", () => {
  function makeFormWorld(careerHistories: Record<string, CareerSnapshot[]>) {
    const ids = Object.keys(careerHistories);
    const rikishi = new Map(
      ids.map((id) => [id, mockRikishi(id, { heyaId: "h1", careerHistory: careerHistories[id] })])
    );
    return makeMockWorld({
      rikishi,
      heyas: new Map([["h1", makeMockHeya("h1", { rikishiIds: ids, oyakataId: "o1" })]]),
      year: 2025,
    });
  }

  it("aggregates wins, losses, participants and kachi-koshi per basho", () => {
    const world = makeFormWorld({
      r1: [
        snap({ bashoId: "hatsu-2025", wins: 8, losses: 7 }),
        snap({ bashoId: "haru-2025", month: 3, bashoName: "haru", wins: 9, losses: 6 }),
      ],
      r2: [snap({ bashoId: "hatsu-2025", wins: 5, losses: 10 })],
    });
    const rows = projectStableBashoForm(world, "h1");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      basho: "Hatsu 2025",
      wins: 13,
      losses: 17,
      kachiKoshi: 1,
      rikishi: 2,
    });
    expect(rows[1]).toEqual({
      basho: "Haru 2025",
      wins: 9,
      losses: 6,
      kachiKoshi: 1,
      rikishi: 1,
    });
  });

  it("applies per-division kachi-koshi thresholds (15-bout vs 7-bout ranks)", () => {
    const world = makeFormWorld({
      mk: [snap({ rank: "makushita", division: "makushita", wins: 4, losses: 3 })],
      mg: [snap({ rank: "maegashira", wins: 7, losses: 8 })],
      jy: [snap({ rank: "juryo", division: "juryo", wins: 8, losses: 7 })],
      jd: [snap({ rank: "jonidan", division: "jonidan", wins: 3, losses: 4 })],
    });
    const rows = projectStableBashoForm(world, "h1");
    // makushita 4-3 (threshold 4) + juryo 8-7 (threshold 8) are KK;
    // maegashira 7-8 and jonidan 3-4 are not.
    expect(rows[0].kachiKoshi).toBe(2);
  });

  it("orders basho chronologically and keeps only the last 6", () => {
    const names = ["hatsu", "haru", "natsu", "nagoya", "aki", "kyushu"] as const;
    const months = [1, 3, 5, 7, 9, 11];
    const history = [
      ...names.map((n, i) =>
        snap({
          bashoId: `${n}-2024`,
          year: 2024,
          month: months[i],
          bashoName: n,
        })
      ),
      snap({ bashoId: "hatsu-2025", year: 2025, month: 1, bashoName: "hatsu" }),
    ];
    const rows = projectStableBashoForm(makeFormWorld({ r1: history }), "h1");
    expect(rows).toHaveLength(6);
    expect(rows[0].basho).toBe("Haru 2024");
    expect(rows[5].basho).toBe("Hatsu 2025");
  });

  it("returns [] for a missing heya, an empty roster, and absent careerHistory", () => {
    expect(projectStableBashoForm(makeFormWorld({ r1: [snap()] }), "nope")).toEqual([]);

    const emptyRoster = makeMockWorld({
      rikishi: new Map(),
      heyas: new Map([["h1", makeMockHeya("h1", { rikishiIds: [], oyakataId: "o1" })]]),
    });
    expect(projectStableBashoForm(emptyRoster, "h1")).toEqual([]);

    const noHistory = makeMockWorld({
      rikishi: new Map([["r1", mockRikishi("r1", { heyaId: "h1" })]]),
      heyas: new Map([["h1", makeMockHeya("h1", { rikishiIds: ["r1"], oyakataId: "o1" })]]),
    });
    expect(projectStableBashoForm(noHistory, "h1")).toEqual([]);
  });
});
