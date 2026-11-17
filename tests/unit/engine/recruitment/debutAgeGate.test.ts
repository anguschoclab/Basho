import { describe, it, expect } from "vitest";
import { offerCandidate } from "@/engine/generation/TalentPoolOffers";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { Id } from "@/engine/types/common";

/**
 * JSA recruit eligibility (post-2023): standard recruits must be under 23 at
 * the new-apprentice exam; the under-25 exception requires a qualified
 * amateur/sports background (tsukedashi-class candidates — covered by the
 * tsukedashi work). Until that flag exists, debut age is hard-capped at <23.
 */

function makeWorldWithCandidate(candidateId: string, birthYear: number) {
  const world = MockFactory.createWorld({ year: 2026 });
  const tp = MockFactory.createTalentPool({});
  const cand = MockFactory.createCandidate(candidateId as Id, {
    nationality: "Japan",
    birthYear,
    availabilityState: "available",
    competingSuitors: [],
  });
  tp.candidates[candidateId] = cand;
  tp.pools.high_school.candidatesVisible.push(candidateId);
  world.talentPool = tp;
  world.heyas.set("h1" as Id, MockFactory.createHeya("h1" as Id));
  return world;
}

describe("debut age gate — JSA new-apprentice eligibility", () => {
  it("rejects a candidate who is 23 or older at signing", () => {
    const world = makeWorldWithCandidate("old-cand", 2026 - 25); // age 25
    const res = offerCandidate(world, "old-cand" as Id, "h1" as Id, "standard", "high");
    expect(res.ok).toBe(false);
  });

  it("rejects a candidate who is exactly 23", () => {
    const world = makeWorldWithCandidate("edge-cand", 2026 - 23); // age 23
    const res = offerCandidate(world, "edge-cand" as Id, "h1" as Id, "standard", "high");
    expect(res.ok).toBe(false);
  });

  it("allows a candidate under 23", () => {
    const world = makeWorldWithCandidate("young-cand", 2026 - 18); // age 18
    const res = offerCandidate(world, "young-cand" as Id, "h1" as Id, "standard", "high");
    expect(res.ok).toBe(true);
  });

  it("allows a 22-year-old (the oldest standard-eligible age)", () => {
    const world = makeWorldWithCandidate("age22-cand", 2026 - 22); // age 22
    const res = offerCandidate(world, "age22-cand" as Id, "h1" as Id, "standard", "high");
    expect(res.ok).toBe(true);
  });
});
