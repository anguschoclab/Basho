/**
 * idIntegrity.test.ts
 *
 * Unit tests for the world ID-integrity system:
 *  - dedupeIdList / pushUniqueId helpers
 *  - validateWorldIdIntegrity audit across all entity maps, ID lists,
 *    cross-collection memberships, record-keyed maps, and pooled arrays
 *  - assertWorldIdIntegrity thrower
 */
import { describe, it, expect } from "vitest";
import {
  assertWorldIdIntegrity,
  dedupeIdList,
  pushUniqueId,
  validateWorldIdIntegrity,
  type IdIntegrityViolation,
} from "@/engine/core/idIntegrity";
import { makeMockWorld, mockRikishi, makeMockHeya } from "@tests/unit/engine/utils";
import type { WorldState } from "@/engine/types/world";
import type { Oyakata } from "@/engine/types/oyakata";
import type { Staff } from "@/engine/types/staff";
import type { Heya } from "@/engine/types/heya";
import type { Rikishi } from "@/engine/types/rikishi";
import type { TalentCandidate, TalentPoolState } from "@/engine/types/talent";
import type { Sponsor, Koenkai } from "@/engine/types/sponsors";
import type { MyosekiStock } from "@/engine/types/myoseki";
import type { EngineEvent } from "@/engine/types/events";
import type { RetiredRikishiSummary } from "@/engine/types/history";
import type { ScoutedRikishi } from "@/engine/recruitment/ScoutingService";
import type { Faction } from "@/engine/types/economy";

function kinds(violations: IdIntegrityViolation[]): Set<string> {
  return new Set(violations.map((v) => `${v.kind}:${v.collection}`));
}

function hasViolation(
  violations: IdIntegrityViolation[],
  kind: string,
  collection: string,
  id?: string
): boolean {
  return violations.some(
    (v) => v.kind === kind && v.collection === collection && (id === undefined || v.id === id)
  );
}

/** A fully-consistent minimal world — must produce zero violations. */
function makeCleanWorld(): WorldState {
  const r1 = mockRikishi("r1", { heyaId: "h1" });
  const r2 = mockRikishi("r2", { heyaId: "h1" });
  const heya = makeMockHeya("h1", { rikishiIds: ["r1", "r2"], oyakataId: "o1" });
  return makeMockWorld({
    rikishi: new Map([
      ["r1", r1],
      ["r2", r2],
    ]),
    heyas: new Map([["h1", heya]]),
    oyakata: new Map([["o1", { id: "o1" } as Oyakata]]),
  });
}

function makeRetired(id: string, heyaId = "h1"): RetiredRikishiSummary {
  return { id, isSummary: true, heyaId } as unknown as RetiredRikishiSummary;
}

describe("dedupeIdList", () => {
  it("returns undefined for undefined input", () => {
    expect(dedupeIdList(undefined)).toBeUndefined();
  });

  it("returns the same reference when the list is already unique", () => {
    const ids = ["a", "b", "c"];
    expect(dedupeIdList(ids)).toBe(ids);
  });

  it("dedupes preserving first-occurrence order", () => {
    expect(dedupeIdList(["a", "b", "a", "c", "b"])).toEqual(["a", "b", "c"]);
  });
});

describe("pushUniqueId", () => {
  it("appends when absent", () => {
    expect(pushUniqueId(["a"], "b")).toEqual(["a", "b"]);
  });

  it("returns the same reference when present", () => {
    const ids = ["a", "b"];
    expect(pushUniqueId(ids, "a")).toBe(ids);
  });
});

describe("validateWorldIdIntegrity — clean world", () => {
  it("reports no violations on a consistent world", () => {
    expect(validateWorldIdIntegrity(makeCleanWorld())).toEqual([]);
  });
});

