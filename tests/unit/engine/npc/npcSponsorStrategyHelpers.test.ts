import { describe, it, expect } from "vitest";
import {
  countSponsors,
  calculateRunwayMonths,
  filterEligibleSponsors,
  createSponsorRelationship,
  addSponsorRelationship,
  emitSponsorRecruitmentEvent,
  evaluateSponsorRecruitmentCommon,
} from "@/engine/npc/strategy/npcSponsorStrategyHelpers";
import { makeMockWorld, makeMockHeya } from "@tests/unit/engine/utils";
import type { Sponsor, SponsorPool, Koenkai, SponsorRelationship } from "@/engine/types/sponsors";
import type { Heya } from "@/engine/types/heya";
import type { Oyakata } from "@/engine/types/oyakata";
import type { WorldState } from "@/engine/types/world";

function makeSponsor(id: string, overrides: Partial<Sponsor> = {}): Sponsor {
  return {
    sponsorId: id,
    displayName: `Sponsor ${id}`,
    category: "local_business",
    tier: "T2",
    originRegionId: "tokyo",
    industryTag: "food",
    toneTag: "local",
    prestigeAffinity: 50,
    loyalty: 50,
    scandalTolerance: 50,
    riskAppetite: 50,
    visibilityPreference: 1,
    active: true,
    satisfaction: 50,
    createdAtTick: 0,
    lastSeenTick: 0,
    relationships: [],
    ...overrides,
  };
}

function worldWithSponsors(
  sponsors: Sponsor[],
  koenkais: Koenkai[] = [],
  overrides: Partial<WorldState> = {}
): WorldState {
  return makeMockWorld({
    sponsorPool: {
      sponsors: new Map(sponsors.map((s) => [s.sponsorId, s])),
      koenkais: new Map(koenkais.map((k) => [k.koenkaiId, k])),
    },
    ...overrides,
  });
}

function pool(impact: { worldFields?: Record<string, unknown> }): SponsorPool | undefined {
  return impact.worldFields?.sponsorPool as SponsorPool | undefined;
}

