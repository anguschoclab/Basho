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
  OYAKATA_RESULT_CAP,
  STAFF_RESULT_CAP,
  CANDIDATE_RESULT_CAP,
} from "@/presenters/projections/entitySearchProjections";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { RetiredRikishiSummary } from "@/engine/types/history";
import type { Heya } from "@/engine/types/heya";
import type { Oyakata } from "@/engine/types/oyakata";
import type { Staff } from "@/engine/types/staff";
import type { ScoutedRikishi } from "@/engine/recruitment/ScoutingService";
import type {
  TalentCandidate,
  TalentPoolType,
  TalentPoolWorldState,
} from "@/engine/types/talent";

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

function oyakataFixture(id: string, overrides: Partial<Oyakata> = {}): Oyakata {
  return MockFactory.createOyakata(id, {
    name: `Oyakata ${id}`,
    shikona: `Ex-Rikishi ${id}`,
    heyaId: "h2",
    archetype: "scientist",
    ...overrides,
  });
}

function staffFixture(id: string, overrides: Partial<Staff> = {}): Staff {
  return MockFactory.createStaff(id, {
    name: `Staff ${id}`,
    role: "technique_coach",
    heyaId: "h1",
    ...overrides,
  });
}

function candidateFixture(
  id: string,
  overrides: Partial<TalentCandidate> = {}
): TalentCandidate {
  return MockFactory.createCandidate(id, {
    name: `Candidate ${id}`,
    birthYear: 2008,
    nationality: "Japan",
    visibilityBand: "public",
    availabilityState: "available",
    ...overrides,
  });
}

function talentPoolFixture(
  candidates: TalentCandidate[],
  visible: Partial<Record<TalentPoolType, string[]>>,
  hidden: Partial<Record<TalentPoolType, string[]>> = {},
  playerScouting: TalentPoolWorldState["playerScouting"] = {}
): TalentPoolWorldState {
  const tp = MockFactory.createTalentPool({
    candidates: Object.fromEntries(candidates.map((c) => [c.candidateId, c])),
    playerScouting,
  });
  for (const poolType of ["high_school", "university", "foreign"] as const) {
    tp.pools[poolType].candidatesVisible = visible[poolType] ?? [];
    tp.pools[poolType].candidatesHidden = hidden[poolType] ?? [];
  }
  return tp;
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
      oyakata: undefined,
      staff: undefined,
      talentPool: undefined,
    } as Partial<WorldState>);
    const res = searchEntities(world, "taka", "h1");
    expect(res).toEqual({
      rikishi: [],
      retired: [],
      heyas: [],
      oyakata: [],
      staff: [],
      candidates: [],
    });
  });
});

