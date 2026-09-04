/**
 * SponsorContractService.hints.test.ts
 *
 * Test-first validation for the optional `hints` param on renewSponsorContract.
 * These tests were written BEFORE the production change and confirmed to FAIL
 * against the unmodified code (no `hints` param existed).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { renewSponsorContract } from "@/engine/systems/economy/SponsorContractService";
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

const ROOT = join(__dirname, "../../../../..");
const SRC = join(ROOT, "src");

function readFile(rel: string): string {
  return readFileSync(join(SRC, rel), "utf-8");
}

describe("renewSponsorContract — hints optimization", () => {
  it("produces identical impact with hints vs without hints", () => {
    const world = makeSponsorWorld(3);
    const sponsor = world.sponsorPool!.sponsors.get("s1")!;
    const relIndex = sponsor.relationships.findIndex((r) => r.relId === "rel1");
    const impactNoHints = renewSponsorContract(world, "rel1", "s1");
    const impactWithHints = renewSponsorContract(world, "rel1", "s1", {
      sponsor,
      relIndex,
    });
    const noHintsUpdate = impactNoHints.entities?.sponsorUpdates?.get("s1");
    const hintsUpdate = impactWithHints.entities?.sponsorUpdates?.get("s1");
    expect(hintsUpdate).toEqual(noHintsUpdate);
  });

  it("uses provided sponsor hint instead of pool lookup", () => {
    const world = makeSponsorWorld(3);
    const sponsor = world.sponsorPool!.sponsors.get("s1")!;
    const relIndex = sponsor.relationships.findIndex((r) => r.relId === "rel1");
    // Pass a sponsorId that does NOT exist in the pool — if hints work, it still succeeds
    const impact = renewSponsorContract(world, "rel1", "nonexistent-sponsor", {
      sponsor,
      relIndex,
    });
    const update = impact.entities?.sponsorUpdates?.get("nonexistent-sponsor");
    expect(update).toBeDefined();
    expect((update as any).loyalty).toBe(53); // 50 + 3
  });

  it("falls back to findIndex when relIndex hint is out of bounds", () => {
    const world = makeSponsorWorld(3);
    const sponsor = world.sponsorPool!.sponsors.get("s1")!;
    // Pass relIndex=999 (out of bounds) — should fall back to findIndex
    const impact = renewSponsorContract(world, "rel1", "s1", {
      sponsor,
      relIndex: 999,
    });
    const update = impact.entities?.sponsorUpdates?.get("s1");
    expect(update).toBeDefined();
    const updatedRel = (update as any).relationships.find(
      (r: any) => r.relId === "rel1"
    );
    expect(updatedRel?.strength).toBe(4); // 3 + 1, proving correct rel was found
  });

  it("falls back to findIndex when relIndex hint relId does not match relationshipId", () => {
    // Setup sponsor with 2 relationships
    const sponsor = makeSponsor(3);
    sponsor.relationships.push({
      ...(sponsor.relationships[0] as any),
      relId: "rel2",
    } as any);
    const world = makeMockWorld({
      sponsorPool: {
        sponsors: new Map([["s1", sponsor]]),
        koenkais: new Map(),
      } as SponsorPool,
      week: 10,
    });
    // Pass relIndex=1 (points to "rel2") but request "rel1" — should fall back
    const impact = renewSponsorContract(world, "rel1", "s1", {
      sponsor,
      relIndex: 1,
    });
    const update = impact.entities?.sponsorUpdates?.get("s1");
    expect(update).toBeDefined();
    const updatedRel1 = (update as any).relationships.find(
      (r: any) => r.relId === "rel1"
    );
    expect(updatedRel1?.strength).toBe(4); // "rel1" was renewed, not "rel2"
  });

  it("without hints, performs Map.get + findIndex as before (regression guard)", () => {
    const world = makeSponsorWorld(3);
    const impact = renewSponsorContract(world, "rel1", "s1");
    const update = impact.entities?.sponsorUpdates?.get("s1");
    expect(update).toBeDefined();
    expect((update as any).loyalty).toBe(53);
  });
});

describe("renewSponsorContract — dead code removal", () => {
  it("uiActions.ts no longer exports renewSponsorContract", () => {
    const content = readFile("presenters/uiActions.ts");
    expect(content).not.toContain("export function renewSponsorContract");
    // setHeyaDietAction must still be there
    expect(content).toContain("export function setHeyaDietAction");
  });
});

describe("phase05_monthly_boundary — hints integration", () => {
  it("passes sponsor hints to renewSponsorContract", () => {
    const phase = readFile("engine/tick/phases/phase05_monthly_boundary.ts");
    // The indexed loop must pass { sponsor, relIndex: i } hints
    expect(phase).toContain("relIndex");
    expect(phase).toMatch(/\{\s*sponsor,\s*relIndex:\s*i,?\s*\}/);
  });
});