describe("countSponsors", () => {
  it("should return 0 if sponsorPool is missing", () => {
    const world = makeMockWorld();
    // makeMockWorld doesn't initialize sponsorPool by default based on what I saw in utils.ts
    // but let's be sure.
    delete (world as any).sponsorPool;
    expect(countSponsors(world, "heya-1")).toBe(0);
  });

  it("should return 0 if sponsorPool.sponsors is missing", () => {
    const world = makeMockWorld({
      sponsorPool: {} as SponsorPool,
    });
    expect(countSponsors(world, "heya-1")).toBe(0);
  });

  it("should return 0 if there are no sponsors", () => {
    const world = makeMockWorld({
      sponsorPool: {
        sponsors: new Map(),
        koenkais: new Map(),
      },
    });
    expect(countSponsors(world, "heya-1")).toBe(0);
  });

  it("should count active sponsors for the given heyaId", () => {
    const heyaId = "heya-1";
    const sponsor1: Partial<Sponsor> = {
      sponsorId: "s1",
      active: true,
      relationships: [
        {
          relId: "r1",
          sponsorId: "s1",
          targetType: "heya",
          targetId: heyaId,
          role: "benefactor",
          strength: 3,
          startedAtTick: 1,
        },
      ],
    };
    const sponsor2: Partial<Sponsor> = {
      sponsorId: "s2",
      active: true,
      relationships: [
        {
          relId: "r2",
          sponsorId: "s2",
          targetType: "heya",
          targetId: heyaId,
          role: "benefactor",
          strength: 1,
          startedAtTick: 1,
        },
      ],
    };

    const sponsors = new Map<string, Sponsor>();
    sponsors.set("s1", sponsor1 as Sponsor);
    sponsors.set("s2", sponsor2 as Sponsor);

    const world = makeMockWorld({
      sponsorPool: {
        sponsors,
        koenkais: new Map(),
      },
    });

    expect(countSponsors(world, heyaId)).toBe(2);
  });

  it("should ignore inactive sponsors", () => {
    const heyaId = "heya-1";
    const sponsor1: Partial<Sponsor> = {
      sponsorId: "s1",
      active: false,
      relationships: [
        {
          relId: "r1",
          sponsorId: "s1",
          targetType: "heya",
          targetId: heyaId,
          role: "benefactor",
          strength: 3,
          startedAtTick: 1,
        },
      ],
    };

    const sponsors = new Map<string, Sponsor>();
    sponsors.set("s1", sponsor1 as Sponsor);

    const world = makeMockWorld({
      sponsorPool: {
        sponsors,
        koenkais: new Map(),
      },
    });

    expect(countSponsors(world, heyaId)).toBe(0);
  });

  it("should ignore sponsors for a different heya", () => {
    const heyaId = "heya-1";
    const otherHeyaId = "heya-2";
    const sponsor1: Partial<Sponsor> = {
      sponsorId: "s1",
      active: true,
      relationships: [
        {
          relId: "r1",
          sponsorId: "s1",
          targetType: "heya",
          targetId: otherHeyaId,
          role: "benefactor",
          strength: 3,
          startedAtTick: 1,
        },
      ],
    };

    const sponsors = new Map<string, Sponsor>();
    sponsors.set("s1", sponsor1 as Sponsor);

    const world = makeMockWorld({
      sponsorPool: {
        sponsors,
        koenkais: new Map(),
      },
    });

    expect(countSponsors(world, heyaId)).toBe(0);
  });

  it("should handle sponsors with no relationships", () => {
    const heyaId = "heya-1";
    const sponsor1: Partial<Sponsor> = {
      sponsorId: "s1",
      active: true,
      relationships: [],
    };
    const sponsor2: Partial<Sponsor> = {
      sponsorId: "s2",
      active: true,
      relationships: undefined,
    };

    const sponsors = new Map<string, Sponsor>();
    sponsors.set("s1", sponsor1 as Sponsor);
    sponsors.set("s2", sponsor2 as Sponsor);

    const world = makeMockWorld({
      sponsorPool: {
        sponsors,
        koenkais: new Map(),
      },
    });

    expect(countSponsors(world, heyaId)).toBe(0);
  });
});

describe("calculateRunwayMonths", () => {
  it("computes funds divided by monthly burn (rikishi + facilities)", () => {
    // burn = 2 * 150_000 + avg(60,30,60)=50 * 9_000 = 300_000 + 450_000 = 750_000
    const heya = makeMockHeya("h1", {
      funds: 3_900_000,
      rikishiIds: ["r1", "r2"],
      facilities: { training: 60, recovery: 30, nutrition: 60 },
    });
    expect(calculateRunwayMonths(heya)).toBeCloseTo(5.2);
  });

  it("returns 0 when monthly burn is zero (empty roster, zero facilities)", () => {
    const heya = makeMockHeya("h1", {
      funds: 5_000_000,
      rikishiIds: [],
      facilities: { training: 0, recovery: 0, nutrition: 0 },
    });
    expect(calculateRunwayMonths(heya)).toBe(0);
  });

  it("returns 0 when the heya has no funds", () => {
    const heya = makeMockHeya("h1", {
      funds: 0,
      rikishiIds: ["r1"],
      facilities: { training: 50, recovery: 50, nutrition: 50 },
    });
    expect(calculateRunwayMonths(heya)).toBe(0);
  });
});

