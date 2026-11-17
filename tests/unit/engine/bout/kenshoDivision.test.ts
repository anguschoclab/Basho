import { describe, it, expect } from "vitest";
import { applyStakesAndKensho } from "@/engine/bout/resolution/stakes";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { Rikishi } from "@/engine/types/rikishi";
import type { BashoState, BoutResult } from "@/engine/types/basho";
import type { BoutContext } from "@/engine/bout/boutPhysics";
import type { Sponsor } from "@/engine/types/sponsors";
import type { WorldState } from "@/engine/types/world";

/**
 * Modern JSA rule: kensho (sponsor envelopes) exists ONLY on makuuchi bouts —
 * including makuuchi kettei-sen. Juryo-and-below bouts never carry banners or
 * envelopes. The economic payout path already gates at economics.ts; this
 * covers the result-metadata path (kenshoBanners/kenshoEnvelopes) that the
 * replay UI and KenshoManagementWidget render.
 */

function sponsorFixture(id: string): Sponsor {
  return {
    sponsorId: id,
    displayName: "Test Sponsor",
    category: "local_business" as Sponsor["category"],
    tier: "T4",
    originRegionId: "kanto",
    industryTag: "food",
    toneTag: "classic" as Sponsor["toneTag"],
    prestigeAffinity: 60,
    loyalty: 60,
    scandalTolerance: 50,
    riskAppetite: 50,
    visibilityPreference: 1,
    active: true,
    satisfaction: 70,
    createdAtTick: 0,
    lastSeenTick: 0,
    relationships: [],
  };
}

function worldWithSponsor(rikishi: Map<string, Rikishi>, basho: BashoState): WorldState {
  return MockFactory.createWorld({
    rikishi,
    currentBasho: basho,
    sponsorPool: {
      sponsors: new Map([["sp1", sponsorFixture("sp1")]]),
      koenkais: new Map(),
    },
    rivalriesState: { pairs: {}, version: "1.0.0" },
  });
}

function runStakes(
  east: Rikishi,
  west: Rikishi,
  world: WorldState,
  basho: BashoState,
  day = 15
): BoutResult {
  const result = {
    boutId: `test-${east.id}-${west.id}`,
    winner: "east",
    winnerRikishiId: east.id,
    loserRikishiId: west.id,
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    stance: "hirazu",
    tachiaiWinner: "east",
    duration: 8,
    upset: false,
    kenshoEnvelopes: 0,
    log: [],
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
  } as BoutResult;
  const bout = { day } as BoutContext;
  applyStakesAndKensho(
    world,
    east,
    west,
    east,
    result,
    bout,
    basho,
    createImpactBuilder("test")
  );
  return result;
}

describe("kensho division eligibility — makuuchi only (modern JSA)", () => {
  const lowerDivisions = [
    "juryo",
    "makushita",
    "sandanme",
    "jonidan",
    "jonokuchi",
  ] as const;

  for (const division of lowerDivisions) {
    it(`writes no banners/envelopes on a ${division} bout`, () => {
      const east = MockFactory.createRikishi("e", { division, rank: division });
      const west = MockFactory.createRikishi("w", { division, rank: division });
      const basho = MockFactory.createBasho();
      const world = worldWithSponsor(
        new Map([
          ["e", east],
          ["w", west],
        ]),
        basho
      );

      const result = runStakes(east, west, world, basho);

      expect(result.kenshoBanners ?? []).toHaveLength(0);
      expect(result.kenshoEnvelopes ?? 0).toBe(0);
    });
  }

  it("still assigns banners/envelopes on a makuuchi bout", () => {
    const east = MockFactory.createRikishi("e", {
      division: "makuuchi",
      rank: "maegashira",
    });
    const west = MockFactory.createRikishi("w", {
      division: "makuuchi",
      rank: "maegashira",
    });
    const basho = MockFactory.createBasho();
    const world = worldWithSponsor(
      new Map([
        ["e", east],
        ["w", west],
      ]),
      basho
    );

    const result = runStakes(east, west, world, basho);

    expect((result.kenshoBanners ?? []).length).toBeGreaterThan(0);
    expect(result.kenshoEnvelopes ?? 0).toBeGreaterThan(0);
  });

  it("a juryo kettei-sen (tied leaders on senshuraku) still gets no kensho", () => {
    const east = MockFactory.createRikishi("e", { division: "juryo", rank: "juryo" });
    const west = MockFactory.createRikishi("w", { division: "juryo", rank: "juryo" });
    const basho = MockFactory.createBasho({
      day: 15,
      standings: new Map([
        ["e", { wins: 11, losses: 4 }],
        ["w", { wins: 11, losses: 4 }],
      ]) as never,
    });
    const world = worldWithSponsor(
      new Map([
        ["e", east],
        ["w", west],
      ]),
      basho
    );

    const result = runStakes(east, west, world, basho, 15);

    expect(result.kenshoBanners ?? []).toHaveLength(0);
    expect(result.kenshoEnvelopes ?? 0).toBe(0);
  });
});
