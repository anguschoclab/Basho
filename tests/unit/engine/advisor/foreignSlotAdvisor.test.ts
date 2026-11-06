/**
 * V17-D03 — the advisor's "foreign standout available" recommendation must
 * use the canonical foreign-slot count (`getForeignCountsByHeya`), which
 * includes signed-but-not-yet-materialized candidates. A roster-only count
 * recommends pursuing a foreign star while the player's slot is already
 * consumed by a pending signing.
 */
import { describe, it, expect } from "vitest";
import { generateRecommendations } from "@/engine/npc/advisor/AdvisorService";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { TalentCandidate, TalentPoolWorldState } from "@/engine/types/talent";

function makeCandidate(overrides: Partial<TalentCandidate>): TalentCandidate {
  return {
    candidateId: "c-x",
    personId: "p-x",
    name: "Foreign Star",
    birthYear: 2005,
    originRegion: "Mongolia",
    nationality: "Mongolian",
    dualCitizen: false,
    tags: [],
    availabilityState: "available",
    competingSuitors: [],
    isEmergentProdigy: true,
    ...overrides,
  } as unknown as TalentCandidate;
}

function makePool(candidates: TalentCandidate[]): TalentPoolWorldState {
  return {
    candidates: Object.fromEntries(candidates.map((c) => [c.candidateId, c])),
    pools: {
      foreign: { candidatesVisible: candidates.map((c) => c.candidateId) },
    },
  } as unknown as TalentPoolWorldState;
}

describe("advisor foreign-slot check uses canonical count (V17-D03)", () => {
  it("does not recommend a foreign star when a signed-pending foreigner occupies the slot", () => {
    const heya = MockFactory.createHeya("h1", { rikishiIds: [] });
    const world = MockFactory.createWorld({
      heyas: new Map([["h1", heya]]),
      playerHeyaId: "h1",
      rikishi: new Map(),
    });
    world.talentPool = makePool([
      // Already signed by the player — occupies the foreign slot even
      // though no roster rikishi is foreign yet.
      makeCandidate({
        candidateId: "c-signed",
        personId: "p-signed",
        availabilityState: "signed",
        competingSuitors: [
          { heyaId: "h1", interestBand: "high", offerType: "standard", deadlineWeek: 12 },
        ],
        isEmergentProdigy: false,
      }),
      // A visible standout that would trigger the rec if the slot were open.
      makeCandidate({ candidateId: "c-star", personId: "p-star" }),
    ]);

    const recs = generateRecommendations(world, "h1");
    expect(recs.some((r) => r.id === "contested-foreign-recruit")).toBe(false);
  });

  it("recommends a foreign star when the slot is truly open", () => {
    const heya = MockFactory.createHeya("h1", { rikishiIds: [] });
    const world = MockFactory.createWorld({
      heyas: new Map([["h1", heya]]),
      playerHeyaId: "h1",
      rikishi: new Map(),
    });
    world.talentPool = makePool([makeCandidate({ candidateId: "c-star", personId: "p-star" })]);

    const recs = generateRecommendations(world, "h1");
    expect(recs.some((r) => r.id === "contested-foreign-recruit")).toBe(true);
  });
});