describe("searchEntities — oyakata bucket", () => {
  it("matches oyakata by name, shikona, and formerShikona", () => {
    const world = worldFixture({
      heyas: new Map([["h2", heyaFixture({ id: "h2", name: "Miyagino" })]]),
      oyakata: new Map([
        ["o1", oyakataFixture("o1", { name: "Chiganoura", shikona: "Masudayama" })],
        ["o2", oyakataFixture("o2", { name: "Magaki", formerShikona: "Wakanohana" })],
        ["o3", oyakataFixture("o3", { name: "Tokitsukaze", shikona: "Futatsuryu" })],
      ]),
    });

    const byName = searchEntities(world, "chiga", "h1");
    expect(byName.oyakata.map((o) => o.id)).toEqual(["o1"]);

    const byShikona = searchEntities(world, "masuda", "h1");
    expect(byShikona.oyakata.map((o) => o.id)).toEqual(["o1"]);

    const byFormer = searchEntities(world, "wakanohana", "h1");
    expect(byFormer.oyakata.map((o) => o.id)).toEqual(["o2"]);
  });

  it("resolves the oyakata's stable name and player ownership", () => {
    const world = worldFixture({
      heyas: new Map([
        ["h1", heyaFixture({ id: "h1", name: "Futagoyama" })],
        ["h2", heyaFixture({ id: "h2", name: "Miyagino" })],
      ]),
      oyakata: new Map([
        ["o1", oyakataFixture("o1", { name: "Mine Oyakata", heyaId: "h1" })],
        ["o2", oyakataFixture("o2", { name: "Minegishi", heyaId: "h2" })],
      ]),
    });
    const res = searchEntities(world, "mine", "h1");
    const mine = res.oyakata.find((o) => o.id === "o1");
    const other = res.oyakata.find((o) => o.id === "o2");
    expect(mine?.isPlayerOwned).toBe(true);
    expect(other?.isPlayerOwned).toBe(false);
    expect(other?.heyaName).toBe("Miyagino");
  });

  it("carries emeritus/caretaker flags and elder status", () => {
    const world = worldFixture({
      oyakata: new Map([
        [
          "o1",
          oyakataFixture("o1", {
            name: "Elder One",
            isEmeritus: true,
            elderStatus: "ichidai_toshiyori",
          }),
        ],
        ["o2", oyakataFixture("o2", { name: "Elder Two", isCaretaker: true })],
        [
          "o3",
          oyakataFixture("o3", {
            name: "Elder Three",
            elderStatus: "jun_toshiyori",
            elderExpiryYear: 2031,
          }),
        ],
      ]),
    });
    const res = searchEntities(world, "elder", "h1");
    expect(res.oyakata).toHaveLength(3);
    const emeritus = res.oyakata.find((o) => o.id === "o1")!;
    const caretaker = res.oyakata.find((o) => o.id === "o2")!;
    const jun = res.oyakata.find((o) => o.id === "o3")!;
    expect(emeritus.isEmeritus).toBe(true);
    expect(emeritus.elderStatus).toBe("ichidai_toshiyori");
    expect(caretaker.isCaretaker).toBe(true);
    expect(jun.elderStatus).toBe("jun_toshiyori");
    expect(jun.elderExpiryYear).toBe(2031);
  });

  it("exposes archetypeLabel only for the player's stable or a scouted stable", () => {
    const world = worldFixture({
      oyakata: new Map([
        ["o1", oyakataFixture("o1", { name: "Own Elder", heyaId: "h1" })],
        ["o2", oyakataFixture("o2", { name: "Scouted Elder", heyaId: "h2" })],
        ["o3", oyakataFixture("o3", { name: "Unknown Elder", heyaId: "h3" })],
      ]),
    });
    world.playerKnowledge = {
      scouting: {
        s1: { publicInfo: { heyaId: "h2" }, timesObserved: 3 } as ScoutedRikishi,
      },
    };

    const res = searchEntities(world, "elder", "h1");
    expect(res.oyakata.find((o) => o.id === "o1")?.archetypeLabel).toBe("scientist");
    expect(res.oyakata.find((o) => o.id === "o2")?.archetypeLabel).toBe("scientist");
    expect(res.oyakata.find((o) => o.id === "o3")?.archetypeLabel).toBeUndefined();
  });

  it("ignores scouting entries with no observations", () => {
    const world = worldFixture({
      oyakata: new Map([["o3", oyakataFixture("o3", { name: "Unknown Elder", heyaId: "h3" })]]),
    });
    world.playerKnowledge = {
      scouting: {
        s1: { publicInfo: { heyaId: "h3" }, timesObserved: 0 } as ScoutedRikishi,
      },
    };
    const res = searchEntities(world, "elder", "h1");
    expect(res.oyakata[0]?.archetypeLabel).toBeUndefined();
  });

  it("caps oyakata results at OYAKATA_RESULT_CAP", () => {
    const oyakata = new Map<string, Oyakata>();
    for (let i = 0; i < OYAKATA_RESULT_CAP + 3; i++) {
      oyakata.set(`o${i}`, oyakataFixture(`o${i}`, { name: `Elder${i}` }));
    }
    const res = searchEntities(worldFixture({ oyakata }), "elder", "h1");
    expect(res.oyakata.length).toBe(OYAKATA_RESULT_CAP);
  });
});

describe("searchEntities — staff bucket", () => {
  it("matches staff by name with role label and stable resolution", () => {
    const world = worldFixture({
      heyas: new Map([
        ["h1", heyaFixture({ id: "h1", name: "Futagoyama" })],
        ["h2", heyaFixture({ id: "h2", name: "Miyagino" })],
      ]),
      staff: new Map([
        ["s1", staffFixture("s1", { name: "Tanaka Jiro", heyaId: "h1" })],
        [
          "s2",
          staffFixture("s2", { name: "Tanaka Saburo", role: "scout", heyaId: "h2" }),
        ],
      ]),
    });
    const res = searchEntities(world, "tanaka", "h1");
    expect(res.staff).toHaveLength(2);
    const jiro = res.staff.find((s) => s.id === "s1")!;
    const saburo = res.staff.find((s) => s.id === "s2")!;
    expect(jiro.role).toBe("technique_coach");
    expect(jiro.heyaName).toBe("Futagoyama");
    expect(jiro.isPlayerOwned).toBe(true);
    expect(saburo.isPlayerOwned).toBe(false);
    expect(saburo.heyaName).toBe("Miyagino");
    expect(saburo.roleLabel).toBeTruthy();
  });

  it("caps staff results at STAFF_RESULT_CAP", () => {
    const staff = new Map<string, Staff>();
    for (let i = 0; i < STAFF_RESULT_CAP + 3; i++) {
      staff.set(`s${i}`, staffFixture(`s${i}`, { name: `Helper${i}` }));
    }
    const res = searchEntities(worldFixture({ staff }), "helper", "h1");
    expect(res.staff.length).toBe(STAFF_RESULT_CAP);
  });
});

