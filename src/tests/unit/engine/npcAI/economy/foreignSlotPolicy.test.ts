/**
 * WS6 — Foreign slot policy (canon §5.1–5.4, §9.3).
 *
 * The slot is consumed only by rikishi WITHOUT Japanese citizenship.
 * Dual citizens (foreign-born, Japanese passport) never consume it.
 * NPC managers weight the slot: aggression from traits+quirk, and
 * sunk-cost reluctance to release a foreign rikishi.
 */
import { describe, it, expect } from "vitest";
import {
  candidateConsumesForeignSlot,
  foreignSlotOccupied,
  foreignSlotBidAggression,
  foreignRetentionMultiplier,
} from "@/engine/npcAI/ForeignSlotPolicy";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { makeMockWorld, makeMockHeya } from "../../utils";
import type { TalentCandidate } from "@/engine/types/talent";
import type { Oyakata } from "@/engine/types/oyakata";

function makeCandidate(overrides: Partial<TalentCandidate>): TalentCandidate {
  return MockFactory.createCandidate("c1", overrides);
}

function makeOyakata(overrides: Partial<Oyakata>): Oyakata {
  return MockFactory.createOyakata("o1", overrides);
}

describe("candidateConsumesForeignSlot", () => {
  it("Japanese candidate does not consume the slot", () => {
    expect(
      candidateConsumesForeignSlot(makeCandidate({ nationality: "Japan" }))
    ).toBe(false);
  });

  it("foreign-nationality candidate consumes the slot", () => {
    expect(
      candidateConsumesForeignSlot(
        makeCandidate({ nationality: "Mongolia", originRegion: "Mongolia" })
      )
    ).toBe(true);
  });

  it("dual citizen (foreign-born, Japanese citizenship) does NOT consume the slot (§5.3)", () => {
    expect(
      candidateConsumesForeignSlot(
        makeCandidate({
          nationality: "Mongolia",
          originRegion: "Mongolia",
          dualCitizen: true,
        })
      )
    ).toBe(false);
  });
});

describe("foreignSlotOccupied", () => {
  it("a naturalized incumbent frees the slot (§5.5)", () => {
    const world = makeMockWorld({ year: 2030 });
    world.heyas.set("h1", makeMockHeya("h1", { rikishiIds: ["r1"] }));
    world.rikishi.set(
      "r1",
      MockFactory.createRikishi({
        id: "r1",
        heyaId: "h1",
        nationality: "Mongolia",
        citizenshipStatus: "naturalized",
      } as never)
    );
    expect(foreignSlotOccupied(world, "h1")).toBe(false);
  });

  it("a foreign incumbent occupies the slot", () => {
    const world = makeMockWorld({ year: 2030 });
    world.heyas.set("h1", makeMockHeya("h1", { rikishiIds: ["r1"] }));
    world.rikishi.set(
      "r1",
      MockFactory.createRikishi({
        id: "r1",
        heyaId: "h1",
        nationality: "Mongolia",
        citizenshipStatus: "foreign",
        joinedHeyaDate: "2029",
      } as never)
    );
    expect(foreignSlotOccupied(world, "h1")).toBe(true);
  });
});

describe("foreignSlotBidAggression", () => {
  it("daring, ambitious managers bid harder for foreign talent", () => {
    const bold = foreignSlotBidAggression(
      makeOyakata({
        traits: { ambition: 90, patience: 50, risk: 90, tradition: 20, compassion: 50 },
        quirks: [],
      } as Partial<Oyakata>)
    );
    const meek = foreignSlotBidAggression(
      makeOyakata({
        traits: { ambition: 20, patience: 50, risk: 10, tradition: 90, compassion: 50 },
        quirks: [],
      } as Partial<Oyakata>)
    );
    expect(bold).toBeGreaterThan(meek);
    expect(bold).toBeGreaterThan(1);
    expect(meek).toBeLessThanOrEqual(1);
  });

  it("the 'Foreign Talent Believer' quirk boosts aggression", () => {
    const base = {
      ambition: 50,
      patience: 50,
      risk: 50,
      tradition: 50,
      compassion: 50,
    };
    const believer = foreignSlotBidAggression(
      makeOyakata({ traits: { ...base }, quirks: ["Foreign Talent Believer"] } as Partial<Oyakata>)
    );
    const plain = foreignSlotBidAggression(
      makeOyakata({ traits: { ...base }, quirks: [] } as Partial<Oyakata>)
    );
    expect(believer).toBeGreaterThan(plain);
  });
});

describe("foreignRetentionMultiplier — §9.3 sunk-cost reluctance", () => {
  const oya = makeOyakata({
    traits: { ambition: 90, patience: 50, risk: 50, tradition: 50, compassion: 50 },
  } as Partial<Oyakata>);

  it("foreign-slot rikishi are retained measurably longer than natives", () => {
    const foreign = MockFactory.createRikishi({
      id: "rf",
      heyaId: "h1",
      nationality: "Georgia",
      citizenshipStatus: "foreign",
      joinedHeyaDate: "2028",
    } as never);
    const native = MockFactory.createRikishi({
      id: "rn",
      heyaId: "h1",
      nationality: "Japan",
    } as never);
    expect(foreignRetentionMultiplier(foreign, oya, 2030)).toBeGreaterThan(1);
    expect(foreignRetentionMultiplier(native, oya, 2030)).toBe(1);
  });
});
