import { describe, it, expect } from "vitest";
import { generateWorld } from "../worldgen";

describe("World Generation", () => {
  it("should generate a world with default values", () => {
    const world = generateWorld("test-seed-1");
    expect(world).toBeDefined();
    expect(world.seed).toBe("test-seed-1" as any);
    expect(world.year).toBe(2025);
    expect(world.heyas.size).toBeGreaterThan(0);
    expect(world.rikishi.size).toBeGreaterThan(0);
  });

  it("should generate identical worlds given the same seed", () => {
    const world1 = generateWorld("test-seed-2");
    const world2 = generateWorld("test-seed-2");

    // Only compare things that matter for determinism
    expect(world1.heyas.size).toBe(world2.heyas.size);
    expect(world1.rikishi.size).toBe(world2.rikishi.size);

    // Verify a random rikishi matches exactly
    const rikishiId1 = Array.from(world1.rikishi.keys())[0];
    const r1 = world1.rikishi.get(rikishiId1)!;
    const r2 = world2.rikishi.get(rikishiId1)!;

    expect(r1.shikona).toBe(r2.shikona);
    expect(r1.talentSeed).toBe(r2.talentSeed);
    expect(r1.power).toBe(r2.power);
  });

  it("should generate different worlds given different seeds", () => {
    const world1 = generateWorld("test-seed-a");
    const world2 = generateWorld("test-seed-b");

    const ids1 = Array.from(world1.rikishi.keys());
    const ids2 = Array.from(world2.rikishi.keys());

    if (ids1.length > 0 && ids2.length > 0) {
      // Likely different first generated ID, or at least different attributes
      if (ids1[0] === ids2[0]) {
          expect(world1.rikishi.get(ids1[0])!.shikona).not.toBe(world2.rikishi.get(ids2[0])!.shikona);
      } else {
          expect(ids1[0]).not.toBe(ids2[0]);
      }
    }
  });
});

describe("World Generation (Overrides)", () => {
  it("applies playerConfig overrides correctly", () => {
    // Generate a world and capture the first Heya ID
    const initialWorld = generateWorld("test-player-config-seed");
    const firstHeyaId = Array.from(initialWorld.heyas.keys())[0];

    // Now generate with config targeting that heya
    const configWorld = generateWorld({
      seed: "test-player-config-seed",
      playerConfig: {
        heyaId: firstHeyaId,
        name: "TestToshiyori",
        background: "yokozuna",
        ichimon: "dewanoumi"
      }
    });

    const playerHeya = configWorld.heyas.get(firstHeyaId);
    expect(playerHeya).toBeDefined();
    expect(playerHeya?.isPlayerOwned).toBe(true);

    const pOyakata = configWorld.oyakata.get(playerHeya!.oyakataId);
    expect(pOyakata).toBeDefined();
    expect(pOyakata?.name).toBe("TestToshiyori Oyakata");
    expect(pOyakata?.highestRank).toBe("Yokozuna");
    expect(pOyakata?.stats?.scouting).toBe(70);
    expect(pOyakata?.stats?.training).toBe(80);

    // Funds should be at least the bonus
    expect(playerHeya!.funds).toBeGreaterThanOrEqual(5_000_000);
  });
});
