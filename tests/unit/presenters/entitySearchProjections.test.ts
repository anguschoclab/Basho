/**
 * entitySearchProjections.test.ts
 *
 * Unit tests for the global entity search projection — rikishi (active +
 * retired), and heyas. Covers matching, ordering, caps, and tolerance of
 * partial world shapes.
 */
import { describe, it, expect } from "vitest";
import {
  searchEntities,
  RIKISHI_RESULT_CAP,
  HEYA_RESULT_CAP,
} from "@/presenters/projections/entitySearchProjections";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { RetiredRikishiSummary } from "@/engine/types/history";
import type { Heya } from "@/engine/types/heya";

function rikishiFixture(overrides: Partial<Rikishi> = {}): Rikishi {
  return MockFactory.createRikishi({
    id: "r1",
    shikona: "Takanohana",
    heyaId: "h1",
    rank: "maegashira",
    rankNumber: 3,
    division: "makuuchi",
    isRetired: false,
    ...overrides,
  });
}

function makeSummary(overrides: Partial<RetiredRikishiSummary> = {}): RetiredRikishiSummary {
  return {
    id: "old1",
    shikona: "Taiho",
    heyaId: "h1",
    birthYear: 1970,
    careerWins: 700,
    careerLosses: 200,
    yushoCount: 32,
    junYushoCount: 4,
    sanshoCount: 6,
    kinboshiCount: 0,
    totalEarnings: 0,
    peakRank: "yokozuna",
    peakRankYear: 1995,
    peakDivision: "makuuchi",
    retirementYear: 2003,
    retirementReason: "Age",
    isRetired: true,
    yearlyAggregates: [],
    isSummary: true,
    ...overrides,
  } as RetiredRikishiSummary;
}

function heyaFixture(overrides: Partial<Heya> = {}): Heya {
  return MockFactory.createHeya(overrides.id ?? "h1", {
    name: "Futagoyama",
    rikishiIds: ["r1", "r2"],
    ...overrides,
  });
}

function worldFixture(overrides: Partial<WorldState> = {}): WorldState {
  return MockFactory.createWorld({
    year: 2026,
    playerHeyaId: "h1",
    ...overrides,
  } as Partial<WorldState>);
}