describe("validateWorldIdIntegrity — entity map key consistency", () => {
  it("flags an entity whose id does not match its map key", () => {
    const world = makeCleanWorld();
    world.trainingState = new Map([["wrong-key", { heyaId: "h1" } as never]]);
    expect(hasViolation(validateWorldIdIntegrity(world), "key_mismatch", "trainingState", "wrong-key")).toBe(true);
  });

  it("flags a mis-keyed heya", () => {
    const world = makeCleanWorld();
    const stray = makeMockHeya("h-stray", { oyakataId: "o1" });
    world.heyas.set("not-h-stray", stray);
    expect(hasViolation(validateWorldIdIntegrity(world), "key_mismatch", "heyas", "not-h-stray")).toBe(true);
  });
});

describe("validateWorldIdIntegrity — in-entity ID list duplicates", () => {
  it("flags duplicate heya.rikishiIds", () => {
    const world = makeCleanWorld();
    world.heyas.get("h1")!.rikishiIds = ["r1", "r1", "r2"];
    expect(hasViolation(validateWorldIdIntegrity(world), "duplicate_id", "heya.rikishiIds", "r1")).toBe(true);
  });

  it("flags duplicate heya.staffIds", () => {
    const world = makeCleanWorld();
    world.staff.set("s1", { id: "s1" } as Staff);
    world.heyas.get("h1")!.staffIds = ["s1", "s1"];
    expect(hasViolation(validateWorldIdIntegrity(world), "duplicate_id", "heya.staffIds", "s1")).toBe(true);
  });

  it("flags duplicate rikishi.tsukebitoIds", () => {
    const world = makeCleanWorld();
    world.rikishi.get("r1")!.tsukebitoIds = ["r2", "r2"];
    expect(hasViolation(validateWorldIdIntegrity(world), "duplicate_id", "rikishi.tsukebitoIds", "r2")).toBe(true);
  });

  it("flags duplicate rikishi.menteeIds", () => {
    const world = makeCleanWorld();
    world.rikishi.get("r1")!.menteeIds = ["r2", "r2"];
    expect(hasViolation(validateWorldIdIntegrity(world), "duplicate_id", "rikishi.menteeIds", "r2")).toBe(true);
  });
});

describe("validateWorldIdIntegrity — cross-collection membership", () => {
  it("flags the same rikishiId on two active rosters", () => {
    const world = makeCleanWorld();
    const h2 = makeMockHeya("h2", { rikishiIds: ["r1"], oyakataId: "o1" });
    world.heyas.set("h2", h2);
    expect(hasViolation(validateWorldIdIntegrity(world), "duplicate_id", "heya.rikishiIds", "r1")).toBe(true);
  });

  it("flags an id present in both rikishi and historicalRikishi", () => {
    const world = makeCleanWorld();
    world.historicalRikishi.set("r1", makeRetired("r1"));
    expect(hasViolation(validateWorldIdIntegrity(world), "cross_collection", "rikishi_vs_historical", "r1")).toBe(true);
  });

  it("flags a roster backref mismatch (rikishi.heyaId points elsewhere)", () => {
    const world = makeCleanWorld();
    world.rikishi.get("r2")!.heyaId = "h1-other";
    expect(hasViolation(validateWorldIdIntegrity(world), "cross_collection", "heya.rikishiIds", "r2")).toBe(true);
  });

  it("flags a retired (historical-only) rikishi still on an active roster", () => {
    const r3 = mockRikishi("r3", { heyaId: "h1" });
    const world = makeCleanWorld();
    // r3 exists only as a historical record yet is rostered
    world.historicalRikishi.set("r3", makeRetired("r3"));
    world.heyas.get("h1")!.rikishiIds = ["r1", "r2", "r3"];
    expect(hasViolation(validateWorldIdIntegrity(world), "cross_collection", "heya.rikishiIds", "r3")).toBe(true);
  });

  it("flags a retired rikishi still in activeRikishiIds", () => {
    const retired = mockRikishi("r3", { heyaId: "h1", isRetired: true });
    const world = makeCleanWorld();
    world.rikishi.set("r3", retired);
    world.activeRikishiIds.add("r3"); // stale index entry
    const violations = validateWorldIdIntegrity(world);
    expect(hasViolation(violations, "cross_collection", "activeRikishiIds", "r3")).toBe(true);
  });

  it("flags a retired rikishi still present in world.rikishi (ghost entry)", () => {
    const retired = mockRikishi("r3", { heyaId: "h1", isRetired: true });
    const world = makeCleanWorld();
    world.rikishi.set("r3", retired);
    const violations = validateWorldIdIntegrity(world);
    expect(hasViolation(violations, "cross_collection", "rikishi", "r3")).toBe(true);
  });

  it("flags an active rikishi missing from activeRikishiIds", () => {
    const world = makeCleanWorld();
    world.activeRikishiIds.delete("r2");
    expect(hasViolation(validateWorldIdIntegrity(world), "cross_collection", "activeRikishiIds", "r2")).toBe(true);
  });
});

