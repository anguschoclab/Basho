import { describe, it, expect, beforeEach } from "vitest";
import { runRetirements } from "@/engine/systems/governance/governanceReview";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";
import { rngForWorld } from "@/engine/rng";
import type { WorldState } from "@/engine/types/world";
import { FOUNDING_SEED_FUNDS, HEYA_COUNT_CAP, FOUNDING_CHANCE } from "@/constants/engine/economic";

function makeWorldWithMyoseki(overrides: Partial<WorldState> = {}): WorldState {
  const world = makeMockWorld(overrides);
  world.myosekiMarket = {
    stocks: {
      "ms-1": {
        id: "ms-1",
        name: "TestStock",
        prestigeTier: "modest",
        ownerId: "JSA",
        holderId: "JSA",
        status: "available",
      },
    },
    history: [],
  };
  return world;
}

describe("runRetirements — stable founding", () => {
  let world: WorldState;

  beforeEach(() => {
    world = makeWorldWithMyoseki();
  });

  it("found a new stable when an accomplished retiree acquires myoseki and RNG permits", () => {
    // Use a seed that we know triggers founding (FOUNDING_CHANCE = 0.35)
    // We'll try a few seeds to find one that triggers; but the logic should
    // be deterministic: if rng.bool(FOUNDING_CHANCE) returns true, found.
    const heya = makeMockHeya("heya-1", { rikishiIds: ["r-ret"] });
    world.heyas.set("heya-1", heya);

    const retiree = mockRikishi("r-ret", {
      heyaId: "heya-1",
      rank: "ozeki",
      birthYear: 1990,
      careerWins: 300,
      shikona: "TestOzeki",
    });
    world.rikishi.set("r-ret", retiree);

    // Try seeds until we find one that triggers founding
    // The RNG label is `retirement_${id}` so `retirement_r-ret`
    // We need a seed where rngForWorld(world, "governance", "retirement_r-ret").bool(0.35) === true
    let foundSeed: string | null = null;
    for (let i = 0; i < 100; i++) {
      const testSeed = `founding-test-${i}`;
      const testWorld = { ...world, seed: testSeed };
      const rng = rngForWorld(testWorld, "governance", "retirement_r-ret");
      if (rng.bool(FOUNDING_CHANCE)) {
        foundSeed = testSeed;
        break;
      }
    }
    expect(foundSeed).not.toBeNull();

    world.seed = foundSeed!;
    const initialHeyaCount = world.heyas.size;

    const impact = runRetirements(world);
    const newWorld = resolveImpacts(world, [impact]);

    expect(newWorld.heyas.size).toBe(initialHeyaCount + 1);
    const newHeya = Array.from(newWorld.heyas.values()).find(
      (h) => h.id !== "heya-1" && h.funds === FOUNDING_SEED_FUNDS
    );
    expect(newHeya).toBeDefined();
    expect(newHeya!.statureBand).toBe("new");
    expect(newHeya!.rikishiIds).toEqual([]);
  });

  it("does NOT found a stable when heya count is at cap", () => {
    // Fill world to cap
    for (let i = 0; i < HEYA_COUNT_CAP; i++) {
      world.heyas.set(`heya-${i}`, makeMockHeya(`heya-${i}`));
    }

    const heya = makeMockHeya("heya-cap", { rikishiIds: ["r-ret2"] });
    world.heyas.set("heya-cap", heya);

    const retiree = mockRikishi("r-ret2", {
      heyaId: "heya-cap",
      rank: "yokozuna",
      birthYear: 1988,
      careerWins: 500,
      shikona: "TestYokozuna",
    });
    world.rikishi.set("r-ret2", retiree);

    // Find a seed that would trigger founding
    let foundSeed: string | null = null;
    for (let i = 0; i < 100; i++) {
      const testSeed = `founding-cap-${i}`;
      const testWorld = { ...world, seed: testSeed };
      const rng = rngForWorld(testWorld, "governance", "retirement_r-ret2");
      if (rng.bool(FOUNDING_CHANCE)) {
        foundSeed = testSeed;
        break;
      }
    }
    expect(foundSeed).not.toBeNull();

    world.seed = foundSeed!;
    const initialHeyaCount = world.heyas.size;
    expect(initialHeyaCount).toBe(HEYA_COUNT_CAP + 1);

    const impact = runRetirements(world);
    const newWorld = resolveImpacts(world, [impact]);

    // No new heya founded because we're at cap
    expect(newWorld.heyas.size).toBe(initialHeyaCount);
  });

  it("does NOT found a stable when RNG says no", () => {
    const heya = makeMockHeya("heya-1", { rikishiIds: ["r-ret3"] });
    world.heyas.set("heya-1", heya);

    const retiree = mockRikishi("r-ret3", {
      heyaId: "heya-1",
      rank: "sekiwake",
      birthYear: 1990,
      careerWins: 250,
      shikona: "TestSekiwake",
    });
    world.rikishi.set("r-ret3", retiree);

    // Find a seed that does NOT trigger founding
    let noSeed: string | null = null;
    for (let i = 0; i < 100; i++) {
      const testSeed = `no-founding-${i}`;
      const testWorld = { ...world, seed: testSeed };
      const rng = rngForWorld(testWorld, "governance", "retirement_r-ret3");
      if (!rng.bool(FOUNDING_CHANCE)) {
        noSeed = testSeed;
        break;
      }
    }
    expect(noSeed).not.toBeNull();

    world.seed = noSeed!;
    const initialHeyaCount = world.heyas.size;

    const impact = runRetirements(world);
    const newWorld = resolveImpacts(world, [impact]);

    expect(newWorld.heyas.size).toBe(initialHeyaCount);
  });
});
