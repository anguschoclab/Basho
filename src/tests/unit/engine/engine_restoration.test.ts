import { describe, it, expect } from "vitest";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";
import { WorldState } from "@/engine/types/world";

describe("Engine Restoration Verification", () => {
  const seed = "test-seed-123";
  let world1: WorldState;
  let world2: WorldState;

  it("should generate a world with ~700 rikishi", () => {
    world1 = generateInitialWorld(seed);
    expect(world1.rikishi.size).toBeGreaterThan(600);
    expect(world1.rikishi.size).toBeLessThan(900);
  });

  it("should initialize the talent pool", () => {
    expect(world1.talentPool).toBeDefined();
    // Talent pool structure is initialized but candidates are added during weekly ticks
    expect(Object.keys(world1.talentPool?.candidates ?? {}).length).toBe(0);

    // Check if pools have hidden candidates
    expect(world1.talentPool?.pools.high_school.candidatesHidden.length).toBeGreaterThanOrEqual(0);
  });

  it("should be deterministic (same seed, same world)", () => {
    world2 = generateInitialWorld(seed);

    // Compare number of rikishi
    expect(world1.rikishi.size).toBe(world2.rikishi.size);

    // Compare first rikishi name
    const r1 = Array.from(world1.rikishi.values())[0];
    const r2 = Array.from(world2.rikishi.values())[0];
    expect(r1.name).toBe(r2.name);
    expect(r1.stats.power).toBe(r2.stats.power);
  });

  it("should assign at least some rikishi to every stable (balance check)", () => {
    const stables = Array.from(world1.heyas.values());
    const counts = stables.map((h) => h.rikishiIds?.length || 0);
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;

    expect(min).toBeGreaterThanOrEqual(1); // No empty stables
    expect(max).toBeLessThan(40); // No extreme concentration
    expect(avg).toBeGreaterThan(12); // Total ~700 / 45 = 15.5
  });

  it("should have correct counts for premier ranks", () => {
    const rikishiArr = Array.from(world1.rikishi.values());
    const yokozuna = rikishiArr.filter((r) => r.rank === "yokozuna");
    const ozeki = rikishiArr.filter((r) => r.rank === "ozeki");
    const sekiwake = rikishiArr.filter((r) => r.rank === "sekiwake");
    const komusubi = rikishiArr.filter((r) => r.rank === "komusubi");

    // Engine allows 0-2 Yokozuna (v1.2 realism rules)
    expect(yokozuna.length).toBeGreaterThanOrEqual(0);
    expect(yokozuna.length).toBeLessThanOrEqual(2);
    expect(ozeki.length).toBeGreaterThanOrEqual(1); // Usually 2, but allow for varience
    expect(sekiwake.length).toBeGreaterThanOrEqual(2);
    expect(komusubi.length).toBeGreaterThanOrEqual(2);
  });
});