describe("validateWorldIdIntegrity — dangling references", () => {
  it("flags a rostered id that resolves to nothing", () => {
    const world = makeCleanWorld();
    world.heyas.get("h1")!.rikishiIds = ["r1", "r2", "ghost"];
    expect(hasViolation(validateWorldIdIntegrity(world), "dangling_ref", "heya.rikishiIds", "ghost")).toBe(true);
  });

  it("flags a dangling heya.oyakataId", () => {
    const world = makeCleanWorld();
    world.heyas.get("h1")!.oyakataId = "ghost";
    expect(hasViolation(validateWorldIdIntegrity(world), "dangling_ref", "heya.oyakataId", "ghost")).toBe(true);
  });

  it("flags a dangling rikishi.heyaId", () => {
    const world = makeCleanWorld();
    world.rikishi.get("r1")!.heyaId = "ghost";
    expect(hasViolation(validateWorldIdIntegrity(world), "dangling_ref", "rikishi.heyaId", "ghost")).toBe(true);
  });

  it("flags a dangling rikishi.mentorId", () => {
    const world = makeCleanWorld();
    world.rikishi.get("r1")!.mentorId = "ghost";
    expect(hasViolation(validateWorldIdIntegrity(world), "dangling_ref", "rikishi.mentorId", "ghost")).toBe(true);
  });

  it("flags a dangling activeRikishiIds entry", () => {
    const world = makeCleanWorld();
    world.activeRikishiIds.add("ghost");
    expect(hasViolation(validateWorldIdIntegrity(world), "dangling_ref", "activeRikishiIds", "ghost")).toBe(true);
  });

  it("flags a dangling playerHeyaId", () => {
    const world = makeCleanWorld();
    world.playerHeyaId = "ghost";
    expect(hasViolation(validateWorldIdIntegrity(world), "dangling_ref", "world.playerHeyaId", "ghost")).toBe(true);
  });
});