describe("searchEntities — candidates bucket", () => {
  it("returns public candidates from each pool's visible list", () => {
    const world = worldFixture({
      talentPool: talentPoolFixture(
        [
          candidateFixture("c1", { name: "Yamada Taro" }),
          candidateFixture("c2", { name: "Yamamoto Ken" }),
        ],
        { high_school: ["c1"], university: ["c2"] }
      ),
    });
    const res = searchEntities(world, "yama", "h1");
    expect(res.candidates.map((c) => c.candidateId)).toEqual(
      expect.arrayContaining(["c1", "c2"])
    );
    const hs = res.candidates.find((c) => c.candidateId === "c1")!;
    expect(hs.pool).toBe("high_school");
    expect(hs.age).toBe(world.year - 2008);
  });

  it("returns non-public candidates only when the player has scouted them (level >= 65)", () => {
    const world = worldFixture({
      talentPool: talentPoolFixture(
        [
          candidateFixture("c1", { name: "Rumored Ace", visibilityBand: "rumored" }),
          candidateFixture("c2", { name: "Rumored Ace Two", visibilityBand: "obscure" }),
          candidateFixture("c3", { name: "Rumored Ace Three", visibilityBand: "public" }),
        ],
        { high_school: ["c1", "c2", "c3"] },
        {},
        { c1: { scoutingLevel: 70, lastScoutedWeek: 5 } }
      ),
    });
    const res = searchEntities(world, "rumored ace", "h1");
    expect(res.candidates.map((c) => c.candidateId)).toEqual(
      expect.arrayContaining(["c1", "c3"])
    );
    expect(res.candidates.find((c) => c.candidateId === "c2")).toBeUndefined();
  });

  it("never returns hidden-reserve candidates", () => {
    const world = worldFixture({
      talentPool: talentPoolFixture(
        [candidateFixture("c1", { name: "Secret Prospect" })],
        {},
        { high_school: ["c1"] },
        { c1: { scoutingLevel: 100, lastScoutedWeek: 5 } }
      ),
    });
    const res = searchEntities(world, "secret", "h1");
    expect(res.candidates).toEqual([]);
  });

  it("respects foreign-pool regional presence gating", () => {
    const world = worldFixture({
      heyas: new Map([
        [
          "h1",
          heyaFixture({ id: "h1", name: "Futagoyama", regionalPresence: { Mongolia: 50 } } as Partial<Heya>),
        ],
      ]),
      talentPool: talentPoolFixture(
        [
          candidateFixture("c1", {
            name: "Bat Erdene",
            nationality: "Mongolia",
            originRegion: "Mongolia",
          }),
          candidateFixture("c2", {
            name: "Kai Nakamura",
            nationality: "USA",
            originRegion: "Hawaii",
          }),
        ],
        { foreign: ["c1", "c2"] }
      ),
    });
    const res = searchEntities(world, "a", "h1");
    const ids = res.candidates.map((c) => c.candidateId);
    expect(ids).toContain("c1");
    expect(ids).not.toContain("c2");
  });

  it("caps candidate results at CANDIDATE_RESULT_CAP", () => {
    const candidates = Array.from({ length: CANDIDATE_RESULT_CAP + 3 }, (_, i) =>
      candidateFixture(`c${i}`, { name: `Prospect${i}` })
    );
    const world = worldFixture({
      talentPool: talentPoolFixture(candidates, {
        high_school: candidates.map((c) => c.candidateId),
      }),
    });
    const res = searchEntities(world, "prospect", "h1");
    expect(res.candidates.length).toBe(CANDIDATE_RESULT_CAP);
  });
});
