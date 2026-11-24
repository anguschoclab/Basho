import { describe, it, expect, beforeEach } from "vitest";
import { processAllRetirements } from "@/engine/lifecycle/processRetirements";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, makeMockHeya, mockRikishi } from "@tests/unit/engine/utils";
import { rngForWorld } from "@/engine/core/rng";
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
      birthYear: 1980,
      careerWins: 300,
      shikona: "TestOzeki",
      nationality: "Japan",
      // Personally solvent — funds the founding out of the retirement fund,
      // so only the RNG gate decides (JSA branching model).
      economics: { retirementFund: 200_000_000 } as any,
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

    const { impact } = processAllRetirements(world);
    const newWorld = resolveImpacts(world, [impact]);

    expect(newWorld.heyas.size).toBe(initialHeyaCount + 1);
    const newHeya = Array.from(newWorld.heyas.values()).find(
      (h) => h.id !== "heya-1" && h.funds === FOUNDING_SEED_FUNDS
    );
    expect(newHeya).toBeDefined();
    expect(newHeya!.statureBand).toBe("new");
    // No living parent followers to release → the JSA seeds a maezumo
    // class so the new stable never opens empty.
    const seededIds = newHeya!.rikishiIds ?? [];
    expect(seededIds.length).toBeGreaterThan(0);
    expect(seededIds.length).toBeLessThanOrEqual(3);
    for (const id of seededIds) {
      const deshi = newWorld.rikishi.get(id);
      expect(deshi?.heyaId).toBe(newHeya!.id);
      expect(deshi?.isMaezumo).toBe(true);
      expect(deshi?.division).toBe("jonokuchi");
    }
  });

  it("lower-division deshi follow the founder to the branched stable", () => {
    // Parent roster: founder + three unsalaried deshi + a sekitori who stays.
    const heya = makeMockHeya("heya-1", {
      rikishiIds: ["r-ret", "r-jk", "r-sd", "r-ms", "r-juryo"],
    });
    world.heyas.set("heya-1", heya);

    const retiree = mockRikishi("r-ret", {
      heyaId: "heya-1",
      rank: "ozeki",
      division: "makuuchi",
      birthYear: 1980,
      careerWins: 300,
      shikona: "TestOzeki",
      nationality: "Japan",
      economics: { retirementFund: 200_000_000 } as any,
    });
    world.rikishi.set("r-ret", retiree);
    world.rikishi.set("r-jk", mockRikishi("r-jk", { heyaId: "heya-1", division: "jonokuchi" }));
    world.rikishi.set("r-sd", mockRikishi("r-sd", { heyaId: "heya-1", division: "sandanme" }));
    world.rikishi.set("r-ms", mockRikishi("r-ms", { heyaId: "heya-1", division: "makushita" }));
    world.rikishi.set("r-juryo", mockRikishi("r-juryo", { heyaId: "heya-1", division: "juryo" }));

    let foundSeed: string | null = null;
    for (let i = 0; i < 100; i++) {
      const testSeed = `founding-followers-${i}`;
      const testWorld = { ...world, seed: testSeed };
      const rng = rngForWorld(testWorld, "governance", "retirement_r-ret");
      if (rng.bool(FOUNDING_CHANCE)) {
        foundSeed = testSeed;
        break;
      }
    }
    expect(foundSeed).not.toBeNull();
    world.seed = foundSeed!;

    const { impact } = processAllRetirements(world);
    const newWorld = resolveImpacts(world, [impact]);

    const newHeya = Array.from(newWorld.heyas.values()).find(
      (h) => h.id !== "heya-1" && h.statureBand === "new"
    );
    expect(newHeya).toBeDefined();
    // Deshi follow — capped at FOUNDING_FOLLOWER_MAX, sekitori never follow.
    const followerIds = newHeya!.rikishiIds ?? [];
    expect(followerIds.length).toBeGreaterThan(0);
    expect(followerIds.length).toBeLessThanOrEqual(3);
    expect(followerIds).not.toContain("r-juryo");
    expect(followerIds).not.toContain("r-ret");
    for (const id of followerIds) {
      expect(newWorld.rikishi.get(id)?.heyaId).toBe(newHeya!.id);
    }
    // Parent keeps only the sekitori (retiree was already removed).
    const parentIds = newWorld.heyas.get("heya-1")!.rikishiIds ?? [];
    expect(parentIds).toContain("r-juryo");
    for (const id of followerIds) {
      expect(parentIds).not.toContain(id);
    }
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
      birthYear: 1979,
      careerWins: 500,
      shikona: "TestYokozuna",
      economics: { retirementFund: 200_000_000 } as any,
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

    const { impact } = processAllRetirements(world);
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
      birthYear: 1980,
      careerWins: 250,
      shikona: "TestSekiwake",
      economics: { retirementFund: 200_000_000 } as any,
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

    const { impact } = processAllRetirements(world);
    const newWorld = resolveImpacts(world, [impact]);

    expect(newWorld.heyas.size).toBe(initialHeyaCount);
  });
});