describe("validateWorldIdIntegrity — pooled arrays", () => {
  it("flags duplicate ids in world.history", () => {
    const world = makeCleanWorld();
    world.history = [
      { id: "basho-1" },
      { id: "basho-1" },
    ] as never;
    expect(hasViolation(validateWorldIdIntegrity(world), "duplicate_id", "history", "basho-1")).toBe(true);
  });

  it("flags duplicate ids in events.log", () => {
    const world = makeCleanWorld();
    world.events.log = [
      { id: "ev1" },
      { id: "ev1" },
    ] as EngineEvent[];
    expect(hasViolation(validateWorldIdIntegrity(world), "duplicate_id", "events.log", "ev1")).toBe(true);
  });

  it("flags duplicate ids in pendingDecisions", () => {
    const world = makeCleanWorld();
    world.pendingDecisions = [
      { id: "d1" },
      { id: "d1" },
    ] as never;
    expect(hasViolation(validateWorldIdIntegrity(world), "duplicate_id", "pendingDecisions", "d1")).toBe(true);
  });

  it("flags duplicate ids in gyojiPool and shimpanPool", () => {
    const world = makeCleanWorld();
    world.gyojiPool = [{ id: "g1" }, { id: "g1" }] as never;
    world.shimpanPool = [{ id: "s1" }, { id: "s1" }] as never;
    const violations = validateWorldIdIntegrity(world);
    expect(hasViolation(violations, "duplicate_id", "gyojiPool", "g1")).toBe(true);
    expect(hasViolation(violations, "duplicate_id", "shimpanPool", "s1")).toBe(true);
  });

  it("flags a dangling awardLog winnerId", () => {
    const world = makeCleanWorld();
    world.awardLog = [{ winnerId: "ghost" }] as never;
    expect(hasViolation(validateWorldIdIntegrity(world), "dangling_ref", "awardLog", "ghost")).toBe(true);
  });

  it("flags a dangling encouragementLog participant", () => {
    const world = makeCleanWorld();
    world.encouragementLog = [{ from: "ghost", to: "r1", basho: "hatsu" }];
    expect(hasViolation(validateWorldIdIntegrity(world), "dangling_ref", "encouragementLog", "ghost")).toBe(true);
  });

  it("flags a dangling lineage edge endpoint", () => {
    const world = makeCleanWorld();
    world.lineage = [{ mentorId: "ghost", menteeId: "r1", sinceYear: 1, sinceWeek: 1 }];
    expect(hasViolation(validateWorldIdIntegrity(world), "dangling_ref", "lineage", "ghost")).toBe(true);
  });

  it("flags duplicate ids and dangling refs in pendingRikishiRequests", () => {
    const world = makeCleanWorld();
    world.pendingRikishiRequests = [
      { id: "q1", rikishiId: "r1", heyaId: "h1" },
      { id: "q1", rikishiId: "ghost", heyaId: "ghost2" },
    ] as never;
    const violations = validateWorldIdIntegrity(world);
    expect(hasViolation(violations, "duplicate_id", "pendingRikishiRequests", "q1")).toBe(true);
    expect(hasViolation(violations, "dangling_ref", "pendingRikishiRequests", "ghost")).toBe(true);
  });

  it("flags duplicate exhibition ids and dangling heya refs", () => {
    const world = makeCleanWorld();
    world.pendingExhibitions = [
      { id: "ex1", heyaId: "h1" },
      { id: "ex1", heyaId: "ghost" },
    ] as never;
    const violations = validateWorldIdIntegrity(world);
    expect(hasViolation(violations, "duplicate_id", "pendingExhibitions", "ex1")).toBe(true);
    expect(hasViolation(violations, "dangling_ref", "pendingExhibitions", "ghost")).toBe(true);
  });
});

describe("validateWorldIdIntegrity — record-keyed maps", () => {
  it("flags a customKeshoConfigs key that is not a known rikishi", () => {
    const world = makeCleanWorld();
    world.customKeshoConfigs = { ghost: {} };
    expect(hasViolation(validateWorldIdIntegrity(world), "dangling_ref", "customKeshoConfigs", "ghost")).toBe(true);
  });

  it("flags a boutTactics key that is not a known rikishi", () => {
    const world = makeCleanWorld();
    world.boutTactics = { ghost: "defensive" };
    expect(hasViolation(validateWorldIdIntegrity(world), "dangling_ref", "boutTactics", "ghost")).toBe(true);
  });

  it("flags an npcScoutingPriorities key that is not a known heya", () => {
    const world = makeCleanWorld();
    world.npcScoutingPriorities = { ghost: "active" };
    expect(hasViolation(validateWorldIdIntegrity(world), "dangling_ref", "npcScoutingPriorities", "ghost")).toBe(true);
  });

  it("flags a factions record whose id does not match its key", () => {
    const world = makeCleanWorld();
    world.factions = { kokonoe: { id: "takanohana" } } as unknown as WorldState["factions"];
    expect(hasViolation(validateWorldIdIntegrity(world), "key_mismatch", "factions", "kokonoe")).toBe(true);
  });

  it("flags a myosekiMarket stock whose id does not match its key", () => {
    const world = makeCleanWorld();
    world.myosekiMarket = {
      stocks: { ms1: { id: "other" } as MyosekiStock },
      history: [],
    };
    expect(hasViolation(validateWorldIdIntegrity(world), "key_mismatch", "myosekiMarket.stocks", "ms1")).toBe(true);
  });

  it("flags a playerKnowledge.scouting entry whose rikishiId does not match its key", () => {
    const world = makeCleanWorld();
    world.playerKnowledge = {
      scouting: { ghost: { rikishiId: "other-rikishi" } as ScoutedRikishi },
    };
    expect(hasViolation(validateWorldIdIntegrity(world), "key_mismatch", "playerKnowledge.scouting", "ghost")).toBe(true);
  });
});

