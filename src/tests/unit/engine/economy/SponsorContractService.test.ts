 
import { describe, it, expect } from "vitest";
import { renewSponsorContract } from "@/engine/systems/economy/SponsorContractService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld } from "../utils";
import type { WorldState } from "@/engine/types/world";
import type { Sponsor, SponsorRelationship, SponsorPool } from "@/engine/types/sponsors";

function makeSponsor(strength: 1 | 2 | 3 | 4 | 5 = 3): Sponsor {
  const rel: SponsorRelationship = {
    relId: "rel1",
    sponsorId: "s1",
    targetType: "heya",
    targetId: "h1",
    role: "primary",
    strength,
    startedAtTick: 48,
    endsAtTick: 100,
  } as unknown as SponsorRelationship;
  return {
    sponsorId: "s1",
    displayName: "Test Sponsor",
    category: "regional",
    tier: "silver",
    prestigeAffinity: 50,
    loyalty: 50,
    scandalTolerance: 50,
    riskAppetite: 50,
    visibilityPreference: 1,
    satisfaction: 50,
    createdAtTick: 0,
    lastSeenTick: 0,
    originRegionId: "r1",
    industryTag: "tech",
    toneTag: "classic",
    active: true,
    relationships: [rel],
  } as unknown as Sponsor;
}

function makeSponsorWorld(strength: 1 | 2 | 3 | 4 | 5 = 3): WorldState {
  const sponsor = makeSponsor(strength);
  const pool: SponsorPool = {
    sponsors: new Map([["s1", sponsor]]),
    koenkais: new Map(),
  };
  return makeMockWorld({
    sponsorPool: pool,
    week: 10,
  });
}

describe("Bug B: renewSponsorContract uses rel.strength (not rel.power)", () => {
  it("renews contract with strength 3 → strength 4", () => {
    const world = makeSponsorWorld(3);
    const impact = renewSponsorContract(world, "rel1", "s1");
    const nextWorld = resolveImpacts(world, [impact]);
    const updatedSponsor = nextWorld.sponsorPool?.sponsors.get("s1");
    const updatedRel = updatedSponsor?.relationships.find((r) => r.relId === "rel1");
    expect(updatedRel?.strength).toBe(4);
  });

  it("renews contract with strength 5 → stays at 5 (capped)", () => {
    const world = makeSponsorWorld(5);
    const impact = renewSponsorContract(world, "rel1", "s1");
    const nextWorld = resolveImpacts(world, [impact]);
    const updatedSponsor = nextWorld.sponsorPool?.sponsors.get("s1");
    const updatedRel = updatedSponsor?.relationships.find((r) => r.relId === "rel1");
    expect(updatedRel?.strength).toBe(5);
  });

  it("does not produce NaN strength", () => {
    const world = makeSponsorWorld(3);
    const impact = renewSponsorContract(world, "rel1", "s1");
    const nextWorld = resolveImpacts(world, [impact]);
    const updatedSponsor = nextWorld.sponsorPool?.sponsors.get("s1");
    const updatedRel = updatedSponsor?.relationships.find((r) => r.relId === "rel1");
    expect(updatedRel?.strength).not.toBeNaN();
    expect(typeof updatedRel?.strength).toBe("number");
  });

  it("extends endsAtTick by 52 weeks", () => {
    const world = makeSponsorWorld(3);
    const impact = renewSponsorContract(world, "rel1", "s1");
    const nextWorld = resolveImpacts(world, [impact]);
    const updatedSponsor = nextWorld.sponsorPool?.sponsors.get("s1");
    const updatedRel = updatedSponsor?.relationships.find((r) => r.relId === "rel1");
    expect(updatedRel?.endsAtTick).toBe(62); // week 10 + 52
  });
});
