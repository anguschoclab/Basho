import { describe, it, expect } from "vitest";
import { resolveCandidateSuitor } from "@/engine/generation/TalentPoolOffers";
import { makeMockWorld, makeMockHeya } from "@tests/unit/engine/utils";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { TalentCandidate } from "@/engine/types/talent";
import type { WorldState } from "@/engine/types/world";

type Suitor = { heyaId: string; interestBand: string; offerType: string; deadlineWeek: number };

function inTalksCandidate(suitors: Suitor[]): TalentCandidate {
  return {
    candidateId: "c1",
    personId: "c1",
    name: "Test Prospect",
    originRegion: "Japan",
    nationality: "Japan",
    visibilityBand: "public",
    reputationSeed: 60,
    tags: [],
    combatProfile: { archetype: "hybrid" },
    availabilityState: "in_talks",
    competingSuitors: suitors,
    archetype: "hybrid",
    heightPotentialCm: 180,
    weightPotentialKg: 100,
    talentSeed: 50,
    temperament: { discipline: 50, volatility: 50 },
  } as unknown as TalentCandidate;
}

function worldWith(opts: {
  week: number;
  strongRep?: number;
  weakRep?: number;
  strongDorm?: boolean;
  scoutSkill?: number;
}): WorldState {
  const strong = makeMockHeya("strong", {
    reputation: opts.strongRep ?? 50,
    infrastructure: opts.strongDorm
      ? { dormitory: { level: 1, status: "active" } }
      : {},
  });
  const weak = makeMockHeya("weak", { reputation: opts.weakRep ?? 50 });
  const staff = new Map();
  if (opts.scoutSkill != null) {
    const scout = MockFactory.createStaff("scout-1", {
      heyaId: "strong",
      role: "scout",
      skill: opts.scoutSkill,
    });
    staff.set(scout.id, scout);
  }
  return makeMockWorld({
    heyas: new Map([
      ["strong", strong],
      ["weak", weak],
    ]),
    staff,
    week: opts.week,
  });
}

const SUITORS: Suitor[] = [
  { heyaId: "strong", interestBand: "low", offerType: "standard", deadlineWeek: 99 },
  { heyaId: "weak", interestBand: "all_in", offerType: "aggressive", deadlineWeek: 99 },
];

describe("resolveCandidateSuitor — P4 sign-chance resolution", () => {
  it("signs the only eligible suitor", () => {
    const world = worldWith({ week: 3 });
    const result = resolveCandidateSuitor(world, inTalksCandidate([SUITORS[0]]));
    expect(result.signed).toBe(true);
    expect(result.candidate.competingSuitors[0]?.heyaId).toBe("strong");
  });

  it("is deterministic for identical world state", () => {
    const c = inTalksCandidate(SUITORS);
    const a = resolveCandidateSuitor(worldWith({ week: 5 }), c);
    const b = resolveCandidateSuitor(worldWith({ week: 5 }), c);
    expect(a.candidate.competingSuitors[0]?.heyaId).toBe(
      b.candidate.competingSuitors[0]?.heyaId
    );
  });

  it("prestige + scout negotiation + dormitory outweigh a louder rival over weeks", () => {
    // Equal field, but `strong` carries every structural edge.
    const suitors: Suitor[] = [
      { heyaId: "strong", interestBand: "high", offerType: "standard", deadlineWeek: 99 },
      { heyaId: "weak", interestBand: "low", offerType: "standard", deadlineWeek: 99 },
    ];
    let strongWins = 0;
    const weeks = 24;
    for (let week = 0; week < weeks; week++) {
      const world = worldWith({ week, strongRep: 95, weakRep: 20, strongDorm: true, scoutSkill: 10 });
      const result = resolveCandidateSuitor(world, inTalksCandidate(suitors));
      if (result.candidate.competingSuitors[0]?.heyaId === "strong") strongWins++;
    }
    expect(strongWins).toBeGreaterThan(weeks * 0.6);
  });

  it("returns the candidate to market when no suitor can legally sign", () => {
    const world = worldWith({ week: 2 });
    const foreign = { ...inTalksCandidate(SUITORS), nationality: "Mongolia" };
    // Both stables already hold a foreign rikishi → no eligible suitor.
    const strong = world.heyas.get("strong")!;
    const weak = world.heyas.get("weak")!;
    strong.rikishiIds = ["fs"];
    weak.rikishiIds = ["fw"];
    world.rikishi.set("fs", MockFactory.createRikishi("fs", { heyaId: "strong", nationality: "Mongolia" }) as never);
    world.rikishi.set("fw", MockFactory.createRikishi("fw", { heyaId: "weak", nationality: "Mongolia" }) as never);
    const result = resolveCandidateSuitor(world, foreign);
    expect(result.signed).toBe(false);
    expect(result.candidate.availabilityState).toBe("available");
    expect(result.candidate.competingSuitors).toHaveLength(0);
  });
});