describe("validateWorldIdIntegrity — nested structures", () => {
  function makePool(overrides: Partial<TalentPoolState> = {}): TalentPoolState {
    return {
      poolId: "p",
      poolType: "high_school",
      refreshCadence: "yearly",
      populationCap: 10,
      hiddenReserveCap: 5,
      candidatesVisible: [],
      candidatesHidden: [],
      lastRefreshWeek: 1,
      scarcityBand: "normal",
      qualityBand: "normal",
      ...overrides,
    };
  }

  function makeCandidate(candidateId: string, personId: string): TalentCandidate {
    return { candidateId, personId } as TalentCandidate;
  }

  it("flags a candidate whose candidateId does not match its record key", () => {
    const world = makeCleanWorld();
    world.talentPool = {
      version: "1.0.0",
      lastYearlyRefreshYear: 2025,
      candidates: { c1: makeCandidate("c-other", "p1") },
      pools: {
        high_school: makePool(),
        university: makePool({ poolId: "u", poolType: "university" }),
        foreign: makePool({ poolId: "f", poolType: "foreign" }),
      },
    };
    expect(hasViolation(validateWorldIdIntegrity(world), "key_mismatch", "talentPool.candidates", "c1")).toBe(true);
  });

  it("flags two candidates sharing the same personId", () => {
    const world = makeCleanWorld();
    world.talentPool = {
      version: "1.0.0",
      lastYearlyRefreshYear: 2025,
      candidates: {
        c1: makeCandidate("c1", "p1"),
        c2: makeCandidate("c2", "p1"),
      },
      pools: {
        high_school: makePool(),
        university: makePool({ poolId: "u", poolType: "university" }),
        foreign: makePool({ poolId: "f", poolType: "foreign" }),
      },
    };
    expect(hasViolation(validateWorldIdIntegrity(world), "duplicate_id", "talentPool.candidates", "p1")).toBe(true);
  });

  it("flags duplicates and dangling refs in pool candidate lists plus visible∩hidden overlap", () => {
    const world = makeCleanWorld();
    world.talentPool = {
      version: "1.0.0",
      lastYearlyRefreshYear: 2025,
      candidates: { c1: makeCandidate("c1", "p1") },
      pools: {
        high_school: makePool({
          candidatesVisible: ["c1", "ghost", "c1"],
          candidatesHidden: ["c1"],
        }),
        university: makePool({ poolId: "u", poolType: "university" }),
        foreign: makePool({ poolId: "f", poolType: "foreign" }),
      },
    };
    const violations = validateWorldIdIntegrity(world);
    expect(hasViolation(violations, "duplicate_id", "talentPool.pools.candidatesVisible", "c1")).toBe(true);
    expect(hasViolation(violations, "dangling_ref", "talentPool.pools.candidatesVisible", "ghost")).toBe(true);
    expect(hasViolation(violations, "cross_collection", "talentPool.pools", "c1")).toBe(true);
  });

  it("flags a suitor heyaId that resolves to nothing", () => {
    const world = makeCleanWorld();
    const c = makeCandidate("c1", "p1");
    c.competingSuitors = [{ heyaId: "ghost", interestBand: "high", offerType: "standard", deadlineWeek: 1 }];
    world.talentPool = {
      version: "1.0.0",
      lastYearlyRefreshYear: 2025,
      candidates: { c1: c },
      pools: {
        high_school: makePool({ candidatesVisible: ["c1"] }),
        university: makePool({ poolId: "u", poolType: "university" }),
        foreign: makePool({ poolId: "f", poolType: "foreign" }),
      },
    };
    expect(hasViolation(validateWorldIdIntegrity(world), "dangling_ref", "talentPool.candidates", "ghost")).toBe(true);
  });

  it("flags sponsor/koenkai map key mismatches and dangling koenkai heyaId", () => {
    const world = makeCleanWorld();
    world.sponsorPool = {
      sponsors: new Map([["sp1", { sponsorId: "sp1" } as Sponsor]]),
      koenkais: new Map<string, Koenkai>([
        ["k1", { koenkaiId: "wrong", heyaId: "h1" } as Koenkai],
        ["k2", { koenkaiId: "k2", heyaId: "ghost" } as Koenkai],
      ]),
    };
    const violations = validateWorldIdIntegrity(world);
    expect(hasViolation(violations, "key_mismatch", "sponsorPool.koenkais", "k1")).toBe(true);
    expect(hasViolation(violations, "dangling_ref", "sponsorPool.koenkais", "ghost")).toBe(true);
  });

  it("flags duplicate boutIds and dangling standings keys in currentBasho", () => {
    const world = makeCleanWorld();
    world.currentBasho = {
      id: "b1",
      matches: [
        { boutId: "m1", eastRikishiId: "r1", westRikishiId: "r2" },
        { boutId: "m1", eastRikishiId: "r1", westRikishiId: "r2" },
      ],
      standings: new Map([
        ["r1", { wins: 1, losses: 0 }],
        ["ghost", { wins: 0, losses: 1 }],
      ]),
    } as never;
    const violations = validateWorldIdIntegrity(world);
    expect(hasViolation(violations, "duplicate_id", "currentBasho.matches", "m1")).toBe(true);
    expect(hasViolation(violations, "dangling_ref", "currentBasho.standings", "ghost")).toBe(true);
  });

  it("flags a dangling heyaId on a koenkai-linked heya", () => {
    const world = makeCleanWorld();
    world.sponsorPool = { sponsors: new Map(), koenkais: new Map() };
    world.heyas.get("h1")!.koenkaiId = "ghost-koenkai";
    expect(hasViolation(validateWorldIdIntegrity(world), "dangling_ref", "heya.koenkaiId", "ghost-koenkai")).toBe(true);
  });

  it("flags a dangling heya.brandIdentityId", () => {
    const world = makeCleanWorld();
    world.heyas.get("h1")!.brandIdentityId = "ghost-brand";
    expect(hasViolation(validateWorldIdIntegrity(world), "dangling_ref", "heya.brandIdentityId", "ghost-brand")).toBe(true);
  });

  it("flags a closed-heya mergedInto that resolves to nothing, but ignores closed rosters for exclusivity", () => {
    const world = makeCleanWorld();
    const closed: Heya & { closedAtYear: number; mergedInto?: string } = {
      ...makeMockHeya("closed1", { rikishiIds: ["r1"], oyakataId: "o1" }),
      closedAtYear: 2024,
      mergedInto: "ghost-target",
    };
    world.closedHeyas = new Map([["closed1", closed as never]]);
    const violations = validateWorldIdIntegrity(world);
    // r1 is on both the active roster and the closed record — allowed
    expect(hasViolation(violations, "duplicate_id", "heya.rikishiIds", "r1")).toBe(false);
    expect(hasViolation(violations, "dangling_ref", "closedHeyas", "ghost-target")).toBe(true);
  });

  it("flags duplicate almanacSnapshots for the same basho and dangling snapshot rikishiIds", () => {
    const world = makeCleanWorld();
    world.almanacSnapshots = [
      { year: 2025, bashoNumber: 1, yushoWinner: { rikishiId: "ghost" }, promotions: [], demotions: [], retirements: [] },
      { year: 2025, bashoNumber: 1, promotions: [], demotions: [], retirements: [] },
    ] as never;
    const violations = validateWorldIdIntegrity(world);
    expect(hasViolation(violations, "duplicate_id", "almanacSnapshots", "2025-1")).toBe(true);
    expect(hasViolation(violations, "dangling_ref", "almanacSnapshots", "ghost")).toBe(true);
  });
});

describe("assertWorldIdIntegrity", () => {
  it("does not throw on a clean world", () => {
    expect(() => assertWorldIdIntegrity(makeCleanWorld())).not.toThrow();
  });

  it("throws enumerating violations on a dirty world", () => {
    const world = makeCleanWorld();
    world.heyas.get("h1")!.rikishiIds = ["r1", "r1", "ghost"];
    expect(() => assertWorldIdIntegrity(world)).toThrowError(/r1|ghost/);
  });
});