describe("searchEntities", () => {
  it("returns empty buckets for empty or whitespace queries", () => {
    const world = worldFixture({ rikishi: new Map([["r1", rikishiFixture()]]) });
    for (const q of ["", "   ", "\t"]) {
      const res = searchEntities(world, q, "h1");
      expect(res.rikishi).toEqual([]);
      expect(res.retired).toEqual([]);
      expect(res.heyas).toEqual([]);
    }
  });

  it("matches active rikishi by shikona substring, case-insensitive", () => {
    const world = worldFixture({
      rikishi: new Map([
        ["r1", rikishiFixture({ id: "r1", shikona: "Takanohana" })],
        ["r2", rikishiFixture({ id: "r2", shikona: "Wakanohana" })],
      ]),
    });
    const res = searchEntities(world, "hana", "h1");
    expect(res.rikishi.map((r) => r.shikona)).toEqual(
      expect.arrayContaining(["Takanohana", "Wakanohana"])
    );
    const resUpper = searchEntities(world, "TAKA", "h1");
    expect(resUpper.rikishi.map((r) => r.id)).toEqual(["r1"]);
  });

  it("matches rikishi by realName when present", () => {
    const world = worldFixture({
      rikishi: new Map([
        ["r1", rikishiFixture({ id: "r1", shikona: "Hakuho", realName: "Monkhbat" })],
        ["r2", rikishiFixture({ id: "r2", shikona: "Asashoryu" })],
      ]),
    });
    const res = searchEntities(world, "monkh", "h1");
    expect(res.rikishi.map((r) => r.id)).toEqual(["r1"]);
  });

  it("orders prefix matches before substring matches, then alphabetically", () => {
    const world = worldFixture({
      rikishi: new Map([
        ["r1", rikishiFixture({ id: "r1", shikona: "Kotozakura" })],
        ["r2", rikishiFixture({ id: "r2", shikona: "Kotomitsuki" })],
        ["r3", rikishiFixture({ id: "r3", shikona: "Aokoto" })],
      ]),
    });
    const res = searchEntities(world, "koto", "h1");
    // Prefix matches (Koto*) first alphabetically, then substring (Aokoto)
    expect(res.rikishi.map((r) => r.id)).toEqual(["r2", "r1", "r3"]);
  });

  it("includes retired rikishi from historicalRikishi with isRetired and peak rank", () => {
    const world = worldFixture({
      rikishi: new Map([["r1", rikishiFixture({ id: "r1", shikona: "Taihomaru" })]]),
      historicalRikishi: new Map([["old1", makeSummary()]]),
    });
    const res = searchEntities(world, "ta", "h1");
    expect(res.rikishi.map((r) => r.id)).toEqual(["r1"]);
    expect(res.retired.map((r) => r.id)).toEqual(["old1"]);
    const retired = res.retired[0];
    expect(retired.isRetired).toBe(true);
    expect(retired.rankLabel).toContain("Yokozuna");
  });

  it("puts active hits in rikishi bucket and retired in retired bucket (never interleaved)", () => {
    const world = worldFixture({
      rikishi: new Map([["r1", rikishiFixture({ id: "r1", shikona: "Akebono" })]]),
      historicalRikishi: new Map([["old1", makeSummary({ id: "old1", shikona: "Akezakura" })]]),
    });
    const res = searchEntities(world, "ake", "h1");
    expect(res.rikishi.every((r) => !r.isRetired)).toBe(true);
    expect(res.retired.every((r) => r.isRetired)).toBe(true);
  });

  it("matches heyas by name and reports rikishi count + player ownership", () => {
    const world = worldFixture({
      heyas: new Map([
        ["h1", heyaFixture({ id: "h1", name: "Futagoyama", rikishiIds: ["a", "b"] })],
        ["h2", heyaFixture({ id: "h2", name: "Miyagino", rikishiIds: ["c"] })],
      ]),
    });
    const res = searchEntities(world, "futa", "h1");
    expect(res.heyas).toHaveLength(1);
    expect(res.heyas[0].id).toBe("h1");
    expect(res.heyas[0].rikishiCount).toBe(2);
    expect(res.heyas[0].isPlayerOwned).toBe(true);
  });

  it("caps rikishi and heya results at the exported caps", () => {
    const rikishi = new Map<string, Rikishi>();
    for (let i = 0; i < RIKISHI_RESULT_CAP + 5; i++) {
      rikishi.set(`r${i}`, rikishiFixture({ id: `r${i}`, shikona: `Taka${String(i).padStart(2, "0")}` }));
    }
    const heyas = new Map<string, Heya>();
    for (let i = 0; i < HEYA_RESULT_CAP + 3; i++) {
      heyas.set(`h${i}`, heyaFixture({ id: `h${i}`, name: `Stable${i}` }));
    }
    const world = worldFixture({ rikishi, heyas });
    const res = searchEntities(world, "taka", "h1");
    expect(res.rikishi.length).toBe(RIKISHI_RESULT_CAP);
    const res2 = searchEntities(world, "stable", "h1");
    expect(res2.heyas.length).toBe(HEYA_RESULT_CAP);
  });

  it("resolves heyaName via world.heyas and falls back gracefully", () => {
    const world = worldFixture({
      rikishi: new Map([
        ["r1", rikishiFixture({ id: "r1", shikona: "Orphan", heyaId: "missing" })],
      ]),
      heyas: new Map([["h1", heyaFixture({ id: "h1", name: "Futagoyama" })]]),
    });
    const res = searchEntities(world, "orphan", "h1");
    expect(res.rikishi[0].heyaName).toBe("—");
  });

  it("flags player-owned rikishi via heyaId === playerHeyaId", () => {
    const world = worldFixture({
      rikishi: new Map([
        ["r1", rikishiFixture({ id: "r1", shikona: "Mine", heyaId: "h1" })],
        ["r2", rikishiFixture({ id: "r2", shikona: "Miyake", heyaId: "h2" })],
      ]),
    });
    const res = searchEntities(world, "mi", "h1");
    const mine = res.rikishi.find((r) => r.id === "r1");
    const other = res.rikishi.find((r) => r.id === "r2");
    expect(mine?.isPlayerOwned).toBe(true);
    expect(other?.isPlayerOwned).toBe(false);
  });

  it("tolerates absent rikishi/historicalRikishi/heyas maps (partial worlds in tests)", () => {
    const world = worldFixture({
      rikishi: undefined,
      historicalRikishi: undefined,
      heyas: undefined,
    } as Partial<WorldState>);
    const res = searchEntities(world, "taka", "h1");
    expect(res).toEqual({ rikishi: [], retired: [], heyas: [] });
  });
});