describe("filterEligibleSponsors", () => {
  it("returns an empty array when the sponsor pool is missing", () => {
    expect(filterEligibleSponsors(makeMockWorld(), "h1")).toEqual([]);
  });

  it("excludes inactive sponsors", () => {
    const world = worldWithSponsors([
      makeSponsor("s1", { active: false }),
      makeSponsor("s2"),
    ]);
    const eligible = filterEligibleSponsors(world, "h1");
    expect(eligible.map((s) => s.sponsorId)).toEqual(["s2"]);
  });

  it("excludes sponsors already related to the heya", () => {
    const world = worldWithSponsors([
      makeSponsor("s1", {
        relationships: [
          {
            relId: "r1",
            sponsorId: "s1",
            targetType: "heya",
            targetId: "h1",
            role: "benefactor",
            strength: 3,
            startedAtTick: 1,
          },
        ],
      }),
      makeSponsor("s2"),
    ]);
    const eligible = filterEligibleSponsors(world, "h1");
    expect(eligible.map((s) => s.sponsorId)).toEqual(["s2"]);
  });

  it("honors excludeTiers", () => {
    const world = worldWithSponsors([
      makeSponsor("s1", { tier: "T0" }),
      makeSponsor("s2", { tier: "T2" }),
      makeSponsor("s3", { tier: "T5" }),
    ]);
    const eligible = filterEligibleSponsors(world, "h1", { excludeTiers: ["T0", "T5"] });
    expect(eligible.map((s) => s.sponsorId)).toEqual(["s2"]);
  });

  it("honors includeTiers", () => {
    const world = worldWithSponsors([
      makeSponsor("s1", { tier: "T0" }),
      makeSponsor("s2", { tier: "T2" }),
      makeSponsor("s3", { tier: "T5" }),
    ]);
    const eligible = filterEligibleSponsors(world, "h1", { includeTiers: ["T2", "T5"] });
    expect(eligible.map((s) => s.sponsorId)).toEqual(["s2", "s3"]);
  });

  it("sorts by prestigeAffinity desc, then sponsorId for determinism", () => {
    const world = worldWithSponsors([
      makeSponsor("s-b", { prestigeAffinity: 50 }),
      makeSponsor("s-a", { prestigeAffinity: 50 }),
      makeSponsor("s-top", { prestigeAffinity: 90 }),
    ]);
    const eligible = filterEligibleSponsors(world, "h1");
    expect(eligible.map((s) => s.sponsorId)).toEqual(["s-top", "s-a", "s-b"]);
  });
});

describe("createSponsorRelationship", () => {
  it("returns a benefactor relationship targeting the heya by default", () => {
    const world = makeMockWorld({ week: 7 });
    const rel = createSponsorRelationship(world, "s1", "h1", 3);
    expect(rel.sponsorId).toBe("s1");
    expect(rel.targetType).toBe("heya");
    expect(rel.targetId).toBe("h1");
    expect(rel.role).toBe("benefactor");
    expect(rel.strength).toBe(3);
    expect(rel.startedAtTick).toBe(7);
    expect(rel.relId).toMatch(/^SR-/);
  });

  it("is deterministic for the same seed and label", () => {
    const world = makeMockWorld({ seed: "seed-x", week: 7 });
    const a = createSponsorRelationship(world, "s1", "h1", 3);
    const b = createSponsorRelationship(world, "s1", "h1", 3);
    expect(a.relId).toBe(b.relId);
  });

  it("produces different relIds for different labels", () => {
    const world = makeMockWorld({ seed: "seed-x", week: 7 });
    const a = createSponsorRelationship(world, "s1", "h1", 3);
    const b = createSponsorRelationship(world, "s2", "h1", 3);
    expect(a.relId).not.toBe(b.relId);
  });

  it("honors a non-default role", () => {
    const world = makeMockWorld();
    const rel = createSponsorRelationship(world, "s1", "h1", 2, "koenkai_member");
    expect(rel.role).toBe("koenkai_member");
  });
});

