/**
 * tsukedashi.test.ts — qualified amateur entry path (付け出し).
 *
 * Real JSA: an elite amateur credential holder (national university /
 * corporate champion, or a national-title high-schooler) may debut on the
 * banzuke instead of running maezumo — makushita tsukedashi starts at Ms60,
 * sandanme tsukedashi at Sd80. The amateur-experience exception raises the
 * debut age gate from under-23 to under-25 for those candidates ONLY.
 */
import { describe, it, expect } from "vitest";
import { offerCandidate } from "@/engine/generation/TalentPoolOffers";
import { materializeCandidateToRikishiInternal } from "@/engine/generation/TalentPoolMaterialization";
import { makeMockWorld } from "@tests/unit/engine/utils";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { TalentCandidate } from "@/engine/types/talent";

const tdCandidate = (overrides: Partial<TalentCandidate> = {}): TalentCandidate =>
  MockFactory.createCandidate("c-td", {
    personId: "p-td",
    birthYear: 2008, // 24 in 2032
    nationality: "Japan",
    tags: ["amateur_star"],
    isAmateurStar: true,
    availabilityState: "available",
    competingSuitors: [],
    ...overrides,
  });

describe("tsukedashi — age-gate exception", () => {
  it("a tsukedashi-qualified candidate may debut under 25 (24 is legal)", () => {
    const world = makeMockWorld({ year: 2032 });
    const c = tdCandidate({ tsukedashi: "makushita" });
    world.talentPool = { candidates: { "c-td": c }, pools: {} } as never;
    const res = offerCandidate(world, "c-td", "heya-1", "standard", "high");
    expect(res.ok).toBe(true);
  });

  it("a non-qualified 24-year-old is still rejected by the under-23 gate", () => {
    const world = makeMockWorld({ year: 2032 });
    const c = tdCandidate({ tsukedashi: undefined });
    world.talentPool = { candidates: { "c-td": c }, pools: {} } as never;
    const res = offerCandidate(world, "c-td", "heya-1", "standard", "high");
    expect(res.ok).toBe(false);
  });

  it("a tsukedashi candidate at 25+ is still rejected — the exception is bounded", () => {
    const world = makeMockWorld({ year: 2034 }); // age 26
    const c = tdCandidate({ tsukedashi: "makushita" });
    world.talentPool = { candidates: { "c-td": c }, pools: {} } as never;
    const res = offerCandidate(world, "c-td", "heya-1", "standard", "high");
    expect(res.ok).toBe(false);
  });
});

describe("tsukedashi — banzuke debut placement", () => {
  const pools = {} as never;

  it("makushita tsukedashi debuts at makushita rank 60, skipping maezumo", () => {
    const world = makeMockWorld({ year: 2032 });
    const c = tdCandidate({ tsukedashi: "makushita" });
    const res = materializeCandidateToRikishiInternal(
      world,
      "c-td",
      "heya-1",
      { "c-td": c },
      pools
    );
    const minted = res.impact.collections?.rikishiToAdd?.[0];
    expect(minted).toBeDefined();
    expect(minted?.division).toBe("makushita");
    expect(minted?.rank).toBe("makushita");
    expect(minted?.rankNumber).toBe(60);
    expect(minted?.maezumoCompleted).toBe(true);
  });

  it("sandanme tsukedashi debuts at sandanme rank 80", () => {
    const world = makeMockWorld({ year: 2032 });
    const c = tdCandidate({ tsukedashi: "sandanme" });
    const res = materializeCandidateToRikishiInternal(
      world,
      "c-td",
      "heya-1",
      { "c-td": c },
      pools
    );
    const minted = res.impact.collections?.rikishiToAdd?.[0];
    expect(minted?.division).toBe("sandanme");
    expect(minted?.rank).toBe("sandanme");
    expect(minted?.rankNumber).toBe(80);
  });

  it("a standard recruit still debuts at jonokuchi via maezumo", () => {
    const world = makeMockWorld({ year: 2032 });
    const c = tdCandidate({ tsukedashi: undefined, birthYear: 2014 });
    const res = materializeCandidateToRikishiInternal(
      world,
      "c-td",
      "heya-1",
      { "c-td": c },
      pools
    );
    const minted = res.impact.collections?.rikishiToAdd?.[0];
    expect(minted?.division).toBe("jonokuchi");
    expect(minted?.rank).toBe("jonokuchi");
  });
});
