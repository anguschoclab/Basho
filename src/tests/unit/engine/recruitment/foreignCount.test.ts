import { describe, it, expect } from "vitest";
import { MockFactory } from "../../../helpers/utils/MockFactory";
import {
  getForeignCountInHeya,
  getForeignCountsByHeya,
} from "@/engine/systems/generation/TalentPoolScouting";
import type { WorldState } from "@/engine/types/world";
import type { Id } from "@/engine/types/common";
import type { TalentPoolWorldState } from "@/engine/types/talent";

function makeWorldWithTalentPool(overrides: Partial<WorldState> = {}): WorldState {
  const tp = MockFactory.createTalentPool({});
  return MockFactory.createWorld({ talentPool: tp, ...overrides });
}

function addSignedForeignCandidate(
  tp: TalentPoolWorldState,
  candidateId: string,
  heyaId: string,
  nationality = "Mongolia"
): void {
  const candidate = MockFactory.createCandidate(candidateId as Id, {
    nationality,
    availabilityState: "signed",
    competingSuitors: [
      { heyaId: heyaId as Id, offerType: "standard", interestBand: "high", deadlineWeek: 1 },
    ],
  });
  tp.candidates[candidateId] = candidate;
  // Place in the foreign pool's visible list (or high_school for Japanese)
  const poolKey = nationality === "Japan" ? "high_school" : "foreign";
  tp.pools[poolKey].candidatesVisible.push(candidateId);
}

describe("getForeignCountInHeya", () => {
  it("returns 0 when no talent pool exists", () => {
    const world = MockFactory.createWorld();
    expect(getForeignCountInHeya(world, "any-heya" as Id)).toBe(0);
  });

  it("counts foreign rikishi in the active roster for the target heya", () => {
    const heyaId = "h1" as Id;
    const r1 = MockFactory.createRikishi("r1", { heyaId, nationality: "Mongolia" });
    const r2 = MockFactory.createRikishi("r2", { heyaId, nationality: "Japan" });
    const world = makeWorldWithTalentPool({
      heyas: new Map([[heyaId, MockFactory.createHeya(heyaId, { rikishiIds: ["r1", "r2"] })]]),
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
      ]),
    });
    expect(getForeignCountInHeya(world, heyaId)).toBe(1);
  });

  it("does NOT count Japanese rikishi", () => {
    const heyaId = "h1" as Id;
    const r1 = MockFactory.createRikishi("r1", { heyaId, nationality: "Japan" });
    const r2 = MockFactory.createRikishi("r2", { heyaId, nationality: "Japan" });
    const world = makeWorldWithTalentPool({
      heyas: new Map([[heyaId, MockFactory.createHeya(heyaId, { rikishiIds: ["r1", "r2"] })]]),
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
      ]),
    });
    expect(getForeignCountInHeya(world, heyaId)).toBe(0);
  });

  it("counts signed-but-not-materialized foreign candidates for the target heya", () => {
    const heyaId = "h1" as Id;
    const world = makeWorldWithTalentPool({
      heyas: new Map([[heyaId, MockFactory.createHeya(heyaId)]]),
      rikishi: new Map(),
    });
    if (world.talentPool) {
      addSignedForeignCandidate(world.talentPool, "cand-1", heyaId, "Mongolia");
    }
    expect(getForeignCountInHeya(world, heyaId)).toBe(1);
  });

  it("does NOT count signed foreign candidates for other heyas", () => {
    const heyaA = "hA" as Id;
    const heyaB = "hB" as Id;
    const world = makeWorldWithTalentPool({
      heyas: new Map([
        [heyaA, MockFactory.createHeya(heyaA)],
        [heyaB, MockFactory.createHeya(heyaB)],
      ]),
      rikishi: new Map(),
    });
    if (world.talentPool) {
      addSignedForeignCandidate(world.talentPool, "cand-1", heyaB, "Mongolia");
    }
    expect(getForeignCountInHeya(world, heyaA)).toBe(0);
    expect(getForeignCountInHeya(world, heyaB)).toBe(1);
  });

  it("does NOT count available or in_talks foreign candidates", () => {
    const heyaId = "h1" as Id;
    const world = makeWorldWithTalentPool({
      heyas: new Map([[heyaId, MockFactory.createHeya(heyaId)]]),
      rikishi: new Map(),
    });
    if (world.talentPool) {
      const available = MockFactory.createCandidate("cand-avail" as Id, {
        nationality: "Mongolia",
        availabilityState: "available",
        competingSuitors: [],
      });
      world.talentPool.candidates["cand-avail"] = available;
      world.talentPool.pools.foreign.candidatesVisible.push("cand-avail");

      const inTalks = MockFactory.createCandidate("cand-talks" as Id, {
        nationality: "Mongolia",
        availabilityState: "in_talks",
        competingSuitors: [
          { heyaId, offerType: "standard", interestBand: "high", deadlineWeek: 5 },
        ],
      });
      world.talentPool.candidates["cand-talks"] = inTalks;
      world.talentPool.pools.foreign.candidatesVisible.push("cand-talks");
    }
    expect(getForeignCountInHeya(world, heyaId)).toBe(0);
  });

  it("handles nationality 'Japanese' as Japanese (not foreign)", () => {
    const heyaId = "h1" as Id;
    const r1 = MockFactory.createRikishi("r1", { heyaId, nationality: "Japanese" });
    const world = makeWorldWithTalentPool({
      heyas: new Map([[heyaId, MockFactory.createHeya(heyaId, { rikishiIds: ["r1"] })]]),
      rikishi: new Map([["r1", r1]]),
    });
    expect(getForeignCountInHeya(world, heyaId)).toBe(0);
  });

  it("handles nationality 'Mongolia' as foreign", () => {
    const heyaId = "h1" as Id;
    const r1 = MockFactory.createRikishi("r1", { heyaId, nationality: "Mongolia" });
    const world = makeWorldWithTalentPool({
      heyas: new Map([[heyaId, MockFactory.createHeya(heyaId, { rikishiIds: ["r1"] })]]),
      rikishi: new Map([["r1", r1]]),
    });
    expect(getForeignCountInHeya(world, heyaId)).toBe(1);
  });

  it("handles undefined nationality as Japanese (not foreign)", () => {
    const heyaId = "h1" as Id;
    const r1 = MockFactory.createRikishi("r1", { heyaId });
    delete (r1 as Partial<typeof r1>).nationality;
    const world = makeWorldWithTalentPool({
      heyas: new Map([[heyaId, MockFactory.createHeya(heyaId, { rikishiIds: ["r1"] })]]),
      rikishi: new Map([["r1", r1]]),
    });
    expect(getForeignCountInHeya(world, heyaId)).toBe(0);
  });

  it("returns 0 for a non-existent heyaId", () => {
    const heyaId = "h1" as Id;
    const r1 = MockFactory.createRikishi("r1", { heyaId, nationality: "Mongolia" });
    const world = makeWorldWithTalentPool({
      heyas: new Map([[heyaId, MockFactory.createHeya(heyaId, { rikishiIds: ["r1"] })]]),
      rikishi: new Map([["r1", r1]]),
    });
    expect(getForeignCountInHeya(world, "non-existent" as Id)).toBe(0);
  });

  it("counts both active roster foreign rikishi AND signed foreign candidates", () => {
    const heyaId = "h1" as Id;
    const r1 = MockFactory.createRikishi("r1", { heyaId, nationality: "Mongolia" });
    const r2 = MockFactory.createRikishi("r2", { heyaId, nationality: "USA" });
    const world = makeWorldWithTalentPool({
      heyas: new Map([[heyaId, MockFactory.createHeya(heyaId, { rikishiIds: ["r1", "r2"] })]]),
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
      ]),
    });
    if (world.talentPool) {
      addSignedForeignCandidate(world.talentPool, "cand-1", heyaId, "Brazil");
    }
    expect(getForeignCountInHeya(world, heyaId)).toBe(3);
  });
});