describe("addSponsorRelationship", () => {
  const rel = (relId = "SR-1"): SponsorRelationship => ({
    relId,
    sponsorId: "s1",
    targetType: "heya",
    targetId: "h1",
    role: "benefactor",
    strength: 3,
    startedAtTick: 1,
  });

  it("appends the relationship to the sponsor without mutating the original", () => {
    const sponsor = makeSponsor("s1");
    const world = worldWithSponsors([sponsor]);
    const impact = addSponsorRelationship(world, "s1", rel());

    const updated = pool(impact)?.sponsors.get("s1");
    expect(updated?.relationships).toHaveLength(1);
    expect(updated?.relationships[0].relId).toBe("SR-1");
    // Original untouched
    expect(sponsor.relationships).toHaveLength(0);
  });

  it("mirrors heya-targeted relationships into koenkai.members", () => {
    const heya = makeMockHeya("h1", { koenkaiId: "kk1" });
    const koenkai: Koenkai = {
      koenkaiId: "kk1",
      heyaId: "h1",
      strengthBand: "moderate",
      members: [],
      createdAtTick: 0,
      lastChangedTick: 0,
    };
    const world = worldWithSponsors([makeSponsor("s1")], [koenkai], {
      week: 12,
      heyas: new Map([["h1", heya]]),
    });
    const impact = addSponsorRelationship(world, "s1", rel());

    const updated = pool(impact)?.koenkais.get("kk1");
    expect(updated?.members.map((m) => m.relId)).toEqual(["SR-1"]);
    expect(updated?.lastChangedTick).toBe(12);
  });

  it("does not duplicate a member already in the koenkai", () => {
    const heya = makeMockHeya("h1", { koenkaiId: "kk1" });
    const koenkai: Koenkai = {
      koenkaiId: "kk1",
      heyaId: "h1",
      strengthBand: "moderate",
      members: [rel()],
      createdAtTick: 0,
      lastChangedTick: 0,
    };
    const world = worldWithSponsors([makeSponsor("s1")], [koenkai], {
      heyas: new Map([["h1", heya]]),
    });
    const impact = addSponsorRelationship(world, "s1", rel());

    expect(pool(impact)?.koenkais.get("kk1")?.members).toHaveLength(1);
  });

  it("does not mirror non-heya relationships", () => {
    const heya = makeMockHeya("h1", { koenkaiId: "kk1" });
    const koenkai: Koenkai = {
      koenkaiId: "kk1",
      heyaId: "h1",
      strengthBand: "moderate",
      members: [],
      createdAtTick: 0,
      lastChangedTick: 0,
    };
    const world = worldWithSponsors([makeSponsor("s1")], [koenkai], {
      heyas: new Map([["h1", heya]]),
    });
    const leagueRel: SponsorRelationship = { ...rel("SR-9"), targetType: "league", targetId: "jsa" };
    const impact = addSponsorRelationship(world, "s1", leagueRel);

    expect(pool(impact)?.koenkais.get("kk1")?.members).toHaveLength(0);
  });

  it("returns an empty impact when the sponsor is missing", () => {
    const world = worldWithSponsors([makeSponsor("s1")]);
    const impact = addSponsorRelationship(world, "ghost", rel());
    expect(impact.worldFields?.sponsorPool).toBeUndefined();
  });

  it("returns an empty impact when the sponsor pool is missing", () => {
    const impact = addSponsorRelationship(makeMockWorld(), "s1", rel());
    expect(impact.worldFields?.sponsorPool).toBeUndefined();
  });
});

describe("emitSponsorRecruitmentEvent", () => {
  it("emits an NPC_MANAGER_DECISION narrative event for the heya", () => {
    const impact = emitSponsorRecruitmentEvent("h1", "traditionalist", "Sponsor s1", "T2", "reason");
    const ev = (impact.events ?? [])[0];
    expect(ev?.type).toBe("NPC_MANAGER_DECISION");
    expect(ev?.category).toBe("narrative");
    expect(ev?.heyaId).toBe("h1");
    const data = ev?.data as { action?: string; sponsor?: string; tier?: string; reasoning?: string };
    expect(data.action).toBe("sponsor_recruited");
    expect(data.sponsor).toBe("Sponsor s1");
    expect(data.tier).toBe("T2");
    expect(data.reasoning).toBe("reason");
  });

  it.each([
    ["T0", "minor"],
    ["T3", "minor"],
    ["T4", "notable"],
    ["T5", "notable"],
  ])("marks tier %s as %s importance", (tier, importance) => {
    const impact = emitSponsorRecruitmentEvent("h1", "traditionalist", "X", tier, "r");
    expect((impact.events ?? [])[0]?.importance).toBe(importance);
  });
});

