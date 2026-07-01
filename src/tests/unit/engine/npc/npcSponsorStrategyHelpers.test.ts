import { describe, it, expect } from "vitest";
import { countSponsors } from "@/engine/npcSponsorStrategyHelpers";
import { makeMockWorld } from "../utils";
import type { Sponsor, SponsorPool } from "@/engine/types/sponsors";

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