describe("getForeignCountsByHeya", () => {
  it("returns a Map with correct counts for multiple heyas in one pass", () => {
    const hA = "hA" as Id;
    const hB = "hB" as Id;
    const rA = MockFactory.createRikishi("rA", { heyaId: hA, nationality: "Mongolia" });
    const rB1 = MockFactory.createRikishi("rB1", { heyaId: hB, nationality: "USA" });
    const rB2 = MockFactory.createRikishi("rB2", { heyaId: hB, nationality: "Brazil" });
    const world = makeWorldWithTalentPool({
      heyas: new Map([
        [hA, MockFactory.createHeya(hA, { rikishiIds: ["rA"] })],
        [hB, MockFactory.createHeya(hB, { rikishiIds: ["rB1", "rB2"] })],
      ]),
      rikishi: new Map([
        ["rA", rA],
        ["rB1", rB1],
        ["rB2", rB2],
      ]),
    });
    if (world.talentPool) {
      addSignedForeignCandidate(world.talentPool, "cand-A", hA, "Georgia");
    }
    const counts = getForeignCountsByHeya(world);
    expect(counts.get(hA)).toBe(2);
    expect(counts.get(hB)).toBe(2);
  });

  it("includes both active roster foreign rikishi AND signed foreign candidates", () => {
    const heyaId = "h1" as Id;
    const r1 = MockFactory.createRikishi("r1", { heyaId, nationality: "Mongolia" });
    const world = makeWorldWithTalentPool({
      heyas: new Map([[heyaId, MockFactory.createHeya(heyaId, { rikishiIds: ["r1"] })]]),
      rikishi: new Map([["r1", r1]]),
    });
    if (world.talentPool) {
      addSignedForeignCandidate(world.talentPool, "cand-1", heyaId, "Hawaii");
    }
    const counts = getForeignCountsByHeya(world);
    expect(counts.get(heyaId)).toBe(2);
  });

  it("returns empty Map when no talent pool exists", () => {
    const world = MockFactory.createWorld();
    const counts = getForeignCountsByHeya(world);
    expect(counts.size).toBe(0);
  });

  it("does not include heyas with no foreign rikishi", () => {
    const hA = "hA" as Id;
    const hB = "hB" as Id;
    const rA = MockFactory.createRikishi("rA", { heyaId: hA, nationality: "Japan" });
    const world = makeWorldWithTalentPool({
      heyas: new Map([
        [hA, MockFactory.createHeya(hA, { rikishiIds: ["rA"] })],
        [hB, MockFactory.createHeya(hB)],
      ]),
      rikishi: new Map([["rA", rA]]),
    });
    const counts = getForeignCountsByHeya(world);
    expect(counts.has(hA)).toBe(false);
    expect(counts.has(hB)).toBe(false);
  });
});