describe("evaluateSponsorRecruitmentCommon", () => {
  const oyakata = { id: "oy1", archetype: "traditionalist" } as Oyakata;
  const config = {
    runwayThreshold: 6,
    recruitmentThreshold: 2,
    relationshipStrength: 3 as const,
  };

  function heyaWithFunds(funds: number): Heya {
    return makeMockHeya("h1", {
      funds,
      rikishiIds: ["r1"],
      facilities: { training: 50, recovery: 50, nutrition: 50 },
    });
  }

  it("returns an empty impact when the sponsor pool is missing", () => {
    const impact = evaluateSponsorRecruitmentCommon(makeMockWorld(), heyaWithFunds(50_000_000), oyakata, config);
    expect(impact.worldFields?.sponsorPool).toBeUndefined();
    expect(impact.events ?? []).toHaveLength(0);
  });

  it("does nothing when runway is below the threshold", () => {
    const world = worldWithSponsors([makeSponsor("s1")]);
    const impact = evaluateSponsorRecruitmentCommon(world, heyaWithFunds(100), oyakata, config);
    expect(impact.worldFields?.sponsorPool).toBeUndefined();
    expect(impact.events ?? []).toHaveLength(0);
  });

  it("does nothing when the heya already has enough sponsors", () => {
    const related = makeSponsor("s1", {
      relationships: [
        { relId: "r1", sponsorId: "s1", targetType: "heya", targetId: "h1", role: "benefactor", strength: 3, startedAtTick: 1 },
        { relId: "r2", sponsorId: "s1", targetType: "heya", targetId: "h1", role: "benefactor", strength: 2, startedAtTick: 1 },
      ],
    });
    const s2 = makeSponsor("s2", {
      relationships: [
        { relId: "r3", sponsorId: "s2", targetType: "heya", targetId: "h1", role: "benefactor", strength: 1, startedAtTick: 1 },
      ],
    });
    const world = worldWithSponsors([related, s2]); // countSponsors = 2 >= threshold 2
    const impact = evaluateSponsorRecruitmentCommon(world, heyaWithFunds(50_000_000), oyakata, config);
    expect(impact.worldFields?.sponsorPool).toBeUndefined();
  });

  it("does nothing when no sponsors are eligible", () => {
    const world = worldWithSponsors([makeSponsor("s1", { active: false })]);
    const impact = evaluateSponsorRecruitmentCommon(world, heyaWithFunds(50_000_000), oyakata, config);
    expect(impact.worldFields?.sponsorPool).toBeUndefined();
    expect(impact.events ?? []).toHaveLength(0);
  });

  it("recruits the highest-prestigeAffinity eligible sponsor and emits the event", () => {
    const heya = heyaWithFunds(50_000_000);
    const world = worldWithSponsors(
      [makeSponsor("s-low", { prestigeAffinity: 10 }), makeSponsor("s-high", { prestigeAffinity: 90 })],
      [],
      { heyas: new Map([["h1", heya]]) }
    );
    const impact = evaluateSponsorRecruitmentCommon(world, heya, oyakata, {
      ...config,
      getReasoning: () => "Custom reasoning",
    });

    const updated = pool(impact)?.sponsors.get("s-high");
    expect(updated?.relationships).toHaveLength(1);
    expect(updated?.relationships[0].targetId).toBe("h1");
    expect(updated?.relationships[0].strength).toBe(3);
    expect(pool(impact)?.sponsors.get("s-low")?.relationships).toHaveLength(0);

    const ev = (impact.events ?? []).find((e) => e.type === "NPC_MANAGER_DECISION");
    expect(ev).toBeDefined();
    expect(ev?.heyaId).toBe("h1");
    const data = ev?.data as { sponsor?: string; reasoning?: string };
    expect(data.sponsor).toBe("Sponsor s-high");
    expect(data.reasoning).toBe("Custom reasoning");
  });

  it("falls back to the default reasoning when getReasoning is absent", () => {
    const heya = heyaWithFunds(50_000_000);
    const world = worldWithSponsors([makeSponsor("s1")], [], {
      heyas: new Map([["h1", heya]]),
    });
    const impact = evaluateSponsorRecruitmentCommon(world, heya, oyakata, config);
    const ev = (impact.events ?? []).find((e) => e.type === "NPC_MANAGER_DECISION");
    expect((ev?.data as { reasoning?: string })?.reasoning).toBe("Standard sponsor recruitment");
  });
});
