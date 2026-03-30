import { describe, it, expect } from "vitest";
import { generateInitialWorld } from "../systems/generation/WorldFactory";
import { WorldState } from "../types/world";

describe("Engine Restoration Verification", () => {
  const seed = "test-seed-123";
  let world1: WorldState;
  let world2: WorldState;

  it("should generate a world with ~700 rikishi", () => {
    world1 = generateInitialWorld(seed);
    expect(world1.rikishi.size).toBeGreaterThan(600);
    expect(world1.rikishi.size).toBeLessThan(800);
  });

  it("should initialize the talent pool", () => {
    expect(world1.talentPool).toBeDefined();
    expect(Object.keys(world1.talentPool!.candidates).length).toBeGreaterThan(0);
    
    // Check if pools have hidden candidates
    expect(world1.talentPool!.pools.high_school.candidatesHidden.length).toBeGreaterThan(0);
  });

  it("should be deterministic (same seed, same world)", () => {
    world2 = generateInitialWorld(seed);
    
    // Compare number of rikishi
    expect(world1.rikishi.size).toBe(world2.rikishi.size);
    
    // Compare first rikishi name
    const r1 = Array.from(world1.rikishi.values())[0];
    const r2 = Array.from(world2.rikishi.values())[0];
    expect(r1.name).toBe(r2.name);
    expect(r1.stats.strength).toBe(r2.stats.strength);
  });

  it("should assign rikishi to stables", () => {
    const heya = world1.heyas.get("heya_1");
    expect(heya).toBeDefined();
    if (heya && heya.rikishiIds) {
      expect(heya.rikishiIds.length).toBeGreaterThan(0);
      
      // Verify each rikishi in heya_1 actually exists and points back
      heya.rikishiIds.forEach(id => {
        const r = world1.rikishi.get(id);
        expect(r).toBeDefined();
        if (r) {
          expect(r.heyaId).toBe("heya_1");
        }
      });
    }
  });
});
